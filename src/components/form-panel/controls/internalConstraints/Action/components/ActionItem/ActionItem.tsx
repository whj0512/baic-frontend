import React, { useState } from 'react'
import { CloseOutlined, HolderOutlined } from '@ant-design/icons'
import ActionEditor from '../../../ActionEditor'
import EditableSwitch from '../../../../common/EditableSwitch'
import type { ActionValue } from '../../Action'
import './ActionItem.css'

interface ActionItemProps {
  value: ActionValue
  index: number
  editableMode: boolean
  controlSchema?: { groupId?: string }
  onUpdate: (value: ActionValue) => void
  onRemove: () => void
  onFinishEdit: () => void
}

const ActionItem: React.FC<ActionItemProps> = ({
  value,
  editableMode,
  controlSchema,
  onUpdate,
  onRemove,
  onFinishEdit,
}) => {
  const [isEditing, setIsEditing] = useState(editableMode)

  const { name, symbol, value: v } = value
  const readonlyValue =
    symbol === '()' ? `${name}(${v})` : `${name}${symbol}${v}`

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove()
  }

  const handleChangeEditMode = (editable: boolean) => {
    setIsEditing(editable)
    if (!editable) {
      // 如果内容为空，删除该项
      const shouldBeClear = !name.trim() && !symbol && !v.trim()
      if (shouldBeClear) {
        onRemove()
      }
      onFinishEdit()
    }
  }

  const handleActionUpdate = (updatedValue: ActionValue) => {
    onUpdate({
      ...value,
      ...updatedValue,
    })
  }

  const handleFinish = () => {
    setIsEditing(false)
    onFinishEdit()
  }

  return (
    <div className="action-item">
      <EditableSwitch
        readonlyValue={readonlyValue || '(空)'}
        editMode={isEditing || editableMode}
        onChange={handleChangeEditMode}
      >
        {(onFinish) => (
          <ActionEditor
            value={value}
            onUpdate={handleActionUpdate}
            onFinish={() => {
              onFinish()
              handleFinish()
            }}
            controlSchema={controlSchema}
          />
        )}
      </EditableSwitch>
      <div className="action-item-actions">
        <HolderOutlined className="drag-handle" />
        <CloseOutlined className="remove-icon" onClick={handleRemove} />
      </div>
    </div>
  )
}

export default ActionItem
