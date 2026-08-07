import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Button, message, Modal } from 'antd'
import type { FlowGraphRef } from '../graph'
import { cloneSerializableData, createEditorSnapshot } from './snapshot'
import type {
  ConvertedVisualData,
  RequirementDimensionEditorProps,
  DimensionSectionConfig,
  EditorSnapshot,
  ViewMode,
} from './types'

type MutableRef<T> = {
  current: T
}

interface UseUnsavedChangesGuardOptions {
  requirement: RequirementDimensionEditorProps['requirement']
  sectionKey: RequirementDimensionEditorProps['sectionKey']
  config: DimensionSectionConfig
  onBack: () => void
  onSave?: RequirementDimensionEditorProps['onSave']
  onPersist?: RequirementDimensionEditorProps['onPersist']
  hasUnsavedChanges: boolean
  savedSnapshotRef: MutableRef<EditorSnapshot>
  contentRef: MutableRef<string>
  dslContentRef: MutableRef<string>
  graphDataRef: MutableRef<object>
  serializedGraphDataRef: MutableRef<object | null>
  pendingCanvasDataRef: MutableRef<Record<string, any> | null>
  flowGraphRef: MutableRef<FlowGraphRef | null>
  markSnapshotSaved: (snapshot?: EditorSnapshot) => void
  convertGraphToDsl: () => Promise<string | null>
  convertDslToVisual: (sourceDsl?: string) => Promise<ConvertedVisualData | null>
  applyDslView: (nextDslContent: string, options?: { switchView?: boolean }) => void
  applyVisualView: (
    convertedVisualData: ConvertedVisualData,
    options?: { switchView?: boolean },
  ) => void
  setSaving: Dispatch<SetStateAction<boolean>>
  setContent: Dispatch<SetStateAction<string>>
  setDslContent: Dispatch<SetStateAction<string>>
  setGraphData: Dispatch<SetStateAction<object>>
  viewMode: ViewMode
  onSnapshotSaved?: () => void
  onDiscardUnsavedChanges?: () => void
  persistDisabledReason?: string
  modelBacked: boolean
}

