import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, message, Modal } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DownloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import type { FlowGraphRef } from '../graph'
import { getModelStrategy } from '../../models/strategies'
import type { ModelStrategy } from '../../models/strategies'
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

type PreparedGraphData = {
  graphData: object
  canvasData: Record<string, any> | null
  error?: string
}

const isRecord = (value: unknown): value is Record<string, any> => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
)

const getCanvasData = (graphData: object): Record<string, any> | null => {
  if (!isRecord(graphData) || !isRecord(graphData.canvasData)) return null
  return graphData.canvasData
}

const isLegacyX6GraphData = (graphData: object) => (
  isRecord(graphData) && Array.isArray(graphData.cells)
)

const createEmptyEditorGraph = (modelStrategy: ModelStrategy, modelName: string) => (
  modelStrategy.createEmptyGraphData?.({ modelName }) ?? { cells: [] }
)

const prepareModelGraphData = (
  sourceGraph: object,
  modelStrategy: ModelStrategy,
  modelName: string,
  dimensionLabel: string,
): PreparedGraphData => {
  if (!Object.keys(sourceGraph).length) {
    const graphData = createEmptyEditorGraph(modelStrategy, modelName)
    return { graphData, canvasData: getCanvasData(graphData) }
  }

  try {
    const graphData = isLegacyX6GraphData(sourceGraph)
      ? sourceGraph
      : modelStrategy.importGraphFromJSON(
        JSON.stringify(sourceGraph),
        { modelName },
      )
    return { graphData, canvasData: getCanvasData(graphData) }
  } catch (error) {
    const graphData = createEmptyEditorGraph(modelStrategy, modelName)
    return {
      graphData,
      canvasData: getCanvasData(graphData),
      error: error instanceof Error ? error.message : `${dimensionLabel}图数据无效`,
    }
  }
}

