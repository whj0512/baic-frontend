import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type { FlowGraphRef } from '../graph'
import { getModelStrategy } from '../../models/strategies'
import { cloneSerializableData } from './snapshot'
import { SECTION_CONFIG } from './dimensionEditorConfig'
import DimensionModelingSurface from './DimensionModelingSurface'
import { useDimensionEditorConversions } from './useDimensionEditorConversions'
import type {
  ArtifactDimensionEditorProps,
  DimensionArtifactDraft,
  ViewMode,
} from './types'

function ArtifactDimensionEditor({
  sectionKey,
  initialDslContent,
  initialGraphData = {},
  ibdDsl = '',
  visualDisabledReason,
  onBack,
  onDraftChange,
}: ArtifactDimensionEditorProps) {
  const config = SECTION_CONFIG[sectionKey]
  const modelStrategy = getModelStrategy(sectionKey)
  const initialGraphRef = useRef(cloneSerializableData(initialGraphData))
  const [graphData, setGraphData] = useState<object>(initialGraphRef.current)
  const [viewMode, setViewMode] = useState<ViewMode>('dsl')
  const [dslContent, setDslContent] = useState(initialDslContent)
  const [dslLoading, setDslLoading] = useState(false)
  const [dslError, setDslError] = useState<string | undefined>()
  const [graphError, setGraphError] = useState<string | undefined>()

  const graphDataRef = useRef<object>(initialGraphRef.current)
  const dslContentRef = useRef(initialDslContent)
  const flowGraphRef = useRef<FlowGraphRef | null>(null)
  const pendingCanvasDataRef = useRef<Record<string, any> | null>(null)
  const editorGroupRef = useRef<HTMLDivElement | null>(null)

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
    ibdDsl,
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

  const publishDraft = useCallback((
    nextDslContent: string,
    nextGraphData: object,
  ) => {
    onDraftChange?.({
      dslContent: nextDslContent,
      graphData: nextGraphData,
    })
  }, [onDraftChange])

  const handleGraphChange = useCallback((data: object) => {
    graphDataRef.current = data
    setGraphData(data)
    publishDraft(dslContentRef.current, data)
  }, [publishDraft])

  const handleDslContentChange = useCallback((value: string) => {
    dslContentRef.current = value
    setDslContent(value)
    publishDraft(value, graphDataRef.current)
  }, [publishDraft])

  const handleSwitchToDsl = useCallback(async () => {
    const nextDslContent = await convertGraphToDsl()
    if (nextDslContent !== null) {
      applyDslView(nextDslContent)
      publishDraft(nextDslContent, graphDataRef.current)
    }
  }, [applyDslView, convertGraphToDsl, publishDraft])

  const handleSwitchToVisual = useCallback(async () => {
    if (visualDisabledReason) return

    const convertedVisualData = await convertDslToVisual()
    if (convertedVisualData !== null) {
      applyVisualView(convertedVisualData)
      publishDraft(dslContentRef.current, convertedVisualData.cellsData)
    }
  }, [
    applyVisualView,
    convertDslToVisual,
    publishDraft,
    visualDisabledReason,
  ])

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

  const getEditorPopupContainer = useCallback(
    () => editorGroupRef.current ?? document.body,
    [],
  )

  const toolbarContent = (
    <div className="dimension-editor-artifact-status" aria-live="polite">
      <span>临时编辑，不会保存到需求</span>
      {visualDisabledReason && <strong>{visualDisabledReason}</strong>}
    </div>
  )

  return (
    <div className="dimension-editor dimension-editor--artifact">
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
        artifactMode
        visualDisabledReason={visualDisabledReason}
        navigationContent={onBack && (
          <button
            type="button"
            className="dimension-editor-artifact-back"
            onClick={onBack}
          >
            <ArrowLeftOutlined />
            <span>返回需求概览</span>
          </button>
        )}
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
  )
}

export default ArtifactDimensionEditor