export function useUnsavedChangesGuard({
  requirement,
  sectionKey,
  config,
  onBack,
  onSave,
  onPersist,
  hasUnsavedChanges,
  savedSnapshotRef,
  contentRef,
  dslContentRef,
  graphDataRef,
  serializedGraphDataRef,
  pendingCanvasDataRef,
  flowGraphRef,
  markSnapshotSaved,
  convertGraphToDsl,
  convertDslToVisual,
  applyDslView,
  applyVisualView,
  setSaving,
  setContent,
  setDslContent,
  setGraphData,
  viewMode,
  onSnapshotSaved,
  onDiscardUnsavedChanges,
  persistDisabledReason,
  modelBacked,
}: UseUnsavedChangesGuardOptions) {
  const prepareSnapshotForSave = useCallback(async (): Promise<EditorSnapshot | null> => {
    if (persistDisabledReason) {
      message.error(persistDisabledReason)
      return null
    }
    const currentContent = contentRef.current

    if (!modelBacked && (!config.graphField || !config.dslField)) {
      return createEditorSnapshot(
        currentContent,
        dslContentRef.current,
        graphDataRef.current,
        serializedGraphDataRef.current,
      )
    }

    if (viewMode === 'dsl') {
      const currentDslContent = dslContentRef.current
      if (!currentDslContent.trim()) {
        message.error('请先补全 DSL 内容后再保存')
        return null
      }

      const convertedVisualData = await convertDslToVisual(currentDslContent)
      if (!convertedVisualData) return null

      applyVisualView(convertedVisualData, { switchView: false })
      return createEditorSnapshot(
        currentContent,
        currentDslContent,
        convertedVisualData.cellsData,
        convertedVisualData.serializedGraphData,
      )
    }

    const nextDslContent = await convertGraphToDsl()
    if (nextDslContent === null) return null

    applyDslView(nextDslContent, { switchView: false })
    return createEditorSnapshot(
      currentContent,
      nextDslContent,
      graphDataRef.current,
      serializedGraphDataRef.current,
    )
  }, [
    applyDslView,
    applyVisualView,
    config.dslField,
    config.graphField,
    contentRef,
    convertDslToVisual,
    convertGraphToDsl,
    dslContentRef,
    graphDataRef,
    serializedGraphDataRef,
    modelBacked,
    persistDisabledReason,
    viewMode,
  ])

  const saveSnapshot = useCallback(async (
    snapshot = createEditorSnapshot(
      contentRef.current,
      dslContentRef.current,
      graphDataRef.current,
      serializedGraphDataRef.current,
    ),
  ): Promise<boolean> => {
    if (!onPersist) {
      onSave?.(sectionKey, snapshot.graphData, snapshot.dslContent, snapshot)
      markSnapshotSaved(snapshot)
      onSnapshotSaved?.()
      message.success(requirement.id === 'NEW' ? '暂存成功' : '保存成功')
      return true
    }

    setSaving(true)
    try {
      await onPersist(snapshot)
      onSave?.(sectionKey, snapshot.graphData, snapshot.dslContent, snapshot)
      markSnapshotSaved(snapshot)
      onSnapshotSaved?.()
      message.success(requirement.id === 'NEW' ? '暂存成功' : '保存成功')
      return true
    } catch (error: any) {
      console.error('Save error:', error)
      message.error(error.message || '保存失败')
      return false
    } finally {
      setSaving(false)
    }
  }, [
    contentRef,
    dslContentRef,
    graphDataRef,
    markSnapshotSaved,
    onSnapshotSaved,
    onSave,
    onPersist,
    requirement.id,
    sectionKey,
    setSaving,
  ])

  const handleSave = useCallback(async () => {
    const snapshot = await prepareSnapshotForSave()
    if (!snapshot) return

    await saveSnapshot(snapshot)
  }, [prepareSnapshotForSave, saveSnapshot])

  const handleContentChange = useCallback((nextContent: string) => {
    contentRef.current = nextContent
    setContent(nextContent)
  }, [contentRef, setContent])

  const handleDslContentChange = useCallback((nextDslContent: string) => {
    dslContentRef.current = nextDslContent
    setDslContent(nextDslContent)
  }, [dslContentRef, setDslContent])

  const restoreSavedSnapshot = useCallback(() => {
    const snapshot = savedSnapshotRef.current
    const nextGraphData = cloneSerializableData(snapshot.graphData)

    contentRef.current = snapshot.content
    dslContentRef.current = snapshot.dslContent
    graphDataRef.current = nextGraphData
    serializedGraphDataRef.current = snapshot.serializedGraphData ?? null
    pendingCanvasDataRef.current = null
    setContent(snapshot.content)
    setDslContent(snapshot.dslContent)
    setGraphData(nextGraphData)

    flowGraphRef.current?.loadData(nextGraphData)
  }, [
    contentRef,
    dslContentRef,
    flowGraphRef,
    graphDataRef,
    serializedGraphDataRef,
    pendingCanvasDataRef,
    savedSnapshotRef,
    setContent,
    setDslContent,
    setGraphData,
  ])

  const continueWithoutSaving = useCallback(() => {
    restoreSavedSnapshot()
    onDiscardUnsavedChanges?.()
    onBack()
  }, [onBack, onDiscardUnsavedChanges, restoreSavedSnapshot])

  const handleGuardedBack = useCallback(() => {
    if (!hasUnsavedChanges) {
      onBack()
      return
    }

    let modal: { destroy: () => void } | null = null
    modal = Modal.confirm({
      title: '存在未保存的修改',
      content: '离开当前编辑内容前，请选择保存修改、放弃修改或继续留在当前页面。',
      okText: '保存并继续',
      cancelText: '取消',
      centered: true,
      onOk: async () => {
        const snapshot = await prepareSnapshotForSave()
        if (!snapshot) {
          throw new Error('prepare snapshot failed')
        }

        const completed = await saveSnapshot(snapshot)
        if (!completed) {
          throw new Error('continue action failed')
        }
        onBack()
      },
      footer: (_, { OkBtn, CancelBtn }) => (
        <>
          <Button
            onClick={() => {
              modal?.destroy()
              continueWithoutSaving()
            }}
          >
            不保存继续
          </Button>
          <CancelBtn />
          <OkBtn />
        </>
      ),
    })
  }, [continueWithoutSaving, hasUnsavedChanges, onBack, prepareSnapshotForSave, saveSnapshot])

  return {
    handleSave,
    handleContentChange,
    handleDslContentChange,
    handleGuardedBack,
  }
}
