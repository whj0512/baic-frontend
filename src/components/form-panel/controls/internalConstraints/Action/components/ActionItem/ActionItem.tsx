import React, { useState } from 'react'
import { CloseOutlined, HolderOutlined } from '@ant-design/icons'
import { Input } from 'antd'
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

  const { express } = value
  const readonlyValue = express

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove()
  }

  const handleChangeEditMode = (editable: boolean) => {
    setIsEditing(editable)
    if (!editable) {
      // 如果内容为空，删除该项
      if (!express || !express.trim()) {
        onRemove()
      }
      onFinishEdit()
    }
  }

  const handleActionUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...value,
      express: e.target.value,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, onFinish: () => void) => {
    if (e.key === 'Enter') {
      onFinish()
      handleFinish()
    }
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
          <Input
            autoFocus
            value={express}
            onChange={handleActionUpdate}
            onKeyDown={(e) => handleKeyDown(e, onFinish)}
            onBlur={() => {
              onFinish()
              handleFinish()
            }}
            placeholder="请输入执行语句，如 save(25)"
            style={{ width: '100%', minWidth: '150px' }}
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
