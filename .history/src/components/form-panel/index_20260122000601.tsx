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
      setCellData({})
    }

    graph.on('node:click', onNodeClick)
    graph.on('edge:click', onEdgeClick)
    graph.on('blank:click', onBlankClick)

    return () => {
      graph.off('node:click', onNodeClick)
      graph.off('edge:click', onEdgeClick)
      graph.off('blank:click', onBlankClick)
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

  // 更新数据
  const handleUpdate = (fieldName: string, value: any) => {
    if (selectedCell) {
      const data = selectedCell.getData() || {}
      const newData = { ...data, [fieldName]: value }

      console.log('handleUpdate - before setData:', selectedCell.getData())
      console.log('handleUpdate - setting newData:', newData)

      // 使用 { overwrite: true } 选项强制触发 cell:change:data 事件
      selectedCell.setData(newData, { overwrite: true })

      console.log('handleUpdate - after setData:', selectedCell.getData())


      // 直接更新 cellData，确保界面立即响应
      setCellData(newData)
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
    />
  )
}

export default FormPanelContainer
