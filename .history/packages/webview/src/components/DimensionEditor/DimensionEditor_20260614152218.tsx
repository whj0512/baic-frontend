import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, message } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DownloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import FlowGraph, { type FlowGraphRef } from '../graph'
import DslEditor from '../dsl-editor'
import { getModelStrategy } from '../../models/strategies'
import { exportGraphToRBG } from '../../models/strategies/internalConstraints/exportGraph'
import { SECTION_CONFIG } from './dimensionEditorConfig'
import { useDimensionEditorConversions } from './useDimensionEditorConversions'
import { useDimensionEditorSnapshot } from './useDimensionEditorSnapshot'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'
import type { DimensionEditorProps, SectionKey, ViewMode } from './types'
import './DimensionEditor.css'

function DimensionEditor({ requirement, sectionKey, onBack, onSave }: DimensionEditorProps) {
  const config = SECTION_CONFIG[sectionKey]
  const modelStrategy = getModelStrategy(sectionKey)

  const initialGraphData = (requirement[config.graphField] as object) || {}
  const initialDslContent = (requirement[config.dslField] as string) || ''
  const initialContent = requirement.nl_text || ''

  const [content, setContent] = useState(initialContent)
  const [graphData, setGraphData] = useState(initialGraphData)
  const [viewMode, setViewMode] = useState<ViewMode>('dsl')
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

  const {
    handleSave,
    handleContentChange,
    handleDslContentChange,
    handleGuardedBack,
    handleSwitchToDsl,
    handleSwitchToVisual,
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
    setDslError,
    setGraphError,
    setViewMode,
    viewMode,
  })

  const handleGraphChange = useCallback((data: object) => {
    graphDataRef.current = data
    setGraphData(data)
  }, [])

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
    const remoteGraph = (requirement[config.graphField] as object) || {}
    const remoteStr = JSON.stringify(remoteGraph)
    const localStr = JSON.stringify(graphDataRef.current)

    if (remoteStr !== localStr && remoteStr !== '{}') {
      message.info('其他用户更新了图数据，已自动同步')
      graphDataRef.current = remoteGraph
      setGraphData(remoteGraph)
      updateSavedSnapshot({ graphData: remoteGraph })
      const graph = flowGraphRef.current?.getGraph()
      if (graph) graph.fromJSON(remoteGraph)
    }
  }, [requirement, config.graphField, updateSavedSnapshot])

  useEffect(() => {
    const remoteDsl = (requirement[config.dslField] as string) || ''
    if (remoteDsl && remoteDsl !== dslContent) {
      message.info('其他用户更新了 DSL 数据，已自动同步')
      dslContentRef.current = remoteDsl
      setDslContent(remoteDsl)
      updateSavedSnapshot({ dslContent: remoteDsl })
    }
  }, [requirement, config.dslField, dslContent, updateSavedSnapshot])

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

        <div className={`editor-group${isFullscreen ? ' editor-group--fullscreen' : ''}`}>
          <div className="editor-group-header">
            <div className="editor-view-tabs">
              <label
                className={`editor-view-tab ${viewMode === 'dsl' ? 'active' : ''}`}
                onClick={handleSwitchToDsl}
              >
                DSL语言描述
              </label>
              <label
                className={`editor-view-tab ${viewMode === 'visual' ? 'active' : ''}`}
                onClick={handleSwitchToVisual}
              >
                可视化模型(Flow/Logic)
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                onClick={() => setIsFullscreen((f) => !f)}
                title={isFullscreen ? '退出全屏' : '全屏'}
              />
            </div>
          </div>
          <div className="editor-canvas-container">
            {viewMode === 'visual' ? (
              <FlowGraph
                ref={flowGraphRef}
                sectionKey={sectionKey}
                data={graphData}
                onChange={handleGraphChange}
                errorMessage={graphError}
                onDismissError={handleDismissGraphError}
              />
            ) : (
              <DslEditor
                sectionKey={sectionKey}
                value={dslContent}
                loading={dslLoading}
                error={dslError}
                onDismissError={handleDismissError}
                readOnly={false}
                onChange={handleDslContentChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DimensionEditor
export type { SectionKey }
