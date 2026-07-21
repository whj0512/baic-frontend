import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Select, Spin, TreeSelect } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type { GraphData } from '@antv/g6'
import type { Requirement } from '../../models/Requirement'
import type {
  GraphDBGraphDepth,
  GraphDBGraphOrigin,
  GraphDBGraphRequest,
  GraphDBGraphResponse,
} from '../../models/GraphDBGraph'
import { fetchGraphDBGraph } from '../../config/graphdbGraph'
import AntvG6GraphRenderer from './graph-renderers/AntvG6GraphRenderer'
import { buildRequirementTreeData } from './requirementTreeData'

import './ReqRelationShip.css'

interface ReqRelationShipProps {
  requirements: Requirement[]
  onBack?: () => void
}

type EdgeLabelMode = 'auto' | 'show' | 'hide'

const DEFAULT_GRAPH_REQUEST: GraphDBGraphRequest = {
  root: "http://example.org/requirement-ontology#418-UserReq001",
  depth: 1,
  origin: 'all',
  node_limit: 200,
  edge_limit: 500,
  include_properties: false,
}

const DEPTH_OPTIONS: Array<{ label: string, value: GraphDBGraphDepth }> = [
  { label: '1 跳', value: 1 },
  { label: '2 跳', value: 2 },
  { label: '3 跳', value: 3 },
]

const ORIGIN_OPTIONS: Array<{ label: string, value: GraphDBGraphOrigin }> = [
  { label: '全部关系', value: 'all' },
  { label: '仅显式关系', value: 'explicit' },
  { label: '仅推理关系', value: 'inferred' },
  { label: '显式且推理', value: 'both' },
]

const EDGE_LABEL_OPTIONS: Array<{ label: string, value: EdgeLabelMode }> = [
  { label: '自动', value: 'auto' },
  { label: '始终显示', value: 'show' },
  { label: '始终隐藏', value: 'hide' },
]

const DENSE_GRAPH_EDGE_LIMIT = 120

const GRAPH_LEGEND = (
  <div className="req-relationship-legend" aria-label="关系图图例">
    <span className="req-relationship-legend__item">
      <span className="req-relationship-legend__node" />
      节点颜色区分需求类型
    </span>
    <span className="req-relationship-legend__item">
      <span className="req-relationship-legend__edge req-relationship-legend__edge--explicit" />
      显式关系
    </span>
    <span className="req-relationship-legend__item">
      <span className="req-relationship-legend__edge req-relationship-legend__edge--inferred" />
      推理关系
    </span>
    <span className="req-relationship-legend__item">
      <span className="req-relationship-legend__edge req-relationship-legend__edge--both" />
      显式且推理
    </span>
    <span className="req-relationship-legend__hint">点击节点或连线可在右侧查看属性</span>
  </div>
)

