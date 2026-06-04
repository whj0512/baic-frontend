import React, { useState, useEffect, ReactElement } from 'react'
import './EditableSwitch.css'

interface EditableSwitchProps {
  editMode?: boolean
  className?: string
  readonlyValue: string | number | boolean
  children: (onFinish: () => void) => ReactElement
  onChange?: (editable: boolean) => void
}

const EditableSwitch: React.FC<EditableSwitchProps> = ({
  editMode = false,
  className = '',
  readonlyValue = '',
  children,
  onChange,
}) => {
  const [editable, setEditable] = useState(editMode)

  useEffect(() => {
    setEditable(editMode)
  }, [editMode])

  const onSwitchEditableMode = (e?: React.MouseEvent) => {
    const newEditable = !editable
    setEditable(newEditable)
    onChange?.(newEditable)
    e?.stopPropagation()
  }

  return (
    <div className={`editable-switch ${className}`}>
      {editable ? (
        children(onSwitchEditableMode)
      ) : (
        <div
          className="editable-switch-readonly"
          onClick={onSwitchEditableMode}
          title={String(readonlyValue)}
        >
          {readonlyValue || '空'}
        </div>
      )}
    </div>
  )
}

export default EditableSwitch
