import React from 'react'
import EditableSwitch from '../../common/EditableSwitch'
import './ConditionExpression.css'

interface ConditionExpressionProps {
  value?: string
  onChange?: (value: string) => void
}

const ConditionExpression: React.FC<ConditionExpressionProps> = ({ value = '', onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <div className="condition-expression-control">
      <EditableSwitch readonlyValue={value || '未设置条件'}>
        {(onFinish) => (
          <textarea
            className="condition-expression-textarea"
            defaultValue={value}
            placeholder="输入条件表达式"
            autoFocus
            rows={3}
            onBlur={onFinish}
            onChange={handleChange}
          />
        )}
      </EditableSwitch>
    </div>
  )
}

export default ConditionExpression
