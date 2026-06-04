import React from 'react'
import './ParamsEditor.css'

interface ParamField {
  name: string
  type: string
}

interface ParamsEditorProps {
  value: ParamField
  onFinish: () => void
  onUpdate: (newValue: ParamField) => void
}

const ParamsEditor: React.FC<ParamsEditorProps> = ({ value, onFinish, onUpdate }) => {
  const handleChange = (field: keyof ParamField, e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...value,
      [field]: e.target.value
    })
  }

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // 只有当焦点移出整个编辑器容器时才调用 onFinish
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onFinish()
    }
  }

  return (
    <div className="interaction-params-editor" onBlur={handleBlur}>
      <input
        type="text"
        className="interaction-params-editor-input"
        defaultValue={value.name}
        placeholder="参数名称"
        autoFocus
        onChange={(e) => handleChange('name', e)}
      />
      <input
        type="text"
        className="interaction-params-editor-input"
        defaultValue={value.type}
        placeholder="参数类型"
        onChange={(e) => handleChange('type', e)}
      />
    </div>
  )
}

export default ParamsEditor