function ReqRelationShip({ requirements, onBack }: ReqRelationShipProps) {
  const [loading, setLoading] = useState(false)
  const [graphRendering, setGraphRendering] = useState(false)
  const [graphResponse, setGraphResponse] = useState<GraphDBGraphResponse | null>(null)
  const [appliedRequest, setAppliedRequest] = useState<GraphDBGraphRequest | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [draftRoot, setDraftRoot] = useState<string>()
  const [draftDepth, setDraftDepth] = useState<GraphDBGraphDepth>(1)
  const [draftOrigin, setDraftOrigin] = useState<GraphDBGraphOrigin>('all')
  const [edgeLabelMode, setEdgeLabelMode] = useState<EdgeLabelMode>('auto')
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestSequenceRef = useRef(0)

  const treeData = useMemo(() => buildRequirementTreeData(requirements), [requirements])
  const isDenseGraph = (graphResponse?.edges.length || 0) > DENSE_GRAPH_EDGE_LIMIT
  const showEdgeLabels = edgeLabelMode === 'show' || (edgeLabelMode === 'auto' && !isDenseGraph)
  const graphData = useMemo<GraphData>(
    () => buildReadableGraphData(graphResponse),
    [graphResponse],
  )

  const runQuery = useCallback(async (request: GraphDBGraphRequest) => {
    abortControllerRef.current?.abort()

    const controller = new AbortController()
    const requestSequence = requestSequenceRef.current + 1
    requestSequenceRef.current = requestSequence
    abortControllerRef.current = controller
    setLoading(true)
    setQueryError(null)

    try {
      const response = await fetchGraphDBGraph(request, controller.signal)
      if (requestSequence !== requestSequenceRef.current) return

      setGraphResponse(response)
      setAppliedRequest(request)
    } catch (error: unknown) {
      if (isAbortError(error) || requestSequence !== requestSequenceRef.current) return

      const errorMessage = error instanceof Error ? error.message : '获取需求关系失败'
      setQueryError(errorMessage)
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setLoading(false)
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
      }
    }
  }, [])

  useEffect(() => {
    // 延迟到当前任务结束，避免 React StrictMode 在开发环境重复发起首屏请求。
    const initialQueryTimer = window.setTimeout(() => {
      void runQuery({ ...DEFAULT_GRAPH_REQUEST })
    }, 0)

    return () => {
      window.clearTimeout(initialQueryTimer)
      requestSequenceRef.current += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [runQuery])

  const handleRefresh = useCallback(() => {
    void runQuery({
      ...DEFAULT_GRAPH_REQUEST,
      root: draftRoot || null,
      depth: draftRoot ? draftDepth : 1,
      origin: draftOrigin,
    })
  }, [draftDepth, draftOrigin, draftRoot, runQuery])

  const meta = graphResponse?.meta
  const hasGraphData = Boolean(graphResponse?.nodes.length)
  const isTruncated = Boolean(meta?.truncated || meta?.propertiesTruncated)
  const busy = loading || graphRendering
  const emptyText = queryError && !graphResponse ? '关系图加载失败' : '没有符合条件的关系数据'

  return (
    <div className="req-relationship-container">
      <div className="req-relationship-header">
        {onBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="req-relationship-back-btn"
          >
            返回
          </Button>
        )}
        <h2>需求间关系</h2>
      </div>

      <div className="req-relationship-operation">
        <span className="operation-label">聚焦需求：</span>
        <TreeSelect
          className="req-relationship-root-select"
          treeData={treeData}
          showSearch
          treeNodeFilterProp="title"
          allowClear
          placeholder="不选择时展示受限全局概览"
          value={draftRoot}
          onChange={(value) => setDraftRoot(typeof value === 'string' ? value : undefined)}
          maxTagCount="responsive"
        />

        <div className="req-relationship-operation__field">
          <span>展开深度：</span>
          <Select<GraphDBGraphDepth>
            value={draftDepth}
            options={DEPTH_OPTIONS}
            disabled={!draftRoot}
            onChange={setDraftDepth}
          />
        </div>

        <div className="req-relationship-operation__field">
          <span>关系来源：</span>
          <Select<GraphDBGraphOrigin>
            value={draftOrigin}
            options={ORIGIN_OPTIONS}
            onChange={setDraftOrigin}
          />
        </div>

        <div className="req-relationship-operation__field">
          <span>关系文字：</span>
          <Select<EdgeLabelMode>
            value={edgeLabelMode}
            options={EDGE_LABEL_OPTIONS}
            onChange={setEdgeLabelMode}
          />
        </div>

        <Button type="primary" onClick={handleRefresh} loading={busy}>
          刷新关系图
        </Button>
      </div>

      <div className="req-relationship-status">
        <div className="req-relationship-status__metrics">
          {meta ? (
            <>
              <span>节点 <strong>{meta.nodeCount}</strong></span>
              <span>关系 <strong>{meta.edgeCount}</strong></span>
              <span>{appliedRequest?.root ? `聚焦：${appliedRequest.root}` : '受限全局概览'}</span>
            </>
          ) : (
            <span>尚未加载关系图</span>
          )}
          {isDenseGraph && !showEdgeLabels && (
            <span className="req-relationship-status__performance">
              大图模式已隐藏关系文字
            </span>
          )}
          {isTruncated && (
            <span className="req-relationship-status__warning">
              结果已截断，请聚焦需求或降低深度
            </span>
          )}
        </div>
        {GRAPH_LEGEND}
      </div>

      <div className="req-relationship-content">
        <Card className="req-relationship-card">
          {hasGraphData ? (
            <AntvG6GraphRenderer
              graphData={graphData}
              edgeLabelsVisible={showEdgeLabels}
              focusNode={meta?.root || null}
              onRenderStateChange={setGraphRendering}
            />
          ) : (
            !busy && <div className="empty-tip">{emptyText}</div>
          )}

          {queryError && (
            <Alert
              className="req-relationship-query-alert"
              type="error"
              message={queryError}
              showIcon
              closable
              onClose={() => setQueryError(null)}
            />
          )}

          {busy && (
            <div className="req-relationship-loading-overlay">
              <Spin size="large" />
              <span>{loading ? '正在查询关系数据' : '正在整理图布局'}</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function buildReadableGraphData(graphResponse: GraphDBGraphResponse | null): GraphData {
  if (!graphResponse) return { nodes: [], edges: [] }

  return {
    nodes: graphResponse.nodes,
    edges: graphResponse.edges.map((edge) => {
      const style = isRecord(edge.style) ? edge.style : {}
      const data = isRecord(edge.data) ? edge.data : {}
      const labelText = getString(style.labelText)
        || getString(data.relationType)
        || getString(data.predicate)

      return {
        ...edge,
        style: {
          ...style,
          labelText,
        },
      } as NonNullable<GraphData['edges']>[number]
    }),
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export default ReqRelationShip
