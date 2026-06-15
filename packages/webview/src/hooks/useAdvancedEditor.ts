import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAdvancedEditorOptions<TValue, TDraft = TValue> {
  value: TValue
  serialize?: (value: TValue) => TDraft
  parse?: (draftValue: TDraft) => TValue
  validate?: (draftValue: TDraft) => string | null
  onSave?: (value: TValue) => void
  onError?: (message: string) => void
}

interface MonacoEditorLike {
  addCommand: (keybinding: number, handler: () => void) => unknown
}

interface MonacoLike {
  KeyMod: { CtrlCmd: number }
  KeyCode: { KeyS: number }
}

export const useAdvancedEditor = <TValue, TDraft = TValue>({
  value,
  serialize,
  parse,
  validate,
  onSave,
  onError,
}: UseAdvancedEditorOptions<TValue, TDraft>) => {
  const [open, setOpen] = useState(false)
  const [draftValue, setDraftValue] = useState<TDraft>(() =>
    serialize ? serialize(value) : (value as unknown as TDraft),
  )
  const draftRef = useRef(draftValue)

  useEffect(() => {
    draftRef.current = draftValue
  }, [draftValue])

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
  }, [saveEditor])

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
