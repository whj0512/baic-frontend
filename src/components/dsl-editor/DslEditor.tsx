import React from 'react'
import { Spin } from 'antd'
import './DslEditor.css'

interface DslEditorProps {
  value: string
  loading?: boolean
  error?: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

const DslEditor: React.FC<DslEditorProps> = ({
  value,
  loading = false,
  error,
  onChange,
  readOnly = true,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }

  if (loading) {
    return (
      <div className="dsl-editor-loading">
        <Spin tip="正在转换为 DSL..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="dsl-editor-error">
        <div className="dsl-editor-error-title">转换失败</div>
        <div className="dsl-editor-error-message">{error}</div>
      </div>
    )
  }

  return (
    <div className="dsl-editor">
      <textarea
        className="dsl-editor-textarea"
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder="DSL 内容将在此显示..."
        spellCheck={false}
      />
    </div>
  )
}

export default DslEditor
