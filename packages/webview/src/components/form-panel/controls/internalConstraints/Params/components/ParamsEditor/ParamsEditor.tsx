import React from 'react'
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
  const handleChange = (field: keyof ParamField, e: React.ChangeEvent<HTMLInputElement>) => {
    value[field] = e.target.value
    onUpdate()
  }

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // 只有当焦点移出整个编辑器容器时才调用 onFinish
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onFinish()
    }
  }

  return (
    <div className="params-editor" onBlur={handleBlur}>
      <input
        type="text"
        className="params-editor-input"
        defaultValue={value.label}
        placeholder="参数名"
        autoFocus
        onChange={(e) => handleChange('label', e)}
      />
      <input
        type="text"
        className="params-editor-input"
        defaultValue={value.value}
        placeholder="参数值"
        onChange={(e) => handleChange('value', e)}
      />
    </div>
  )
}

export default ParamsEditor
