import { useEffect } from 'react'
import type { Graph } from '@antv/x6'
import { Select } from 'antd'

interface DialogMapTriggerTypeProps {
  value?: string
  onChange?: (value: string) => void
  onFieldUpdate?: (fieldName: string, value: unknown) => void
  graph?: Graph
  currentNodeId?: string
}

const DialogMapTriggerType = ({
  value,
  onChange,
  onFieldUpdate,
  graph,
  currentNodeId,
}: DialogMapTriggerTypeProps) => {
  const edge = currentNodeId ? graph?.getCellById(currentNodeId) as any : undefined
  const source = edge?.isEdge?.() ? edge.getSourceCell() : undefined
  const forceAuto = source?.shape === 'start-node'
  const normalizedValue = forceAuto ? 'auto' : (value || 'click')

  useEffect(() => {
    if (!forceAuto || (value === 'auto' && !edge?.getData()?.trigger)) return
    onChange?.('auto')
    onFieldUpdate?.('trigger', '')
  }, [edge, forceAuto, onChange, onFieldUpdate, value])

  return (
    <Select
      size="small"
      value={normalizedValue}
      disabled={forceAuto}
      options={[
        { label: 'click', value: 'click' },
        { label: 'auto', value: 'auto' },
      ]}
      onChange={(nextValue) => {
        onChange?.(nextValue)
        if (nextValue === 'auto') onFieldUpdate?.('trigger', '')
      }}
    />
  )
}

export default DialogMapTriggerType
