import React, { useState } from 'react'
import './ParamsEditor.css'

interface ParamField {
  label: string
  value: string
}

interface ParamsEditorProps {
  value: ParamField
  onFinish: () => void
  onUpdate: () => void
}

const ParamsEditor: React.FC<ParamsEditorProps> = ({ value, onFinish, onUpdate }) => {
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (field: keyof ParamField, e: React.ChangeEvent<HTMLInputElement>) => {
    value[field] = e.target.value
    onUpdate()
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
    setTimeout(() => {
      if (!isFocused) {
        onFinish()
      }
    }, 100)
  }

  return (
    <div className="params-editor">
      <input
        type="text"
        className="params-editor-input"
        defaultValue={value.label}
        placeholder="参数名"
        autoFocus
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => handleChange('label', e)}
      />
      <input
        type="text"
        className="params-editor-input"
        defaultValue={value.value}
        placeholder="参数值"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => handleChange('value', e)}
      />
    </div>
  )
}

export default ParamsEditor
