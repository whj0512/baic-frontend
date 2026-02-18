import React, { useMemo } from 'react'
import { Spin } from 'antd'
import './DslEditor.css'
import { Editor, type Monaco } from '@monaco-editor/react'
import { getStrategy } from './strategies'

interface DslEditorProps {
  sectionKey: string
  value: string
  loading?: boolean
  error?: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

const DslEditor: React.FC<DslEditorProps> = ({
  sectionKey,
  value,
  loading = false,
  error,
  onChange,
  readOnly = true,
}) => {
  const handleChange = (value, event) => {
    // here is the current value
    onChange?.(value)
  }

  const strategy = useMemo(() => getStrategy(sectionKey), [sectionKey])
  const { languageId, monarchTokensProviders, themeId, theme, completionItemProviders } = strategy

  const handleBeforeMount = (monaco: Monaco) => {
    monaco.languages.register({ id: languageId });
    if (monarchTokensProviders) {
      monaco.languages.setMonarchTokensProvider(languageId, monarchTokensProviders);
    }
    if (themeId && theme) {
      monaco.editor.defineTheme(themeId, theme);
    }
    if (completionItemProviders) {
      completionItemProviders.forEach(provider => {
        monaco.languages.registerCompletionItemProvider(languageId, provider);
      });
    }
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
      <Editor
        value={value}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        theme={themeId || 'vs-dark'}
        language={languageId}
        options={{
          readOnly,
        }}
      />
    </div>
  )
}

export default DslEditor
