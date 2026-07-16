import React, { useMemo, useEffect, useRef, useCallback } from 'react'
import { Spin, Button } from 'antd'
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons'
import './DslEditor.css'
import { Editor, type Monaco } from '@monaco-editor/react'
import type * as monacoNs from 'monaco-editor'
import { getStrategy } from './strategies'
import { connectLsp } from './lspClient'
import { isExtensionAuthMode, readExtensionClipboardText } from '../../config/authClient'

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
  const readOnlyRef = useRef(readOnly)
  const [isEditorMounted, setIsEditorMounted] = React.useState(false)

  useEffect(() => {
    readOnlyRef.current = readOnly
  }, [readOnly])

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
    registerExtensionPasteHandler(editor, monaco, readOnlyRef)
    setIsEditorMounted(true)
  }, [])

  // LSP connection lifecycle — connect when editor is mounted and lsp config exists
  useEffect(() => {
    if (readOnly || !lsp || !isEditorMounted || !editorRef.current || !monacoRef.current) return

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
  }, [lsp, languageId, isEditorMounted, readOnly])

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
          domReadOnly: readOnly,
          readOnlyMessage: { value: '远程快照为只读内容' },
          hover: { above: false },
        }}
      />
    </div>
  )
}

export default DslEditor

function registerExtensionPasteHandler(
  editor: monacoNs.editor.IStandaloneCodeEditor,
  monaco: typeof monacoNs,
  readOnlyRef: React.MutableRefObject<boolean>,
): void {
  if (!isExtensionAuthMode()) return

  editor.onKeyDown((event) => {
    if (!isPasteShortcut(event.browserEvent) || readOnlyRef.current) return

    event.preventDefault()
    event.stopPropagation()

    void readExtensionClipboardText()
      .then(text => pasteTextIntoEditor(editor, monaco, text))
      .catch(error => {
        console.error('Failed to paste clipboard text into DSL editor:', error)
      })
  })
}

function isPasteShortcut(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'v'
  )
}

function pasteTextIntoEditor(
  editor: monacoNs.editor.IStandaloneCodeEditor,
  monaco: typeof monacoNs,
  text: string,
): void {
  if (!text || !editor.hasModel()) return

  const selections = editor.getSelections()
  if (!selections?.length) return

  editor.pushUndoStop()
  editor.executeEdits(
    'extension-clipboard-paste',
    selections.map(selection => ({
      range: selection,
      text,
      forceMoveMarkers: true,
    })),
    selections.map(selection => createCursorSelectionAfterPaste(monaco, selection, text)),
  )
  editor.pushUndoStop()
  editor.focus()
}

function createCursorSelectionAfterPaste(
  monaco: typeof monacoNs,
  selection: monacoNs.Selection,
  text: string,
): monacoNs.Selection {
  const start = selection.getStartPosition()
  const lines = text.split(/\r\n|\r|\n/)
  const lineNumber = start.lineNumber + lines.length - 1
  const column =
    lines.length === 1
      ? start.column + lines[0].length
      : lines[lines.length - 1].length + 1

  return new monaco.Selection(lineNumber, column, lineNumber, column)
}
