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
    // 监听节点/边选中
    const onCellSelected = ({ cell }: { cell: Cell }) => {
      setSelectedCell(cell)
      setTargetType(cell.isEdge() ? 'edge' : 'node')
      setCellData(cell.getData() || {})
    }

    // 监听取消选中
    const onCellUnselected = () => {
      setSelectedCell(null)
      setTargetType('canvas')
      setCellData({})
    }

    // 监听点击空白区域
    const onBlankClick = () => {
      
      console.log('click blank')
      setSelectedCell(null)
      setTargetType('canvas')
      setCellData({})
    }

    // 监听节点数据变化
    const onCellDataChange = ({ cell }: { cell: Cell }) => {
      if (selectedCell && cell.id === selectedCell.id) {
        setCellData(cell.getData() || {})
      }
    }

    graph.on('cell:click', onCellSelected)
    graph.on('cell:unselected', onCellUnselected)
    graph.on('blank:click', onBlankClick)
    graph.on('cell:change:data', onCellDataChange)

    return () => {
      graph.off('cell:selected', onCellSelected)
      graph.off('cell:unselected', onCellUnselected)
      graph.off('blank:click', onBlankClick)
      graph.off('cell:change:data', onCellDataChange)
    }
  }, [graph, selectedCell])

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
      selectedCell.setData(newData)
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
