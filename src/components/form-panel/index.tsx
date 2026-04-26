import { Graph, Cell } from '@antv/x6'
import React, { useState, useEffect } from 'react'
import FormPanel from './FormPanel'
import { getControlMap } from './controls'
import type { FormConfig, FormSchema } from '../graph/strategies/types'
import './FormPanel.css'

interface Props {
  graph: Graph
  formConfig?: FormConfig  // 从 strategy 传入
}

type TargetType = 'canvas' | 'edge' | 'node'

export const FormPanelContainer: React.FC<Props> = ({ graph, formConfig }) => {
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null)
  const [targetType, setTargetType] = useState<TargetType>('canvas')
  const [cellData, setCellData] = useState<Record<string, any>>({})

  useEffect(() => {
    // 初始化时如果目标是画布，尝试加载其持久化数据
    if (targetType === 'canvas') {
      const initialCanvasData = (graph as any).canvasData || {}
      setCellData(initialCanvasData)
      console.log('[FormPanelContainer] Initial load, canvas data:', initialCanvasData)
    }
  }, [graph, targetType])

  useEffect(() => {
    // 监听节点点击
    const onNodeClick = ({ node }: { node: Cell }) => {
      setSelectedCell(node)
      setTargetType('node')
      setCellData(node.getData() || {})
    }

    // 监听边点击
    const onEdgeClick = ({ edge }: { edge: Cell }) => {
      setSelectedCell(edge)
      setTargetType('edge')
      setCellData(edge.getData() || {})
    }

    // 监听点击空白区域
    const onBlankClick = () => {
      setSelectedCell(null)
      setTargetType('canvas')

      // 读取存在 graph 上的全局画布持久化数据
      const persistedCanvasData = (graph as any).canvasData || {}
      setCellData(persistedCanvasData)
      console.log('[FormPanelContainer] Blank clicked. Restored canvas data:', persistedCanvasData)
    }

    // 监听外部（如 DSL 导入）注入画布属性的事件
    const onCanvasDataChange = ({ data }: { data: Record<string, any> }) => {
      setSelectedCell(null)
      setTargetType('canvas')
      setCellData(data)
      console.log('[FormPanelContainer] canvas:change:data received:', data)
    }

    graph.on('node:click', onNodeClick)
    graph.on('edge:click', onEdgeClick)
    graph.on('blank:click', onBlankClick)
    graph.on('canvas:change:data', onCanvasDataChange)

    return () => {
      graph.off('node:click', onNodeClick)
      graph.off('edge:click', onEdgeClick)
      graph.off('blank:click', onBlankClick)
      graph.off('canvas:change:data', onCanvasDataChange)
    }
  }, [graph])

  // 根据 formConfig 和选中元素获取 Schema
  const getSchema = (): FormSchema | null => {
    if (!formConfig) return null

    if (targetType === 'canvas') {
      return formConfig.canvas || null
    }

    if (targetType === 'edge') {
      return formConfig.edge || null
    }

    if (targetType === 'node' && selectedCell) {
      const shape = selectedCell.shape  // 获取节点的 shape
      const nodeConfig = formConfig.nodes[shape]
      return nodeConfig?.schema || null
    }

    return null
  }

  const schema = getSchema()
  const controlMap = getControlMap()

  // 获取当前节点的自定义控件
  if (targetType === 'node' && selectedCell && formConfig) {
    const shape = selectedCell.shape
    const nodeConfig = formConfig.nodes[shape]
    if (nodeConfig?.controlMap) {
      Object.entries(nodeConfig.controlMap).forEach(([name, component]) => {
        controlMap.set(name, component)
      })
    }
  }

  // 获取边的自定义控件
  if (targetType === 'edge' && formConfig?.edge?.controlMap) {
    Object.entries(formConfig.edge.controlMap).forEach(([name, component]) => {
      controlMap.set(name, component)
    })
  }

  // 获取画布的自定义控件
  if (targetType === 'canvas' && formConfig?.canvas?.controlMap) {
    Object.entries(formConfig.canvas.controlMap).forEach(([name, component]) => {
      controlMap.set(name, component)
    })
  }

  // 更新数据
  const handleUpdate = (fieldName: string, value: any) => {
    if (selectedCell) {
      const data = selectedCell.getData() || {}
      const newData = { ...data, [fieldName]: value }

      // 使用 { overwrite: true } 选项强制触发 cell:change:data 事件
      selectedCell.setData(newData, { overwrite: true })

      // 直接更新 cellData，确保界面立即响应
      setCellData(newData)
    } else if (targetType === 'canvas') {
      // 没有任何元素被选中时，处理画布自身的数据更新
      const newData = { ...cellData, [fieldName]: value }
      setCellData(newData)

        // 1. 持久化保存到 graph 实例上，保证生命周期内返回画布后数据依旧存在
        ; (graph as any).canvasData = newData

      // 2. 抛出自定义事件，方便外层 FlowGraph 或其他顶层组件统一拦截并保存全图数据
      graph.trigger('canvas:change:data', { data: newData, fieldName, value })

      // 日志输出便于调试
      console.log(`[FormPanelContainer] Canvas data updated [${fieldName}]:`, value)
      console.log(`[FormPanelContainer] Full canvas persisted data:`, newData)
    }
  }

  // 无配置时不显示
  if (!formConfig) {
    return null
  }

  return (
    <FormPanel
      schema={schema}
      controlMap={controlMap}
      data={cellData}
      onUpdate={handleUpdate}
      targetType={targetType}
      graph={graph}
      selectedCell={selectedCell}
    />
  )
}

export default FormPanelContainer
