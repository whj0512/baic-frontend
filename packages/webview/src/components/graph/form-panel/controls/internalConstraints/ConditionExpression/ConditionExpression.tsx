import React, { useState } from 'react'
import EditableSwitch from '../../common/EditableSwitch'
import ConditionTreeModal from './ConditionTreeModal'
import './ConditionExpression.css'

interface ConditionExpressionProps {
  value?: string
  onChange?: (value: string) => void
}

const ConditionExpression: React.FC<ConditionExpressionProps> = ({ value = '', onChange }) => {
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    setOpen(true)
  }

  const handleConfirm = (nextValue: string) => {
    onChange?.(nextValue)
    setOpen(false)
  }

  return (
    <div className="condition-expression-control">
      <EditableSwitch
        key={open ? 'condition-open' : 'condition-closed'}
        readonlyValue={value || '未设置条件'}
        onChange={handleOpen}
      >
        {() => <span className="condition-expression-edit-placeholder" />}
      </EditableSwitch>
      <ConditionTreeModal
        open={open}
        value={value}
        onCancel={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  )
}

export default ConditionExpression
