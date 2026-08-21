import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { Alert, Button, Card, Spin } from 'antd'
import {
  FullscreenExitOutlined,
  FullscreenOutlined,
} from '@ant-design/icons'
import type { GraphData } from '@antv/g6'
import type { GraphElementPanelData } from '../graph-renderers/G6PropertiesPanel'
import type { RequirementNodeLookupState } from '../requirementNodeLookup'

const AntvG6GraphRenderer = lazy(
  () => import('../graph-renderers/AntvG6GraphRenderer'),
)

interface RelationshipGraphViewportProps {
  graphData: GraphData
  visibleEdgeIds: string[]
  edgeLabelsVisible: boolean
  focusNode: string | null
  layoutRevision: number
  expandingNodeId: string | null
  requirementLookupState: RequirementNodeLookupState
  loading: boolean
  queryError: string | null
  hasMeta: boolean
  onNodeDoubleClick: (nodeId: string) => void
  onPanelDataChange: (panelData: GraphElementPanelData | null) => void
  onOpenRequirement?: (requirementId: string) => void
  onRetryRequirementLookup: () => void
  onDismissError: () => void
}

function RelationshipGraphViewport({
  graphData,
  visibleEdgeIds,
  edgeLabelsVisible,
  focusNode,
  layoutRevision,
  expandingNodeId,
  requirementLookupState,
  loading,
  queryError,
  hasMeta,
  onNodeDoubleClick,
  onPanelDataChange,
  onOpenRequirement,
  onRetryRequirementLookup,
  onDismissError,
}: RelationshipGraphViewportProps) {
  const [isContentFullscreen, setIsContentFullscreen] = useState(false)
  const [graphRendering, setGraphRendering] = useState(false)
  const [layoutAnimating, setLayoutAnimating] = useState(false)

  const handleGraphRenderStateChange = useCallback((rendering: boolean, animated: boolean) => {
    setGraphRendering(rendering)
    setLayoutAnimating(rendering && animated)
  }, [])

  useEffect(() => {
    if (!isContentFullscreen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsContentFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isContentFullscreen])

  const hasGraphData = (graphData.nodes?.length || 0) > 0
  const busy = loading || graphRendering
  const showLoadingOverlay = loading || (graphRendering && !layoutAnimating)
  const emptyText = queryError && !hasMeta ? '关系图加载失败' : '没有符合条件的关系数据'

  return (
    <div
      className={`req-relationship-content${
        isContentFullscreen ? ' req-relationship-content--fullscreen' : ''
      }`}
      role={isContentFullscreen ? 'dialog' : undefined}
      aria-modal={isContentFullscreen ? true : undefined}
      aria-label={isContentFullscreen ? '需求间关系全屏视图' : undefined}
    >
      <Button
        className="req-relationship-fullscreen-btn"
        size="small"
        icon={isContentFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        aria-label={isContentFullscreen ? '退出全屏' : '全屏查看'}
        aria-pressed={isContentFullscreen}
        title={isContentFullscreen ? '退出全屏（Esc）' : '全屏查看'}
        onClick={() => setIsContentFullscreen(current => !current)}
      />
      <Card className="req-relationship-card">
        {hasGraphData ? (
          <Suspense
            fallback={(
              <div className="req-relationship-loading-overlay">
                <Spin size="large" />
                <span>正在加载图渲染模块</span>
              </div>
            )}
          >
            <AntvG6GraphRenderer
              graphData={graphData}
              visibleEdgeIds={visibleEdgeIds}
              edgeLabelsVisible={edgeLabelsVisible}
              focusNode={focusNode}
              layoutRevision={layoutRevision}
              expandingNodeId={expandingNodeId}
              requirementLookupState={requirementLookupState}
              onNodeDoubleClick={onNodeDoubleClick}
              onPanelDataChange={onPanelDataChange}
              onOpenRequirement={onOpenRequirement}
              onRetryRequirementLookup={onRetryRequirementLookup}
              onRenderStateChange={handleGraphRenderStateChange}
            />
          </Suspense>
        ) : (
          !busy && <div className="empty-tip">{emptyText}</div>
        )}

        {queryError ? (
          <Alert
            className="req-relationship-query-alert"
            type="error"
            message={queryError}
            showIcon
            closable
            onClose={onDismissError}
          />
        ) : null}

        {showLoadingOverlay ? (
          <div className="req-relationship-loading-overlay">
            <Spin size="large" />
            <span>{loading ? '正在查询关系数据' : '正在整理图布局'}</span>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

export default RelationshipGraphViewport
