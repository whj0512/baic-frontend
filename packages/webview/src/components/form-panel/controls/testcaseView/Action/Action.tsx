import { PlusCircleOutlined } from '@ant-design/icons'
import { type FC, useEffect, useMemo, useState } from 'react'
import ActionItem from './components/ActionItem/ActionItem'
import {
  createDefaultAction,
  normalizeActionList,
  normalizeActionType,
  type ActionValue,
} from './utils'
import './Action.css'

interface ActionProps {
  value?: ActionValue[]
  onChange?: (value: ActionValue[]) => void
  name?: string
}

const moveItem = (items: ActionValue[], from: number, to: number) => {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (!item) return items
  next.splice(to, 0, item)
  return next
}

const Action: FC<ActionProps> = ({ value, onChange, name }) => {
  const actionType = normalizeActionType(name)
  const normalizedValue = useMemo(() => normalizeActionList(value, actionType), [actionType, value])
  const [items, setItems] = useState<ActionValue[]>(normalizedValue)
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    setItems(normalizedValue)
    setEditingActionId((currentId) =>
      currentId && normalizedValue.some((item) => item.id === currentId) ? currentId : null
    )
  }, [normalizedValue])

  const commit = (nextItems: ActionValue[]) => {
    setItems(nextItems)
    onChange?.(nextItems)
  }

  const handleAdd = () => {
    const nextAction = createDefaultAction({}, actionType)
    const nextItems = [...items, nextAction]
    commit(nextItems)
    setEditingActionId(nextAction.id)
  }

  const handleUpdate = (index: number, nextValue: ActionValue) => {
    const nextItems = [...items]
    nextItems[index] = nextValue
    commit(nextItems)
  }

  const handleRemove = (index: number, itemId: string) => {
    commit(items.filter((_, itemIndex) => itemIndex !== index))
    setEditingActionId((currentId) => (currentId === itemId ? null : currentId))
  }

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null) return
    if (dragIndex !== targetIndex) {
      commit(moveItem(items, dragIndex, targetIndex))
    }
    setDragIndex(null)
  }

  return (
    <div className="testcase-action-control">
      <div className="testcase-action-toolbar">
        <PlusCircleOutlined className="testcase-action-add" onClick={handleAdd} />
      </div>
      <div className="testcase-action-list">
        {items.map((item, index) => (
          <ActionItem
            key={item.id}
            value={item}
            index={index}
            actionType={actionType}
            isEditing={item.id === editingActionId}
            onUpdate={(nextValue) => handleUpdate(index, nextValue)}
            onRemove={() => handleRemove(index, item.id)}
            onStartEdit={() => setEditingActionId(item.id)}
            onFinishEdit={() =>
              setEditingActionId((currentId) => (currentId === item.id ? null : currentId))
            }
            onDragStart={setDragIndex}
            onDragOver={() => undefined}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  )
}

export default Action
