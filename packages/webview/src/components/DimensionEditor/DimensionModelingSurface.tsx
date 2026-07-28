import type { ReactNode, RefObject } from 'react'
import { ConfigProvider } from 'antd'
import FlowGraph, { type FlowGraphRef } from '../graph'
import DslEditor from '../dsl-editor'
import type { SectionKey, ViewMode } from './types'

interface DimensionModelingSurfaceProps {
  sectionKey: SectionKey
  viewMode: ViewMode
  graphData: object
  dslContent: string
  dslLoading: boolean
  dslError?: string
  graphError?: string
  flowGraphRef: RefObject<FlowGraphRef | null>
  editorGroupRef: RefObject<HTMLDivElement | null>
  isFullscreen?: boolean
  artifactMode?: boolean
  visualDisabledReason?: string
  navigationContent?: ReactNode
  toolbarContent?: ReactNode
  getPopupContainer: () => HTMLElement
  onSwitchToDsl: () => Promise<void>
  onSwitchToVisual: () => Promise<void>
  onGraphChange: (data: object) => void
  onDslContentChange: (value: string) => void
  onDismissDslError: () => void
  onDismissGraphError: () => void
}

function DimensionModelingSurface({
  sectionKey,
  viewMode,
  graphData,
  dslContent,
  dslLoading,
  dslError,
  graphError,
  flowGraphRef,
  editorGroupRef,
  isFullscreen = false,
  artifactMode = false,
  visualDisabledReason,
  navigationContent,
  toolbarContent,
  getPopupContainer,
  onSwitchToDsl,
  onSwitchToVisual,
  onGraphChange,
  onDslContentChange,
  onDismissDslError,
  onDismissGraphError,
}: DimensionModelingSurfaceProps) {
  return (
    <ConfigProvider getPopupContainer={getPopupContainer}>
      <div
        ref={editorGroupRef}
        className={[
          'editor-group',
          'dimension-modeling-surface',
          artifactMode ? 'dimension-modeling-surface--artifact' : '',
          isFullscreen ? 'editor-group--fullscreen' : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="editor-group-header">
          {navigationContent}
          <div
            className="editor-view-tabs"
            role="tablist"
            aria-label="建模制品视图"
          >
            <button
              type="button"
              role="tab"
              className={`editor-view-tab ${viewMode === 'dsl' ? 'active' : ''}`}
              aria-selected={viewMode === 'dsl'}
              onClick={() => void onSwitchToDsl()}
            >
              {artifactMode ? 'DSL 语言描述' : 'DSL语言描述'}
            </button>
            <button
              type="button"
              role="tab"
              className={`editor-view-tab ${viewMode === 'visual' ? 'active' : ''}`}
              aria-selected={viewMode === 'visual'}
              disabled={Boolean(visualDisabledReason)}
              title={visualDisabledReason}
              onClick={() => void onSwitchToVisual()}
            >
              {artifactMode ? '可视化模型' : '可视化模型(Flow/Logic)'}
            </button>
          </div>
          {toolbarContent}
        </div>
        <div className="editor-canvas-container">
          {viewMode === 'visual' ? (
            <FlowGraph
              ref={flowGraphRef}
              sectionKey={sectionKey}
              data={graphData}
              onChange={onGraphChange}
              errorMessage={graphError}
              onDismissError={onDismissGraphError}
            />
          ) : (
            <DslEditor
              sectionKey={sectionKey}
              value={dslContent}
              loading={dslLoading}
              error={dslError}
              onDismissError={onDismissDslError}
              readOnly={false}
              onChange={onDslContentChange}
            />
          )}
        </div>
      </div>
    </ConfigProvider>
  )
}

export default DimensionModelingSurface
