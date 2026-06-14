import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Button, message, Modal } from 'antd'
import type { FlowGraphRef } from '../graph'
import { API_ENDPOINTS, authFetch } from '../../config/api'
import { cloneSerializableData, createEditorSnapshot } from './snapshot'
import type {
  ConvertedVisualData,
  DimensionEditorProps,
  DimensionSectionConfig,
  EditorSnapshot,
  ViewMode,
} from './types'

type MutableRef<T> = {
  current: T
}

interface UseUnsavedChangesGuardOptions {
  requirement: DimensionEditorProps['requirement']
  sectionKey: DimensionEditorProps['sectionKey']
  config: DimensionSectionConfig
  onBack: () => void
  onSave?: DimensionEditorProps['onSave']
  hasUnsavedChanges: boolean
  savedSnapshotRef: MutableRef<EditorSnapshot>
  contentRef: MutableRef<string>
  dslContentRef: MutableRef<string>
  graphDataRef: MutableRef<object>
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
}

export function useUnsavedChangesGuard({
  requirement,
  sectionKey,
  config,
  onBack,
  onSave,
  hasUnsavedChanges,
  savedSnapshotRef,
  contentRef,
  dslContentRef,
  graphDataRef,
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
}: UseUnsavedChangesGuardOptions) {
  const prepareSnapshotForSave = useCallback(async (): Promise<EditorSnapshot | null> => {
    const currentContent = contentRef.current

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
      )
    }

    const nextDslContent = await convertGraphToDsl()
    if (nextDslContent === null) return null

    applyDslView(nextDslContent, { switchView: false })
    return createEditorSnapshot(
      currentContent,
      nextDslContent,
      graphDataRef.current,
    )
  }, [
    applyDslView,
    applyVisualView,
    contentRef,
    convertDslToVisual,
    convertGraphToDsl,
    dslContentRef,
    graphDataRef,
    viewMode,
  ])

  const saveSnapshot = useCallback(async (
    snapshot = createEditorSnapshot(
      contentRef.current,
      dslContentRef.current,
      graphDataRef.current,
    ),
  ): Promise<boolean> => {
    if (requirement.id === 'NEW') {
      onSave?.(sectionKey, snapshot.graphData, snapshot.dslContent)
      markSnapshotSaved(snapshot)
      message.success('暂存成功')
      return true
    }

    setSaving(true)
    try {
      const payload = {
        [config.graphField]: snapshot.graphData,
        [config.dslField]: snapshot.dslContent,
        nl_text: snapshot.content,
      }

      const response = await authFetch(`${API_ENDPOINTS.requirements}/${requirement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '保存失败')
      }

      onSave?.(sectionKey, snapshot.graphData, snapshot.dslContent)
      markSnapshotSaved(snapshot)
      message.success('保存成功')
      return true
    } catch (error: any) {
      console.error('Save error:', error)
      message.error(error.message || '保存失败')
      return false
    } finally {
      setSaving(false)
    }
  }, [
    config.dslField,
    config.graphField,
    contentRef,
    dslContentRef,
    graphDataRef,
    markSnapshotSaved,
    onSave,
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
    pendingCanvasDataRef.current = null
    setContent(snapshot.content)
    setDslContent(snapshot.dslContent)
    setGraphData(nextGraphData)

    const graph = flowGraphRef.current?.getGraph()
    if (graph) {
      graph.fromJSON(nextGraphData)
    }
  }, [
    contentRef,
    dslContentRef,
    flowGraphRef,
    graphDataRef,
    pendingCanvasDataRef,
    savedSnapshotRef,
    setContent,
    setDslContent,
    setGraphData,
  ])

  const continueWithoutSaving = useCallback(() => {
    restoreSavedSnapshot()
    onBack()
  }, [onBack, restoreSavedSnapshot])

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
