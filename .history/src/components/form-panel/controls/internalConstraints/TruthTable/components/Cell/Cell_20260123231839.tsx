import React, { useState } from 'react'
import { Select, Tooltip, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import type { Graph } from '@antv/x6'
import ActionEditor, { ActionValue } from '../../../ActionEditor'
import TargetSelecter from '../../../TargetSelecter'
import './Cell.css'

interface CellProps {
  value: any
  readonly: boolean
  type: 'header' | 'body' | 'footer'
  contextMenu?: {
    items: MenuProps['items']
    onClick: (e: any) => void
  }
  onUpdate?: (value: any) => void
  graph?: Graph
  currentNodeId?: string
}

const bodyOptions = [
  { value: 'true', label: 'true' },
  { value: 'false', label: 'false' },
  { value: '-', label: '-' },
]

export const Cell: React.FC<CellProps> = ({
  value: _value,
  type,
  onUpdate,
  readonly,
  contextMenu,
  graph,
  currentNodeId,
}) => {
  // 处理 header 类型的值
  let value = _value
  if (type === 'header') {
    if (_value && typeof _value === 'string') {
      // 解析 "name symbol value" 格式
      const parts = _value.split(' ')
      value = {
        name: parts[0] || '',
        symbol: parts[1] || '',
        value: parts[2] || '',
        isStandard: true,
      }
    } else if (!_value) {
      value = { name: '', symbol: '', value: '', isStandard: true }
    }
  }

  const [editMode, setEditMode] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  const handleFinish = () => {
    setEditMode(false)
  }

  const handleSelect = (selectedValue: string) => {
    onUpdate?.(selectedValue)
    setLocalValue(selectedValue)
    setEditMode(false)
  }

  const handleActionUpdate = (actionValue: ActionValue) => {
    // 将 ActionValue 转换为字符串格式
    const v = `${actionValue.name || ''} ${actionValue.symbol || ''} ${actionValue.value || ''}`.trim()
    onUpdate?.(v)
    setLocalValue(actionValue)
  }

  const handleTargetChange = (target: { id: string; name: string }) => {
    onUpdate?.(target)
    setLocalValue(target)
    setEditMode(false)
  }

  const handleClick = () => {
    if (!readonly) {
      setEditMode(true)
    }
  }

  // 渲染编辑模式
  if (editMode) {
    switch (type) {
      case 'header':
        return (
          <div style={{ padding: '2px' }}>
            <ActionEditor
              value={localValue}
              onUpdate={handleActionUpdate}
              onFinish={handleFinish}
              controlSchema={{ groupId: 'normal_testcase' }}
            />
          </div>
        )
      case 'body':
        return (
          <Select
            autoFocus
            value={localValue || '-'}
            options={bodyOptions}
            placeholder="真值"
            style={{ width: '100%' }}
            onBlur={handleFinish}
            onSelect={handleSelect}
          />
        )
      case 'footer':
        return (
          <TargetSelecter
            value={localValue}
            onChange={handleTargetChange}
            graph={graph}
            currentNodeId={currentNodeId}
          />
        )
      default:
        return null
    }
  }

  // 渲染显示模式
  const text =
    type === 'footer'
      ? (localValue?.name || localValue?.id || localValue || '-')
      : type === 'header'
      ? (typeof localValue === 'string'
          ? localValue
          : `${localValue.name || ''} ${localValue.symbol || ''} ${localValue.value || ''}`.trim() || '-')
      : localValue || '-'

  const cellContent = (
    <span className="cell" onClick={handleClick}>
      <Tooltip title={text}>{text}</Tooltip>
    </span>
  )

  return contextMenu ? (
    <Dropdown menu={contextMenu} trigger={['contextMenu']}>
      {cellContent}
    </Dropdown>
  ) : (
    cellContent
  )
}

export default Cell
