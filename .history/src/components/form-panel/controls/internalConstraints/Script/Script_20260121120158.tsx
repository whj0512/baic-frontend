import React from 'react'
import EditableSwitch from '../EditableSwitch'
import './Script.css'

interface ScriptProps {
  value?: string
  onChange?: (value: string) => void
}

const Script: React.FC<ScriptProps> = ({ value = '', onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <div className="script-control">
      <EditableSwitch readonlyValue={value || '未设置脚本'}>
        {(onFinish) => (
          <input
            type="text"
            className="script-input"
            defaultValue={value}
            placeholder="输入脚本表达式"
            autoFocus
            onBlur={onFinish}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onFinish()
              }
            }}
          />
        )}
      </EditableSwitch>
    </div>
  )
}

export default Script
