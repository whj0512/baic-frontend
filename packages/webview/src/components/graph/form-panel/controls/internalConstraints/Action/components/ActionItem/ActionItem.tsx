import { CloseOutlined, HolderOutlined } from '@ant-design/icons'
import { type DragEvent, type FC, useState } from 'react'
import EditableSwitch from '../../../../common/EditableSwitch'
import ActionEditor from '../ActionEditor'
import { formatAction, type ActionValue } from '../../utils'
import './ActionItem.css'

interface ActionItemProps {
  value: ActionValue
  index: number
  isEditing: boolean
  controlSchema?: { groupId?: string }
  onUpdate: (value: ActionValue) => void
  onRemove: () => void
  onStartEdit: () => void
  onFinishEdit: () => void
  onDragStart: (index: number) => void
  onDrop: (index: number) => void
}

const ActionItem: FC<ActionItemProps> = ({
  value,
  index,
  isEditing,
  controlSchema,
  onUpdate,
  onRemove,
  onStartEdit,
  onFinishEdit,
  onDragStart,
  onDrop,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const readonlyValue = formatAction(value)

  const handleChangeEditMode = (editable: boolean) => {
    if (editable) {
      onStartEdit()
      return
    }

    if (!value.name.trim() && !value.value.trim()) {
      onRemove()
      return
    }

    onFinishEdit()
  }

  const handleDragStart = (event: DragEvent<HTMLSpanElement>) => {
    event.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
    onDragStart(index)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    onDrop(index)
  }

  return (
    <div
      className={`action-item${isDragging ? ' action-item--dragging' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <span
        className="action-item__handle"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => setIsDragging(false)}
      >
        <HolderOutlined />
      </span>
      <EditableSwitch
        editMode={isEditing}
        readonlyValue={readonlyValue || '(empty)'}
        onChange={handleChangeEditMode}
      >
        {(onFinish) => (
          <ActionEditor
            value={value}
            onUpdate={onUpdate}
            onFinish={onFinish}
            controlSchema={controlSchema}
          />
        )}
      </EditableSwitch>
      <CloseOutlined className="action-item__remove" onClick={onRemove} />
    </div>
  )
}

export default ActionItem
