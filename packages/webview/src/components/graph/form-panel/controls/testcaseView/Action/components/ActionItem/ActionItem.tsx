import { CloseOutlined, CopyOutlined, HolderOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import { type DragEvent, type FC, type MouseEvent, useState } from 'react'
import EditableSwitch from '../../../../common/EditableSwitch'
import ActionEditor from '../ActionEditor/ActionEditor'
import { formatAction, type ActionType, type ActionValue } from '../../utils'
import './ActionItem.css'

interface ActionItemProps {
  value: ActionValue
  index: number
  actionType: ActionType
  isEditing: boolean
  onUpdate: (value: ActionValue) => void
  onCopy: (value: ActionValue) => void
  onRemove: () => void
  onStartEdit: () => void
  onFinishEdit: () => void
  onDragStart: (index: number) => void
  onDrop: (index: number) => void
}

const ActionItem: FC<ActionItemProps> = ({
  value,
  index,
  actionType,
  isEditing,
  onUpdate,
  onCopy,
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

    if (!value.name.trim() && !value.value.trim() && !value.express?.trim()) {
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

  const handleCopy = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onCopy(value)
  }

  return (
    <div
      className={`testcase-action-item${isDragging ? ' testcase-action-item--dragging' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <span
        className="testcase-action-item__handle"
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
            controlSchema={{ name: actionType }}
          />
        )}
      </EditableSwitch>
      <Tooltip title="Copy action">
        <button
          type="button"
          className="testcase-action-item__copy"
          onClick={handleCopy}
        >
          <CopyOutlined />
        </button>
      </Tooltip>
      <CloseOutlined className="testcase-action-item__remove" onClick={onRemove} />
    </div>
  )
}

export default ActionItem