function RequirementDimensionEditor({
  draftProjectScope,
  requirement,
  sectionKey,
  model,
  modelIdentity,
  ibdDsl,
  visualDisabledReason,
  onBack,
  onSave,
  onPersist,
}: RequirementDimensionEditorProps) {
  const config = SECTION_CONFIG[sectionKey]
  const modelStrategy = getModelStrategy(sectionKey)
  const draftUserId = getDraftUserId()

  const rawInitialGraphData = model
    ? (model.graph_json ?? {})
    : (config.graphField ? (requirement[config.graphField] as object) : {}) || {}
  const initialDslContent = model
    ? (model.dsl_text ?? '')
    : (config.dslField ? (requirement[config.dslField] as string) : '') || ''
  const initialContent = model ? '' : (requirement.nl_text || '')
  const preparedInitialGraph = useMemo(() => {
    if (!model) {
      return {
        graphData: rawInitialGraphData,
        canvasData: getCanvasData(rawInitialGraphData),
        error: undefined,
      }
    }

    return prepareModelGraphData(
      rawInitialGraphData,
      modelStrategy,
      model.name,
      config.label,
    )
  }, [config.label, model, modelStrategy, rawInitialGraphData])
  const initialGraphData = preparedInitialGraph.graphData

  const [content, setContent] = useState(initialContent)
  const [graphData, setGraphData] = useState(initialGraphData)
  const [viewMode, setViewMode] = useState<ViewMode>('dsl')
  const [dslContent, setDslContent] = useState(initialDslContent)
  const [dslLoading, setDslLoading] = useState(false)
  const [dslError, setDslError] = useState<string | undefined>()
  const [graphError, setGraphError] = useState<string | undefined>(preparedInitialGraph.error)
  const [saving, setSaving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const contentRef = useRef(initialContent)
  const graphDataRef = useRef<object>(initialGraphData)
  const serializedGraphDataRef = useRef<object | null>(model?.graph_json ?? null)
  const dslContentRef = useRef(initialDslContent)
  const flowGraphRef = useRef<FlowGraphRef | null>(null)
  const pendingCanvasDataRef = useRef<Record<string, any> | null>(preparedInitialGraph.canvasData)
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
    initialSerializedGraphData: model?.graph_json ?? null,
    content,
    dslContent,
    graphData,
    contentRef,
    dslContentRef,
    graphDataRef,
    serializedGraphDataRef,
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
    ibdDsl: ibdDsl ?? (model ? '' : requirement.dsl_IBD || ''),
    flowGraphRef,
    dslContentRef,
    graphDataRef,
    serializedGraphDataRef,
    pendingCanvasDataRef,
    setViewMode,
    setGraphData,
    setDslContent,
    setDslLoading,
    setDslError,
    setGraphError,
  })

  const clearCurrentDraft = useCallback(() => {
    if (!draftProjectScope) return

    clearDimensionEditorDraft(draftProjectScope, draftUserId, requirement.id, sectionKey, modelIdentity)
    restoredDraftRef.current = false
  }, [draftProjectScope, draftUserId, modelIdentity, requirement.id, sectionKey])

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
    onSnapshotSaved: clearCurrentDraft,
    onDiscardUnsavedChanges: clearCurrentDraft,
    persistDisabledReason: visualDisabledReason,
    modelBacked: Boolean(model),
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
    if (visualDisabledReason) return
    const convertedVisualData = await convertDslToVisual()
    if (convertedVisualData !== null) {
      applyVisualView(convertedVisualData)
    }
  }, [applyVisualView, convertDslToVisual, visualDisabledReason])

  const restoreDraftSnapshot = useCallback((snapshot: EditorSnapshot, restoredViewMode: ViewMode) => {
    const nextGraphData = cloneSerializableData(snapshot.graphData)

    restoredDraftRef.current = true
    contentRef.current = snapshot.content
    dslContentRef.current = snapshot.dslContent
    graphDataRef.current = nextGraphData
    serializedGraphDataRef.current = snapshot.serializedGraphData ?? null
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
    serializedGraphDataRef,
    pendingCanvasDataRef,
    setContent,
    setDslContent,
    setGraphData,
    setViewMode,
  ])

  const saveCurrentDraft = useCallback(() => {
    if (!draftProjectScope) return

    const pendingGraphData = flowGraphRef.current?.flushChanges()
    if (pendingGraphData) graphDataRef.current = pendingGraphData

    saveDimensionEditorDraft(draftProjectScope, draftUserId, requirement.id, sectionKey, modelIdentity, {
      modelIdentityKind: model ? ('clientId' in model ? 'draft' : 'persisted') : undefined,
      dimensionCode: model?.dimension_code,
      baseRequirementUpdatedAt: requirement.updated_at,
      baseModelUpdatedAt: model && 'updated_at' in model ? model.updated_at : undefined,
      modelName: model?.name,
      modelType: model?.model_type ?? null,
      modelKey: model?.model_key,
      contextModelGroupId: model?.context_model_group_id ?? null,
      modelIsPrimary: model?.is_primary,
      modelSortOrder: model?.sort_order,
      viewMode,
      snapshot: createEditorSnapshot(
        contentRef.current,
        dslContentRef.current,
        graphDataRef.current,
        serializedGraphDataRef.current,
      ),
    })
  }, [draftProjectScope, draftUserId, flowGraphRef, graphDataRef, model, modelIdentity, requirement.id, requirement.updated_at, sectionKey, viewMode])

  useEffect(() => {
    if (!draftProjectScope) return
    if (model && 'clientId' in model) return

    const promptKey = `${draftUserId}:${draftProjectScope}:${requirement.id}:${sectionKey}:${modelIdentity ?? ''}`
    if (draftPromptKeyRef.current === promptKey) return
    draftPromptKeyRef.current = promptKey

    const draft = readDimensionEditorDraft(draftProjectScope, draftUserId, requirement.id, sectionKey, modelIdentity)
    if (!draft) return

    const hasRemoteChanged = Boolean(
      (draft.baseModelUpdatedAt && model && 'updated_at' in model && draft.baseModelUpdatedAt !== model.updated_at)
      || (draft.baseRequirementUpdatedAt
        && requirement.updated_at
        && draft.baseRequirementUpdatedAt !== requirement.updated_at),
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
    model,
    modelIdentity,
    restoreDraftSnapshot,
    sectionKey,
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
        graph.trigger('canvas:change:data', { data: pending, initial: true })
        pendingCanvasDataRef.current = null
      }
    }

    const timer = setTimeout(applyCanvasData, 100)
    return () => clearTimeout(timer)
  }, [viewMode])

  useEffect(() => {
    if (!config.graphField && !model) return
    if (hasUnsavedChanges || restoredDraftRef.current) return

    const remoteGraph = model
      ? (model.graph_json ?? {})
      : (config.graphField ? (requirement[config.graphField] as object) : {}) || {}
    const remoteStr = JSON.stringify(remoteGraph)
    const localStr = JSON.stringify(model ? serializedGraphDataRef.current : graphDataRef.current)

    if (remoteStr !== localStr) {
      let nextGraph = remoteGraph
      let nextCanvasData: Record<string, any> | null = null
      if (model) {
        const preparedGraph = prepareModelGraphData(
          remoteGraph,
          modelStrategy,
          model.name,
          config.label,
        )
        if (preparedGraph.error) {
          setGraphError(preparedGraph.error)
          return
        }
        nextGraph = preparedGraph.graphData
        nextCanvasData = preparedGraph.canvasData
        setGraphError(undefined)
      }
      message.info('其他用户更新了图数据，已自动同步')
      graphDataRef.current = nextGraph
      serializedGraphDataRef.current = model ? remoteGraph : null
      pendingCanvasDataRef.current = nextCanvasData
      setGraphData(nextGraph)
      updateSavedSnapshot({
        graphData: nextGraph,
        ...(model ? { serializedGraphData: remoteGraph } : {}),
      })
      flowGraphRef.current?.loadData(nextGraph)
      const graph = flowGraphRef.current?.getGraph()
      if (graph && nextCanvasData) {
        ;(graph as any).canvasData = nextCanvasData
        graph.trigger('canvas:change:data', { data: nextCanvasData, initial: true })
        pendingCanvasDataRef.current = null
      }
    }
  }, [config.graphField, config.label, hasUnsavedChanges, model, modelStrategy, requirement, updateSavedSnapshot])

  useEffect(() => {
    if (!config.dslField && !model) return
    if (hasUnsavedChanges || restoredDraftRef.current) return

    const remoteDsl = model
      ? (model.dsl_text ?? '')
      : (config.dslField ? (requirement[config.dslField] as string) : '') || ''
    if (remoteDsl !== dslContentRef.current) {
      message.info('其他用户更新了 DSL 数据，已自动同步')
      dslContentRef.current = remoteDsl
      setDslContent(remoteDsl)
      updateSavedSnapshot({ dslContent: remoteDsl })
    }
  }, [hasUnsavedChanges, requirement, model, config.dslField, updateSavedSnapshot])

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
        <div className="dimension-editor-heading">
          <h2>
            <span className={`dimension-code tag-${config.dimensionCode}`}>{config.dimensionCode}</span>
            {config.label}{model ? ` / ${model.name}` : ''}
          </h2>
          {model && (
            <div className="dimension-editor-model-meta">
              <span>{model.model_type || '未设置类型'}</span>
              <code>{model.model_key}</code>
              {model.is_primary && <span className="dimension-editor-primary-badge">主模型</span>}
            </div>
          )}
        </div>
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
        {!model && <div className="editor-group">
          <label>内容描述</label>
          <textarea
            className="editor-textarea"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={`请输入${config.label}详细内容...`}
          />
        </div>}

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
          visualDisabledReason={visualDisabledReason}
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
