import React, { useMemo, useEffect, useRef, useCallback } from 'react'
import { Spin, Button } from 'antd'
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons'
import './DslEditor.css'
import { Editor, type Monaco } from '@monaco-editor/react'
import type * as monacoNs from 'monaco-editor'
import { getStrategy } from './strategies'
import { connectLsp, type LspConnection } from './lspClient'
import {
  bindLspSession,
  createCompositeCompletionProvider,
  createLspHoverProvider,
  unbindLspSession,
} from './languageFeatures'
import { isExtensionAuthMode, readExtensionClipboardText } from '../../config/authClient'

type DslStrategy = ReturnType<typeof getStrategy>

interface DslLanguageRegistration {
  strategy: DslStrategy
  disposables: monacoNs.IDisposable[]
}

type DslLanguageRegistry = WeakMap<object, Map<string, DslLanguageRegistration>>

const dslLanguageRegistryKey = '__baicDslEditorLanguageRegistry__'
type DslEditorGlobal = typeof globalThis & {
  [dslLanguageRegistryKey]?: DslLanguageRegistry
}

// Monaco language services are global to the Monaco instance. Persist the
// registry across React mounts and Vite hot updates so each language has
// exactly one active tokenizer/completion registration at a time.
const dslEditorGlobal = globalThis as DslEditorGlobal
const configuredLanguages = dslEditorGlobal[dslLanguageRegistryKey]
  ?? new WeakMap<object, Map<string, DslLanguageRegistration>>()
dslEditorGlobal[dslLanguageRegistryKey] = configuredLanguages

let nextDslDocumentId = 1

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
  const { languageId, themeId, lsp } = strategy
  const [documentId] = React.useState(() => nextDslDocumentId++)
  const documentUri = useMemo(
    () => lsp?.documentUri
      ?? `file:///workspace/${encodeURIComponent(languageId)}/${documentId}.dsl`,
    [documentId, languageId, lsp?.documentUri],
  )

  // Refs to hold editor & monaco instances for LSP lifecycle
  const editorRef = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monacoNs | null>(null)
  const lspRef = useRef<LspConnection | null>(null)
  const readOnlyRef = useRef(readOnly)
  const [isEditorMounted, setIsEditorMounted] = React.useState(false)

  useEffect(() => {
    readOnlyRef.current = readOnly
  }, [readOnly])

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    ensureDslLanguageConfigured(monaco, strategy)
  }, [strategy])

  const handleMount = useCallback((
    editor: monacoNs.editor.IStandaloneCodeEditor,
    monaco: typeof monacoNs,
  ) => {
    editorRef.current = editor
    monacoRef.current = monaco
    registerExtensionPasteHandler(editor, monaco, readOnlyRef)
    setIsEditorMounted(true)
  }, [])

  // beforeMount only runs for a newly created editor. Configure a newly
  // selected strategy too when the existing editor instance is reused.
  useEffect(() => {
    if (monacoRef.current) {
      ensureDslLanguageConfigured(monacoRef.current, strategy)
    }
  }, [strategy])

  // LSP connection lifecycle — connect when editor is mounted and lsp config exists
  useEffect(() => {
    if (readOnly || !lsp || !isEditorMounted || !editorRef.current || !monacoRef.current) return

    const model = editorRef.current.getModel()
    if (!model) return

    const conn = connectLsp(
      lsp.wsUrl,
      editorRef.current,
      monacoRef.current,
      languageId,
      documentUri,
    )
    lspRef.current = conn
    bindLspSession(model, conn)

    return () => {
      unbindLspSession(model, conn)
      conn.dispose()
      lspRef.current = null
    }
  }, [documentUri, isEditorMounted, languageId, lsp, readOnly])

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

function ensureDslLanguageConfigured(
  monaco: typeof monacoNs,
  strategy: DslStrategy,
): void {
  let registrations = configuredLanguages.get(monaco)
  if (!registrations) {
    registrations = new Map<string, DslLanguageRegistration>()
    configuredLanguages.set(monaco, registrations)
  }

  const currentRegistration = registrations.get(strategy.languageId)
  if (currentRegistration?.strategy === strategy) return

  currentRegistration?.disposables.forEach(disposable => disposable.dispose())
  registrations.delete(strategy.languageId)

  const {
    languageId,
    monarchTokensProviders,
    themeId,
    theme,
    completion,
  } = strategy
  const disposables: monacoNs.IDisposable[] = []

  try {
    if (!monaco.languages.getLanguages().some(language => language.id === languageId)) {
      monaco.languages.register({ id: languageId })
    }
    if (monarchTokensProviders) {
      disposables.push(
        monaco.languages.setMonarchTokensProvider(languageId, monarchTokensProviders),
      )
    }
    if (themeId && theme) {
      monaco.editor.defineTheme(themeId, theme)
    }
    if (completion) {
      disposables.push(
        monaco.languages.registerCompletionItemProvider(
          languageId,
          createCompositeCompletionProvider(strategy),
        ),
      )
    }
    disposables.push(
      monaco.languages.registerHoverProvider(languageId, createLspHoverProvider()),
    )

    registrations.set(languageId, { strategy, disposables })
  } catch (error) {
    disposables.forEach(disposable => disposable.dispose())
    throw error
  }
}

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
