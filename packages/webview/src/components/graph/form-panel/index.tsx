import type { Cell, Graph } from '@antv/x6'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import FormPanel from './FormPanel'
import { getControlMap } from './controls'
import type { FormConfig, FormSchema } from '../strategies/types'
import './FormPanel.css'

interface Props {
  graph: Graph
  formConfig?: FormConfig
  selectedCell: Cell | null
}

type TargetType = 'canvas' | 'edge' | 'node'

export const FormPanelContainer: React.FC<Props> = memo(({ graph, formConfig, selectedCell }) => {
  const targetType: TargetType = selectedCell
    ? (selectedCell.isNode() ? 'node' : 'edge')
    : 'canvas'
  const [cellData, setCellData] = useState<Record<string, any>>(() => (
    selectedCell?.getData() || (graph as any).canvasData || {}
  ))

  useEffect(() => {
    setCellData(selectedCell?.getData() || (graph as any).canvasData || {})
  }, [graph, selectedCell])

  useEffect(() => {
    const onCanvasDataChange = ({ data }: { data: Record<string, any> }) => {
      if (!selectedCell) setCellData(data)
    }

    graph.on('canvas:change:data', onCanvasDataChange)

    return () => {
      graph.off('canvas:change:data', onCanvasDataChange)
    }
  }, [graph, selectedCell])

  const schema = useMemo((): FormSchema | null => {
    if (!formConfig) return null
    if (targetType === 'canvas') return formConfig.canvas || null
    if (targetType === 'edge') return formConfig.edge || null
    if (targetType === 'node' && selectedCell) {
      return formConfig.nodes[selectedCell.shape]?.schema || null
    }
    return null
  }, [formConfig, selectedCell, targetType])

  const controlMap = useMemo(() => {
    const nextControlMap = getControlMap()
    let customControls: Record<string, React.FC<any>> | undefined

    if (targetType === 'node' && selectedCell && formConfig) {
      customControls = formConfig.nodes[selectedCell.shape]?.controlMap
    } else if (targetType === 'edge') {
      customControls = formConfig?.edge?.controlMap
    } else if (targetType === 'canvas') {
      customControls = formConfig?.canvas?.controlMap
    }

    Object.entries(customControls || {}).forEach(([name, component]) => {
      nextControlMap.set(name, component)
    })
    return nextControlMap
  }, [formConfig, selectedCell, targetType])

  const handleUpdate = useCallback((fieldName: string, value: any) => {
    if (selectedCell) {
      const newData = { ...(selectedCell.getData() || {}), [fieldName]: value }
      selectedCell.setData(newData, { overwrite: true })
      setCellData(newData)
      return
    }

    if (targetType === 'canvas') {
      const newData = { ...cellData, [fieldName]: value }
      setCellData(newData)
      ;(graph as any).canvasData = newData
      graph.trigger('canvas:change:data', { data: newData, fieldName, value })
    }
  }, [cellData, graph, selectedCell, targetType])

  if (!formConfig) return null

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
})

export default FormPanelContainer
