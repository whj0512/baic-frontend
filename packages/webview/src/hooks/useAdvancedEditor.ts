import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface AdvancedEditorCompletionItem {
  label: string
  insertText?: string
  detail?: string
  documentation?: string
  kind?: 'function' | 'variable' | 'value' | 'text'
}

interface UseAdvancedEditorOptions<TValue, TDraft = TValue> {
  value: TValue
  title?: string
  languageLabel?: string
  editorLanguage?: string
  shortcutLabel?: string
  cancelText?: string
  saveText?: string
  width?: number
  serialize?: (value: TValue) => TDraft
  parse?: (draftValue: TDraft) => TValue
  validate?: (draftValue: TDraft) => string | null
  completionLanguage?: string
  completionItems?: AdvancedEditorCompletionItem[]
  onSave?: (value: TValue) => void
  onError?: (message: string) => void
}

export interface MonacoEditorLike {
  addCommand: (keybinding: number, handler: () => void) => unknown
}

export interface MonacoModelLike {
  getWordUntilPosition: (position: MonacoPositionLike) => {
    startColumn: number
    endColumn: number
    word: string
  }
}

export interface MonacoPositionLike {
  lineNumber: number
  column: number
}

export interface MonacoLike {
  KeyMod: { CtrlCmd: number }
  KeyCode: { KeyS: number }
  languages: {
    CompletionItemKind: {
      Function: number
      Variable: number
      Value: number
      Text: number
    }
    registerCompletionItemProvider: (
      language: string,
      provider: {
        provideCompletionItems: (
          model: MonacoModelLike,
          position: MonacoPositionLike,
        ) => {
          suggestions: Array<{
            label: string
            kind: number
            insertText: string
            detail?: string
            documentation?: string
            range: {
              startLineNumber: number
              endLineNumber: number
              startColumn: number
              endColumn: number
            }
          }>
        }
      },
    ) => { dispose: () => void }
  }
}

export interface AdvancedEditorHostState {
  id: string
  title: string
  languageLabel: string
  editorLanguage: string
  shortcutLabel: string
  cancelText: string
  saveText: string
  width: number
  draftValue: string
  setDraftValue: (value: string) => void
  closeEditor: () => void
  saveEditor: () => boolean
  handleEditorMount: (editor: MonacoEditorLike, monaco: MonacoLike) => void
}

interface AdvancedEditorHostContextValue {
  registerEditor: (editor: AdvancedEditorHostState) => void
  unregisterEditor: (id: string) => void
}

const AdvancedEditorRegistrationContext = createContext<AdvancedEditorHostContextValue | null>(null)
const AdvancedEditorStateContext = createContext<AdvancedEditorHostState | null>(null)

export const AdvancedEditorHostProvider = ({ children }: { children: ReactNode }) => {
  const [activeEditor, setActiveEditor] = useState<AdvancedEditorHostState | null>(null)

  const registerEditor = useCallback((editor: AdvancedEditorHostState) => {
    setActiveEditor(editor)
  }, [])

  const unregisterEditor = useCallback((id: string) => {
    setActiveEditor((currentEditor) => (
      currentEditor?.id === id ? null : currentEditor
    ))
  }, [])

  const contextValue = useMemo(() => ({
    registerEditor,
    unregisterEditor,
  }), [registerEditor, unregisterEditor])

  return createElement(
    AdvancedEditorRegistrationContext.Provider,
    { value: contextValue },
    createElement(AdvancedEditorStateContext.Provider, { value: activeEditor }, children),
  )
}

export const useAdvancedEditorHost = () => {
  return useContext(AdvancedEditorStateContext)
}

const getCompletionKind = (
  monaco: MonacoLike,
  kind: AdvancedEditorCompletionItem['kind'],
) => {
  if (kind === 'function') return monaco.languages.CompletionItemKind.Function
  if (kind === 'variable') return monaco.languages.CompletionItemKind.Variable
  if (kind === 'value') return monaco.languages.CompletionItemKind.Value
  return monaco.languages.CompletionItemKind.Text
}

