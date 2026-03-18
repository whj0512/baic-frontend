import React, { useMemo, useEffect, useRef, useCallback } from 'react'
import { Spin } from 'antd'
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
        onMount={handleMount}
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
