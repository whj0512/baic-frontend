import React, { useMemo, useEffect, useRef, useCallback } from 'react'
import { Spin, Button } from 'antd'
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons'
import './DslEditor.css'
import { Editor, type Monaco } from '@monaco-editor/react'
import type * as monacoNs from 'monaco-editor'
import { getStrategy } from './strategies'
import { connectLsp } from './lspClient'

interface DslEditorProps {
  sectionKey: string
  value: string
  loading?: boolean
  error?: string
  onDismissError?: () => void
  onChange?: (value: string) => void
  readOnly?: boolean
}

const DslEditor: React.FC<DslEditorProps> = ({
  sectionKey,
  value,
  loading = false,
  error,
  onDismissError,
  onChange,
  readOnly = true,
}) => {
  const handleChange = (value: string | undefined) => {
    onChange?.(value ?? '')
  }

  const strategy = useMemo(() => getStrategy(sectionKey), [sectionKey])
  const { languageId, monarchTokensProviders, themeId, theme, completionItemProviders, lsp } = strategy

  // Refs to hold editor & monaco instances for LSP lifecycle
  const editorRef = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monacoNs | null>(null)
  const lspRef = useRef<{ dispose: () => void } | null>(null)
  const [isEditorMounted, setIsEditorMounted] = React.useState(false)

  const handleBeforeMount = useCallback((monaco: Monaco) => {
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
  }, [languageId, monarchTokensProviders, themeId, theme, completionItemProviders])

  const handleMount = useCallback((
    editor: monacoNs.editor.IStandaloneCodeEditor,
    monaco: typeof monacoNs,
  ) => {
    editorRef.current = editor
    monacoRef.current = monaco
    setIsEditorMounted(true)
  }, [])

  // LSP connection lifecycle — connect when editor is mounted and lsp config exists
  useEffect(() => {
    if (!lsp || !isEditorMounted || !editorRef.current || !monacoRef.current) return

    const conn = connectLsp(
      lsp.wsUrl,
      editorRef.current,
      monacoRef.current,
      languageId,
      lsp.documentUri,
    )
    lspRef.current = conn

    return () => {
      conn.dispose()
      lspRef.current = null
    }
  }, [lsp, languageId, isEditorMounted])

  if (loading) {
    return (
      <div className="dsl-editor-loading">
        <Spin tip="正在转换为 DSL..." />
      </div>
    )
  }

  return (
    <div className="dsl-editor">
      {error && (
        <div className="dsl-editor-error-banner">
          <div className="dsl-editor-error-banner-content">
            <CloseCircleOutlined className="dsl-editor-error-banner-icon" />
            <div className="dsl-editor-error-banner-body">
              <div className="dsl-editor-error-banner-title">转换失败</div>
              <div className="dsl-editor-error-banner-message">{error}</div>
            </div>
          </div>
          {onDismissError && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={onDismissError}
              className="dsl-editor-error-banner-btn"
            >
              继续编辑
            </Button>
          )}
        </div>
      )}
      <Editor
        value={value}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        theme={themeId || 'vs-dark'}
        language={languageId}
        options={{
          readOnly,
          hover: { above: false },
        }}
      />
    </div>
  )
}

export default DslEditor