export const useAdvancedEditor = <TValue, TDraft = TValue>({
  value,
  title = 'Advanced edit',
  languageLabel = 'Python',
  editorLanguage,
  shortcutLabel = 'Save',
  cancelText = 'Cancel',
  saveText = 'Save',
  width = 760,
  serialize,
  parse,
  validate,
  completionLanguage,
  completionItems,
  onSave,
  onError,
}: UseAdvancedEditorOptions<TValue, TDraft>) => {
  const hostContext = useContext(AdvancedEditorRegistrationContext)
  const [open, setOpen] = useState(false)
  const editorIdRef = useRef(`advanced-editor-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const [draftValue, setDraftValue] = useState<TDraft>(() =>
    serialize ? serialize(value) : (value as unknown as TDraft),
  )
  const draftRef = useRef(draftValue)
  const completionDisposableRef = useRef<{ dispose: () => void } | null>(null)

  useEffect(() => {
    draftRef.current = draftValue
  }, [draftValue])

  useEffect(() => {
    return () => {
      completionDisposableRef.current?.dispose()
    }
  }, [])

  const openEditor = useCallback(() => {
    setDraftValue(serialize ? serialize(value) : (value as unknown as TDraft))
    setOpen(true)
  }, [serialize, value])

  const closeEditor = useCallback(() => {
    setOpen(false)
  }, [])

  const saveEditor = useCallback(() => {
    const currentDraft = draftRef.current
    const validationMessage = validate?.(currentDraft)

    if (validationMessage) {
      onError?.(validationMessage)
      return false
    }

    try {
      onSave?.(parse ? parse(currentDraft) : (currentDraft as unknown as TValue))
      setOpen(false)
      return true
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Save failed')
      return false
    }
  }, [onError, onSave, parse, validate])

  const handleEditorMount = useCallback((editor: MonacoEditorLike, monaco: MonacoLike) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveEditor()
    })

    completionDisposableRef.current?.dispose()
    completionDisposableRef.current = null

    if (!completionLanguage || !completionItems?.length) return

    completionDisposableRef.current = monaco.languages.registerCompletionItemProvider(
      completionLanguage,
      {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }

          return {
            suggestions: completionItems.map((item) => ({
              label: item.label,
              kind: getCompletionKind(monaco, item.kind),
              insertText: item.insertText ?? item.label,
              detail: item.detail,
              documentation: item.documentation,
              range,
            })),
          }
        },
      },
    )
  }, [completionItems, completionLanguage, saveEditor])

  useEffect(() => {
    if (!open || !hostContext) return

    const id = editorIdRef.current
    hostContext.registerEditor({
      id,
      title,
      languageLabel,
      editorLanguage: editorLanguage ?? completionLanguage ?? 'plaintext',
      shortcutLabel,
      cancelText,
      saveText,
      width,
      draftValue: String(draftValue ?? ''),
      setDraftValue: (nextValue) => setDraftValue(nextValue as unknown as TDraft),
      closeEditor,
      saveEditor,
      handleEditorMount,
    })
  }, [
    cancelText,
    closeEditor,
    completionLanguage,
    draftValue,
    editorLanguage,
    handleEditorMount,
    hostContext,
    languageLabel,
    open,
    saveEditor,
    saveText,
    shortcutLabel,
    title,
    width,
  ])

  useEffect(() => {
    if (!hostContext) return

    const id = editorIdRef.current
    if (!open) {
      hostContext.unregisterEditor(id)
    }
  }, [hostContext, open])

  useEffect(() => {
    if (!hostContext) return undefined

    const id = editorIdRef.current
    return () => {
      hostContext.unregisterEditor(id)
    }
  }, [hostContext])

  return {
    open,
    draftValue,
    setDraftValue,
    openEditor,
    closeEditor,
    saveEditor,
    handleEditorMount,
  }
}
