import React from 'react'
import type { Graph } from '@antv/x6'

interface DialogMapEdgeTriggerProps {
  value?: string
  onChange?: (value: string) => void
  graph?: Graph
  currentNodeId?: string
  disabled?: boolean
}

interface DialogMapWidget {
  widget_id?: string
  name?: string
}

const getSourceWidgetOptions = (graph?: Graph, edgeId?: string) => {
  if (!graph || !edgeId) return []

  const edge = graph.getCellById(edgeId) as any
  if (!edge?.isEdge?.()) return []

  const sourceNode = edge.getSourceCell()
  if (!sourceNode?.isNode?.() || sourceNode.shape !== 'page-node') return []

  const widgets = sourceNode.getData()?.widgets
  if (!Array.isArray(widgets)) return []

  const seen = new Set<string>()
  return widgets
    .map((widget: DialogMapWidget) => ({
      widgetId: typeof widget.widget_id === 'string' ? widget.widget_id.trim() : '',
      name: typeof widget.name === 'string' ? widget.name.trim() : '',
    }))
    .filter((widget) => {
      if (!widget.widgetId || seen.has(widget.widgetId)) return false
      seen.add(widget.widgetId)
      return true
    })
}

const DialogMapEdgeTrigger: React.FC<DialogMapEdgeTriggerProps> = ({
  value = '',
  onChange,
  graph,
  currentNodeId,
  disabled,
}) => {
  const options = getSourceWidgetOptions(graph, currentNodeId)
  const hasCurrentValue = value && options.some(option => option.widgetId === value)

  return (
    <select
      className="form-control-select"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      disabled={disabled || options.length === 0}
    >
      <option value="">
        {options.length > 0 ? '选择触发组件' : '源页面暂无组件'}
      </option>
      {value && !hasCurrentValue && (
        <option value={value}>{value}（未匹配）</option>
      )}
      {options.map(option => (
        <option key={option.widgetId} value={option.widgetId}>
          {option.name ? `${option.widgetId} - ${option.name}` : option.widgetId}
        </option>
      ))}
    </select>
  )
}

export default DialogMapEdgeTrigger
