import React, { useState } from 'react'
import { PlusCircleOutlined } from '@ant-design/icons'
import ActionItem from './components/ActionItem'
import './Action.css'

// 生成唯一 ID
const generateId = () => {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export interface ActionValue {
  id: string
  name: string
  symbol: string
  value: string
  isStandard: boolean
}

export const createDefaultAction = (v: Partial<ActionValue> = {}): ActionValue => {
  return {
    id: generateId(),
    name: '',
    symbol: '',
    value: '',
    isStandard: true,
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

  // 确保每个 action 都有 id
  const formItemValue = value.map((v) => {
    if (!v.id) {
      return { ...v, id: generateId() }
    }
    return v
  })

  const handleUpdate = () => {
    // 过滤掉没有 id 的项（已删除的项）
    const filteredValue = formItemValue.filter((v) => !!v.id)
    onChange?.(filteredValue)
  }

  const handleAddAction = () => {
    const item = createDefaultAction()
    const newValue = [...formItemValue, item]
    setNewActionIndex(newValue.length - 1)
    onChange?.(newValue)
  }

  const handleRemove = (index: number) => {
    const newValue = formItemValue.filter((_, i) => i !== index)
    onChange?.(newValue)
    setNewActionIndex(-1)
  }

  const handleItemUpdate = (index: number, updatedItem: ActionValue) => {
    const newValue = [...formItemValue]
    newValue[index] = updatedItem
    onChange?.(newValue)
  }

  return (
    <div className="action-control">
      <div className="action-toolbar">
        <PlusCircleOutlined className="add-icon" onClick={handleAddAction} />
      </div>
      <div className="action-list">
        {formItemValue.map((item, index) => (
          <ActionItem
            key={item.id}
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
