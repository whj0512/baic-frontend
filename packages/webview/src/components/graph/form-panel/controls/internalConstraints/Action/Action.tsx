import React, { useState } from 'react'
import { PlusCircleOutlined } from '@ant-design/icons'
import ActionItem from './components/ActionItem'
import './Action.css'

// 生成唯一 ID
const generateId = () => {
  return `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export interface ActionValue {
  id?: string
  express: string
  pre_think_time: number
  post_think_time: number
  type: string
  name?: string
  symbol?: string
  value?: string
}

export const createDefaultAction = (v: Partial<ActionValue> = {}): ActionValue => {
  return {
    id: generateId(),
    express: '',
    pre_think_time: 0,
    post_think_time: 0,
    type: 'action',
    ...v,
  }
}

interface ActionProps {
  value?: ActionValue[]
  onChange?: (value: ActionValue[]) => void
  controlSchema?: { groupId?: string }
}

const Action: React.FC<ActionProps> = ({ value = [], onChange, controlSchema }) => {
  const [newActionIndex, setNewActionIndex] = useState(-1)

  // 1. 标准化数据源，支持旧数据的平滑迁徙
  const formItemValue: ActionValue[] = (value || []).map((v: any) => {
    // 兼容旧格式，向新格式靠拢：如果包含旧的 name/symbol/value
    let finalExpress = v.express || ''
    if (!v.express && v.name !== undefined) {
      if (v.symbol === '()') {
        finalExpress = `${v.name}(${v.value})`
      } else {
        finalExpress = `${v.name || ''}${v.symbol || ''}${v.value || ''}`
      }
    }

    return {
      ...v,
      id: v.id || generateId(),
      express: finalExpress,
      pre_think_time: v.pre_think_time ?? 0,
      post_think_time: v.post_think_time ?? 0,
      type: v.type || 'action'
    }
  })

  const triggerChange = (newValues: ActionValue[]) => {
    onChange?.(newValues)
  }

  const handleAddAction = () => {
    const item = createDefaultAction()
    const newValue = [...formItemValue, item]
    setNewActionIndex(newValue.length - 1)
    triggerChange(newValue)
  }

  const handleRemove = (index: number) => {
    const newValue = formItemValue.filter((_, i) => i !== index)
    triggerChange(newValue)
    setNewActionIndex(-1)
  }

  const handleItemUpdate = (index: number, updatedItem: ActionValue) => {
    const newValue = [...formItemValue]
    newValue[index] = updatedItem
    triggerChange(newValue)
  }

  return (
    <div className="action-control">
      <div className="action-toolbar">
        <PlusCircleOutlined className="add-icon" onClick={handleAddAction} />
      </div>
      <div className="action-list">
        {formItemValue.map((item, index) => (
          <ActionItem
            key={item.id!}
            value={item}
            index={index}
            editableMode={index === newActionIndex}
            controlSchema={controlSchema}
            onUpdate={(updatedItem) => handleItemUpdate(index, updatedItem)}
            onRemove={() => handleRemove(index)}
            onFinishEdit={() => setNewActionIndex(-1)}
          />
        ))}
      </div>
    </div>
  )
}

export default Action
