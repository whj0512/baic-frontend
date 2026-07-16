import { useMemo, useState } from 'react'
import { Button, Empty } from 'antd'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  LockOutlined,
} from '@ant-design/icons'
import type { Requirement } from '../../models/Requirement'
import DslEditor from '../dsl-editor'
import FlowGraph from '../graph'
import { SECTION_CONFIG } from '../DimensionEditor/dimensionEditorConfig'
import type { SectionKey, ViewMode } from '../DimensionEditor/types'
import '../DimensionEditor/DimensionEditor.css'
import './ReadonlyDimensionViewer.css'

interface ReadonlyDimensionViewerProps {
  requirement: Requirement
  sectionKey: SectionKey
  onBack: () => void
}

type DialogMapRequirement = Requirement & {
  graph_DialogMap?: object
  dsl_DialogMap?: string
}

function ReadonlyDimensionViewer({ requirement, sectionKey, onBack }: ReadonlyDimensionViewerProps) {
  const config = SECTION_CONFIG[sectionKey]
  const isDialogMap = sectionKey === 'dialogMap'
  const [viewMode, setViewMode] = useState<ViewMode>(isDialogMap ? 'visual' : 'dsl')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const graphData = useMemo(() => {
    if (config.graphField) return requirement[config.graphField] as object | undefined
    return (requirement as DialogMapRequirement).graph_DialogMap
  }, [config.graphField, requirement])

  const dslContent = useMemo(() => {
    if (config.dslField) return requirement[config.dslField] as string | undefined
    return (requirement as DialogMapRequirement).dsl_DialogMap
  }, [config.dslField, requirement])

  const downloadGraph = () => {
    if (!graphData) return
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${requirement.name}-${config.dimensionCode}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="dimension-editor readonly-dimension-viewer">
      <div className="dimension-editor-header">
        <div className="readonly-viewer-title">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} title="返回需求概览" />
          <h2>
            <span className={`dimension-code tag-${config.dimensionCode}`}>{config.dimensionCode}</span>
            {config.label}
          </h2>
        </div>
        <span className="readonly-viewer-badge"><LockOutlined /> 只读快照</span>
      </div>

      <div className="dimension-editor-content readonly-dimension-content">
        <div className={`editor-group readonly-editor-group${isFullscreen ? ' editor-group--fullscreen' : ''}`}>
          <div className="editor-group-header">
            <div className="editor-view-tabs" role="tablist" aria-label="模型查看方式">
              {!isDialogMap && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'dsl'}
                  className={`editor-view-tab${viewMode === 'dsl' ? ' active' : ''}`}
                  onClick={() => setViewMode('dsl')}
                >
                  DSL
                </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'visual'}
                className={`editor-view-tab${viewMode === 'visual' ? ' active' : ''}`}
                onClick={() => setViewMode('visual')}
              >
                可视化模型(Flow/Logic)
              </button>
            </div>
            <div className="readonly-viewer-actions">
              {viewMode === 'visual' && graphData && (
                <Button size="small" icon={<DownloadOutlined />} onClick={downloadGraph}>
                  导出 JSON
                </Button>
              )}
              <Button
                size="small"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={() => setIsFullscreen(current => !current)}
                title={isFullscreen ? '退出全屏' : '全屏'}
              />
            </div>
          </div>
          <div className="editor-canvas-container">
            {viewMode === 'visual' ? (
              graphData && Object.keys(graphData).length > 0 ? (
                <FlowGraph
                  key={`${requirement.id}-${sectionKey}`}
                  sectionKey={sectionKey}
                  data={graphData}
                  readOnly
                />
              ) : (
                <Empty description="该版本没有可视化图形" />
              )
            ) : dslContent ? (
              <DslEditor sectionKey={sectionKey} value={dslContent} readOnly />
            ) : (
              <Empty description="该版本没有 DSL 内容" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReadonlyDimensionViewer
