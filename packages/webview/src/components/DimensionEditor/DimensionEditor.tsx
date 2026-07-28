import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, message, Modal } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DownloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import type { FlowGraphRef } from '../graph'
import { getModelStrategy } from '../../models/strategies'
import { exportGraphToRBG } from '../../models/strategies/internalConstraints/exportGraph'
import ArtifactDimensionEditor from './ArtifactDimensionEditor'
import DimensionModelingSurface from './DimensionModelingSurface'
import { SECTION_CONFIG } from './dimensionEditorConfig'
import { useDimensionEditorConversions } from './useDimensionEditorConversions'
import { useDimensionEditorSnapshot } from './useDimensionEditorSnapshot'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'
import type {
  DimensionEditorProps,
  EditorSnapshot,
  RequirementDimensionEditorProps,
  SectionKey,
  ViewMode,
} from './types'
import { cloneSerializableData, createEditorSnapshot } from './snapshot'
import {
  clearDimensionEditorDraft,
  getDraftUserId,
  readDimensionEditorDraft,
  saveDimensionEditorDraft,
} from '../../utils/editorDraftStorage'
import './DimensionEditor.css'

function RequirementDimensionEditor({
  draftProjectScope,
  requirement,
  sectionKey,
  onBack,
  onSave,
}: RequirementDimensionEditorProps) {
  const config = SECTION_CONFIG[sectionKey]
  const modelStrategy = getModelStrategy(sectionKey)
  const draftUserId = getDraftUserId()
  const isDialogMap = sectionKey === 'dialogMap'

  const initialGraphData = (config.graphField ? (requirement[config.graphField] as object) : (requirement as any).graph_DialogMap)
    || {}
  const initialDslContent = (config.dslField ? (requirement[config.dslField] as string) : (requirement as any).dsl_DialogMap)
    || ''
  const initialContent = requirement.nl_text || ''

  const [content, setContent] = useState(initialContent)
  const [graphData, setGraphData] = useState(initialGraphData)
  const [viewMode, setViewMode] = useState<ViewMode>(() => (isDialogMap ? 'visual' : 'dsl'))
  const [dslContent, setDslContent] = useState(initialDslContent)
  const [dslLoading, setDslLoading] = useState(false)
  const [dslError, setDslError] = useState<string | undefined>()
  const [graphError, setGraphError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const contentRef = useRef(initialContent)
  const graphDataRef = useRef<object>(initialGraphData)
  const dslContentRef = useRef(initialDslContent)
  const flowGraphRef = useRef<FlowGraphRef | null>(null)
  const pendingCanvasDataRef = useRef<Record<string, any> | null>(null)
  const editorGroupRef = useRef<HTMLDivElement | null>(null)
  const draftPromptKeyRef = useRef('')
  const restoredDraftRef = useRef(false)

  const {
    savedSnapshotRef,
    hasUnsavedChanges,
    updateSavedSnapshot,
    markSnapshotSaved,
  } = useDimensionEditorSnapshot({
    initialContent,
    initialDslContent,
    initialGraphData,
    content,
    dslContent,
    graphData,
    contentRef,
    dslContentRef,
    graphDataRef,
  })

  const {
    convertGraphToDsl,
    convertDslToVisual,
    applyDslView,
    applyVisualView,
    handleDismissError,
    handleDismissGraphError,
  } = useDimensionEditorConversions({
    config,
    modelStrategy,
    viewMode,
    ibdDsl: requirement.dsl_IBD || '',
    flowGraphRef,
    dslContentRef,
    graphDataRef,
    pendingCanvasDataRef,
    setViewMode,
    setGraphData,
    setDslContent,
    setDslLoading,
    setDslError,
    setGraphError,
  })

  const clearCurrentDraft = useCallback(() => {
    if (isDialogMap) return
    if (!draftProjectScope) return

    clearDimensionEditorDraft(draftProjectScope, draftUserId, requirement.id, sectionKey)
    restoredDraftRef.current = false
  }, [draftProjectScope, draftUserId, isDialogMap, requirement.id, sectionKey])

  const {
    handleSave,
    handleContentChange,
    handleDslContentChange,
    handleGuardedBack,
  } = useUnsavedChangesGuard({
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
    onSnapshotSaved: clearCurrentDraft,
    onDiscardUnsavedChanges: clearCurrentDraft,
  })

  const handleGraphChange = useCallback((data: object) => {
    graphDataRef.current = data
    setGraphData(data)
  }, [])

  const handleSwitchToDsl = useCallback(async () => {
    const nextDslContent = await convertGraphToDsl()
    if (nextDslContent !== null) {
      applyDslView(nextDslContent)
    }
  }, [applyDslView, convertGraphToDsl])

  const handleSwitchToVisual = useCallback(async () => {
    const convertedVisualData = await convertDslToVisual()
    if (convertedVisualData !== null) {
      applyVisualView(convertedVisualData)
    }
  }, [applyVisualView, convertDslToVisual])

  const restoreDraftSnapshot = useCallback((snapshot: EditorSnapshot, restoredViewMode: ViewMode) => {
    const nextGraphData = cloneSerializableData(snapshot.graphData)

    restoredDraftRef.current = true
    contentRef.current = snapshot.content
    dslContentRef.current = snapshot.dslContent
    graphDataRef.current = nextGraphData
    pendingCanvasDataRef.current = null
    setContent(snapshot.content)
    setDslContent(snapshot.dslContent)
    setGraphData(nextGraphData)
    setViewMode(restoredViewMode)
    flowGraphRef.current?.loadData(nextGraphData)
  }, [
    contentRef,
    dslContentRef,
    flowGraphRef,
    graphDataRef,
    pendingCanvasDataRef,
    setContent,
    setDslContent,
    setGraphData,
    setViewMode,
  ])

  const saveCurrentDraft = useCallback(() => {
    if (isDialogMap) return
    if (!draftProjectScope) return

    saveDimensionEditorDraft(draftProjectScope, draftUserId, requirement.id, sectionKey, {
      baseRequirementUpdatedAt: requirement.updated_at,
      viewMode,
      snapshot: createEditorSnapshot(
        contentRef.current,
        dslContentRef.current,
        graphDataRef.current,
      ),
    })
  }, [draftProjectScope, draftUserId, isDialogMap, requirement.id, requirement.updated_at, sectionKey, viewMode])

  useEffect(() => {
    if (isDialogMap) return
    if (!draftProjectScope) return

    const promptKey = `${draftUserId}:${draftProjectScope}:${requirement.id}:${sectionKey}`
    if (draftPromptKeyRef.current === promptKey) return
    draftPromptKeyRef.current = promptKey

    const draft = readDimensionEditorDraft(draftProjectScope, draftUserId, requirement.id, sectionKey)
    if (!draft) return

    const hasRemoteChanged = Boolean(
      draft.baseRequirementUpdatedAt
      && requirement.updated_at
      && draft.baseRequirementUpdatedAt !== requirement.updated_at,
    )

    Modal.confirm({
      title: '检测到未保存的维度编辑草稿',
      content: hasRemoteChanged
        ? '检测到本地草稿，但服务端数据可能已更新。是否仍恢复异常关闭前的编辑内容？'
        : '是否恢复上次异常关闭前正在编辑的维度内容？',
      okText: '恢复草稿',
      cancelText: '丢弃草稿',
      centered: true,
      onOk: () => {
        restoreDraftSnapshot(draft.snapshot, draft.viewMode)
      },
      onCancel: () => {
        clearCurrentDraft()
      },
    })
  }, [
    clearCurrentDraft,
    draftProjectScope,
    draftUserId,
    requirement.id,
    requirement.updated_at,
    restoreDraftSnapshot,
    sectionKey,
    isDialogMap,
  ])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const timer = setTimeout(saveCurrentDraft, 800)
    return () => clearTimeout(timer)
  }, [hasUnsavedChanges, saveCurrentDraft])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    window.addEventListener('beforeunload', saveCurrentDraft)
    return () => window.removeEventListener('beforeunload', saveCurrentDraft)
  }, [hasUnsavedChanges, saveCurrentDraft])

  useEffect(() => {
    if (viewMode !== 'visual') return
    const pending = pendingCanvasDataRef.current
    if (!pending) return

    const applyCanvasData = () => {
      const graph = flowGraphRef.current?.getGraph()
      if (graph) {
        ;(graph as any).canvasData = pending
        graph.trigger('canvas:change:data', { data: pending })
        pendingCanvasDataRef.current = null
      }
    }

    const timer = setTimeout(applyCanvasData, 100)
    return () => clearTimeout(timer)
  }, [viewMode])

  useEffect(() => {
    if (!config.graphField) return
    if (hasUnsavedChanges || restoredDraftRef.current) return

    const remoteGraph = (requirement[config.graphField] as object) || {}
    const remoteStr = JSON.stringify(remoteGraph)
    const localStr = JSON.stringify(graphDataRef.current)

    if (remoteStr !== localStr && remoteStr !== '{}') {
      message.info('其他用户更新了图数据，已自动同步')
      graphDataRef.current = remoteGraph
      setGraphData(remoteGraph)
      updateSavedSnapshot({ graphData: remoteGraph })
      flowGraphRef.current?.loadData(remoteGraph)
    }
  }, [hasUnsavedChanges, requirement, config.graphField, updateSavedSnapshot])

  useEffect(() => {
    if (!config.dslField) return
    if (hasUnsavedChanges || restoredDraftRef.current) return

    const remoteDsl = (requirement[config.dslField] as string) || ''
    if (remoteDsl && remoteDsl !== dslContentRef.current) {
      message.info('其他用户更新了 DSL 数据，已自动同步')
      dslContentRef.current = remoteDsl
      setDslContent(remoteDsl)
      updateSavedSnapshot({ dslContent: remoteDsl })
    }
  }, [hasUnsavedChanges, requirement, config.dslField, updateSavedSnapshot])

  const handleDownloadJSON = useCallback(() => {
    const graph = flowGraphRef.current?.getGraph()
    if (!graph) return

    const jsonData = modelStrategy.exportGraphToJSON(graph)
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sectionKey || 'graph'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [modelStrategy, sectionKey])

  const handlePrintRBG = useCallback(() => {
    const graph = flowGraphRef.current?.getGraph()
    console.log(graph)
    if (!graph) return

    if (sectionKey === 'internalConstraints') {
      const rbgData = exportGraphToRBG(graph, requirement.id, content)
      console.log('======  OUTPUT RUN RESULT: exportGraphToRBG ======')
      console.log(rbgData)
      message.success('打印成功！请按 F12 打开开发者工具控制台查看')
    } else {
      message.warning('仅支持内部约束画布使用该函数')
    }
  }, [content, requirement.id, sectionKey])

  const getEditorPopupContainer = useCallback(() => {
    if (isFullscreen && editorGroupRef.current) {
      return editorGroupRef.current
    }

    return document.body
  }, [isFullscreen])

  const toolbarContent = (
    <div className="dimension-editor-actions">
      {viewMode === 'visual' && (
        <>
          {sectionKey === 'internalConstraints' && (
            <Button
              size="small"
              onClick={handlePrintRBG}
              title="在控制台打印生成的 RBG 格式 JSON"
            >
              控制台打印 RBG
            </Button>
          )}
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleDownloadJSON}
          >
            导出 JSON
          </Button>
        </>
      )}
      <Button
        size="small"
        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        onClick={() => setIsFullscreen((current) => !current)}
        title={isFullscreen ? '退出全屏' : '全屏'}
      />
    </div>
  )

  return (
    <div className="dimension-editor">
      <div className="dimension-editor-header">
        <Button icon={<ArrowLeftOutlined />} onClick={handleGuardedBack} type="text">
          返回概览
        </Button>
        <h2>
          <span className={`dimension-code tag-${config.dimensionCode}`}>{config.dimensionCode}</span>
          {config.label}
        </h2>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          className={hasUnsavedChanges ? 'dimension-save-btn--dirty' : undefined}
        >
          保存
        </Button>
      </div>

      <div className="dimension-editor-content">
        <div className="editor-group">
          <label>内容描述</label>
          <textarea
            className="editor-textarea"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={`请输入${config.label}详细内容...`}
          />
        </div>

        <DimensionModelingSurface
          sectionKey={sectionKey}
          viewMode={viewMode}
          graphData={graphData}
          dslContent={dslContent}
          dslLoading={dslLoading}
          dslError={dslError}
          graphError={graphError}
          flowGraphRef={flowGraphRef}
          editorGroupRef={editorGroupRef}
          isFullscreen={isFullscreen}
          toolbarContent={toolbarContent}
          getPopupContainer={getEditorPopupContainer}
          onSwitchToDsl={handleSwitchToDsl}
          onSwitchToVisual={handleSwitchToVisual}
          onGraphChange={handleGraphChange}
          onDslContentChange={handleDslContentChange}
          onDismissDslError={handleDismissError}
          onDismissGraphError={handleDismissGraphError}
        />
      </div>
    </div>
  )
}

function DimensionEditor(props: DimensionEditorProps) {
  if (props.mode === 'artifact') {
    return <ArtifactDimensionEditor {...props} />
  }

  return <RequirementDimensionEditor {...props} />
}

export default DimensionEditor
export type { SectionKey }
