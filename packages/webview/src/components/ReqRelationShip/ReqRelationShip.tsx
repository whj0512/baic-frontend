import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Alert, Button, Card, Select, Spin, TreeSelect } from 'antd'
import {
  ArrowLeftOutlined,
  DownOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  RightOutlined,
} from '@ant-design/icons'
import type { GraphData } from '@antv/g6'
import type { Requirement } from '../../models/Requirement'
import type {
  GraphDBGraphDepth,
  GraphDBGraphMeta,
  GraphDBGraphOrigin,
  GraphDBGraphRequest,
  GraphDBGraphResponse,
} from '../../models/GraphDBGraph'
import { fetchGraphDBGraph } from '../../config/graphdbGraph'

import './ReqRelationShip.css'

const AntvG6GraphRenderer = lazy(
  () => import('./graph-renderers/AntvG6GraphRenderer'),
)

interface ReqRelationShipProps {
  requirements: Requirement[]
  onBack?: () => void
  initialRequest?: GraphDBGraphRequest
  initialGraph?: GraphDBGraphResponse
  embedded?: boolean
}

type EdgeLabelMode = 'auto' | 'show' | 'hide'

const DEFAULT_GRAPH_REQUEST: GraphDBGraphRequest = {
  root: "http://example.org/requirement-ontology#418-UserReq001",
  depth: 1,
  origin: 'all',
  node_types: [],
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
const NODE_TYPE_FILTER_LIMIT = 50

interface GraphLegendItem {
  label: string
  color: string
  stroke?: string
  dashed?: boolean
}

interface GraphLegendData {
  nodes: GraphLegendItem[]
  edges: GraphLegendItem[]
}

function ReqRelationShip({
  onBack,
  initialRequest,
  initialGraph,
  embedded = false,
}: ReqRelationShipProps) {
  const baseGraphRequest = useMemo<GraphDBGraphRequest>(
    () => ({
      ...DEFAULT_GRAPH_REQUEST,
      ...initialRequest,
    }),
    [initialRequest],
  )
  const initialRoot =
    initialGraph?.meta.root || baseGraphRequest.root || null
  const initialGraphData = useMemo(
    () => initialGraph
      ? buildReadableGraphData(initialGraph)
      : { nodes: [], edges: [] },
    [initialGraph],
  )
  const [loading, setLoading] = useState(false)
  const [graphRendering, setGraphRendering] = useState(false)
  const [layoutAnimating, setLayoutAnimating] = useState(false)
  const [graphData, setGraphData] = useState<GraphData>(
    () => initialGraphData,
  )
  const [latestMeta, setLatestMeta] = useState<GraphDBGraphMeta | null>(
    () => initialGraph?.meta ?? null,
  )
  const [queryError, setQueryError] = useState<string | null>(null)
  const [focusNode, setFocusNode] = useState<string | null>(() => initialRoot)
  const [layoutRevision, setLayoutRevision] = useState(
    () => initialGraph ? 1 : 0,
  )
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null)
  const [expandedRootCount, setExpandedRootCount] = useState(
    () => initialRoot ? 1 : 0,
  )
  const [isTruncated, setIsTruncated] = useState(
    () => initialGraph ? isMetaTruncated(initialGraph.meta) : false,
  )
  const [draftRoot, setDraftRoot] = useState<string | undefined>(
    () => typeof baseGraphRequest.root === 'string'
      ? baseGraphRequest.root
      : undefined,
  )
  const [draftDepth, setDraftDepth] = useState<GraphDBGraphDepth>(
    () => baseGraphRequest.depth ?? 1,
  )
  const [originFilter, setOriginFilter] = useState<GraphDBGraphOrigin>(
    () => baseGraphRequest.origin ?? 'all',
  )
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string[]>(
    () => [...(baseGraphRequest.node_types || [])],
  )
  const [nodeTypeOptions, setNodeTypeOptions] = useState(
    () => buildNodeTypeOptions(initialGraphData.nodes || []),
  )
  const [edgeLabelMode, setEdgeLabelMode] = useState<EdgeLabelMode>('auto')
  const [isContentFullscreen, setIsContentFullscreen] = useState(false)
  const replaceAbortControllerRef = useRef<AbortController | null>(null)
  const expandAbortControllerRef = useRef<AbortController | null>(null)
  const replaceRequestSequenceRef = useRef(0)
  const expandRequestSequenceRef = useRef(0)
  const expandedRootsRef = useRef<Set<string>>(
    new Set(initialRoot ? [initialRoot] : []),
  )
  const graphDataRef = useRef(graphData)
  const contentRef = useRef<HTMLDivElement | null>(null)

  graphDataRef.current = graphData

  const focusNodeTreeData = useMemo(
    () => buildGraphNodeTreeData(graphData.nodes || []),
    [graphData.nodes],
  )
  const visibleGraphData = useMemo(
    () => filterGraphDataByOrigin(graphData, originFilter),
    [graphData, originFilter],
  )
  const visibleEdgeIds = useMemo(
    () => (visibleGraphData.edges || []).map((edge) => edge.id),
    [visibleGraphData],
  )
  const graphLegendData = useMemo(
    () => buildGraphLegendData(
      graphData.nodes || [],
      visibleGraphData.edges || [],
    ),
    [graphData.nodes, visibleGraphData.edges],
  )
  const edgeCount = visibleGraphData.edges?.length || 0
  const nodeCount = visibleGraphData.nodes?.length || 0
  const isDenseGraph = edgeCount > DENSE_GRAPH_EDGE_LIMIT
  const showEdgeLabels = edgeLabelMode === 'show' || (edgeLabelMode === 'auto' && !isDenseGraph)
  const focusNodeName = useMemo(
    () => getNodeDisplayName(graphData, focusNode),
    [focusNode, graphData],
  )
  const expandingNodeName = useMemo(
    () => getNodeDisplayName(graphData, expandingNodeId),
    [expandingNodeId, graphData],
  )

  const cancelExpansion = useCallback(() => {
    expandRequestSequenceRef.current += 1
    expandAbortControllerRef.current?.abort()
    expandAbortControllerRef.current = null
    setExpandingNodeId(null)
  }, [])

  const runReplaceQuery = useCallback(async (request: GraphDBGraphRequest) => {
    replaceAbortControllerRef.current?.abort()
    cancelExpansion()

    const controller = new AbortController()
    const requestSequence = replaceRequestSequenceRef.current + 1
    replaceRequestSequenceRef.current = requestSequence
    replaceAbortControllerRef.current = controller
    setLoading(true)
    setQueryError(null)

    try {
      const response = await fetchGraphDBGraph(request, controller.signal)
      if (requestSequence !== replaceRequestSequenceRef.current) return

      const canonicalRoot = response.meta.root || request.root || null
      const nextExpandedRoots = new Set<string>()
      if (canonicalRoot) nextExpandedRoots.add(canonicalRoot)

      const nextGraphData = buildReadableGraphData(response)
      setNodeTypeOptions(buildNodeTypeOptions(response.nodes))
      expandedRootsRef.current = nextExpandedRoots
      graphDataRef.current = nextGraphData
      setGraphData(nextGraphData)
      setLatestMeta(response.meta)
      setFocusNode(canonicalRoot)
      setLayoutRevision((current) => current + 1)
      setExpandedRootCount(nextExpandedRoots.size)
      setIsTruncated(isMetaTruncated(response.meta))
    } catch (error: unknown) {
      if (isAbortError(error) || requestSequence !== replaceRequestSequenceRef.current) return

      const errorMessage = error instanceof Error ? error.message : '获取需求关系失败'
      setQueryError(errorMessage)
    } finally {
      if (requestSequence === replaceRequestSequenceRef.current) {
        setLoading(false)
        if (replaceAbortControllerRef.current === controller) {
          replaceAbortControllerRef.current = null
        }
      }
    }
  }, [cancelExpansion])

  const runExpandQuery = useCallback(async (root: string) => {
    expandAbortControllerRef.current?.abort()

    const controller = new AbortController()
    const requestSequence = expandRequestSequenceRef.current + 1
    expandRequestSequenceRef.current = requestSequence
    expandAbortControllerRef.current = controller
    setExpandingNodeId(root)
    setQueryError(null)

    try {
      const response = await fetchGraphDBGraph({
        ...baseGraphRequest,
        root,
        node_types: nodeTypeFilter,
      }, controller.signal)
      if (requestSequence !== expandRequestSequenceRef.current) return

      const canonicalRoot = response.meta.root || root
      const nextExpandedRoots = new Set(expandedRootsRef.current)
      nextExpandedRoots.add(canonicalRoot)
      expandedRootsRef.current = nextExpandedRoots

      const currentGraphData = graphDataRef.current
      const nextGraphData = mergeGraphData(currentGraphData, buildReadableGraphData(response))
      const graphSizeChanged = hasGraphSizeChanged(currentGraphData, nextGraphData)

      setExpandingNodeId(null)
      graphDataRef.current = nextGraphData
      setGraphData(nextGraphData)
      setLatestMeta(response.meta)
      if (graphSizeChanged) {
        setFocusNode(canonicalRoot)
        setLayoutRevision((current) => current + 1)
      }
      setExpandedRootCount(nextExpandedRoots.size)
      setIsTruncated((current) => current || isMetaTruncated(response.meta))
    } catch (error: unknown) {
      if (isAbortError(error) || requestSequence !== expandRequestSequenceRef.current) return

      const errorMessage = error instanceof Error ? error.message : '展开节点关系失败'
      setQueryError(errorMessage)
    } finally {
      if (requestSequence === expandRequestSequenceRef.current) {
        setExpandingNodeId((current) => current === root ? null : current)
        if (expandAbortControllerRef.current === controller) {
          expandAbortControllerRef.current = null
        }
      }
    }
  }, [baseGraphRequest, nodeTypeFilter])

  useEffect(() => {
    // 延迟到当前任务结束，避免 React StrictMode 在开发环境重复发起首屏请求。
    const initialQueryTimer = initialGraph
      ? null
      : window.setTimeout(() => {
          void runReplaceQuery({ ...baseGraphRequest })
        }, 0)

    return () => {
      if (initialQueryTimer !== null) {
        window.clearTimeout(initialQueryTimer)
      }
      replaceRequestSequenceRef.current += 1
      expandRequestSequenceRef.current += 1
      replaceAbortControllerRef.current?.abort()
      expandAbortControllerRef.current?.abort()
      replaceAbortControllerRef.current = null
      expandAbortControllerRef.current = null
    }
  }, [baseGraphRequest, initialGraph, runReplaceQuery])

  const handleRefresh = useCallback((requestOverrides?: Partial<GraphDBGraphRequest>) => {
    const root = requestOverrides?.root === undefined
      ? draftRoot || null
      : requestOverrides.root

    void runReplaceQuery({
      ...baseGraphRequest,
      root,
      depth: root ? requestOverrides?.depth ?? draftDepth : 1,
      origin: requestOverrides?.origin ?? originFilter,
      node_types: requestOverrides?.node_types ?? nodeTypeFilter,
    })
  }, [baseGraphRequest, draftDepth, draftRoot, nodeTypeFilter, originFilter, runReplaceQuery])

  const handleFocusNodeChange = useCallback((value: unknown) => {
    const root = typeof value === 'string' ? value : undefined
    if (root === draftRoot) return

    setDraftRoot(root)
    handleRefresh({ root: root || null })
  }, [draftRoot, handleRefresh])

  const handleDepthChange = useCallback((depth: GraphDBGraphDepth) => {
    setDraftDepth(depth)
    handleRefresh({ depth })
  }, [handleRefresh])

  const handleOriginChange = useCallback((origin: GraphDBGraphOrigin) => {
    setOriginFilter(origin)
    handleRefresh({ origin })
  }, [handleRefresh])

  const handleNodeTypesChange = useCallback((nodeTypes: string[]) => {
    setNodeTypeFilter(nodeTypes)
    handleRefresh({ node_types: nodeTypes })
  }, [handleRefresh])

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    if (loading || expandingNodeId === nodeId) return

    if (expandedRootsRef.current.has(nodeId)) {
      cancelExpansion()
      return
    }

    void runExpandQuery(nodeId)
  }, [cancelExpansion, expandingNodeId, loading, runExpandQuery])

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

  const hasGraphData = nodeCount > 0
  const busy = loading || graphRendering
  const showLoadingOverlay = loading || (graphRendering && !layoutAnimating)
  const emptyText = queryError && !latestMeta ? '关系图加载失败' : '没有符合条件的关系数据'

  return (
    <div
      className={`req-relationship-container${
        embedded ? ' req-relationship-container--embedded' : ''
      }`}
    >
      {!embedded ? (
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
      ) : null}

      <div className="req-relationship-operation">
        <span className="operation-label">聚焦节点：</span>
        <TreeSelect
          className="req-relationship-root-select"
          treeData={focusNodeTreeData}
          showSearch
          treeNodeFilterProp="title"
          allowClear
          placeholder="不选择时展示受限全局概览"
          value={draftRoot}
          onChange={handleFocusNodeChange}
          maxTagCount="responsive"
        />

        <div className="req-relationship-operation__field">
          <span>展开深度：</span>
          <Select<GraphDBGraphDepth>
            value={draftDepth}
            options={DEPTH_OPTIONS}
            disabled={!draftRoot}
            onChange={handleDepthChange}
          />
        </div>

        <div className="req-relationship-operation__field">
          <span>关系来源：</span>
          <Select<GraphDBGraphOrigin>
            value={originFilter}
            options={ORIGIN_OPTIONS}
            onChange={handleOriginChange}
          />
        </div>

        <div className="req-relationship-operation__field">
          <span>节点类型：</span>
          <Select<string[]>
            className="req-relationship-node-types-select"
            mode="multiple"
            value={nodeTypeFilter}
            options={nodeTypeOptions}
            allowClear
            maxCount={NODE_TYPE_FILTER_LIMIT}
            maxTagCount="responsive"
            placeholder="全部类型"
            onChange={handleNodeTypesChange}
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

        <Button type="primary" onClick={() => handleRefresh()} loading={loading}>
          刷新关系图
        </Button>
      </div>

      <div className="req-relationship-status">
        <div className="req-relationship-status__metrics">
          {latestMeta ? (
            <>
              <span>节点 <strong>{nodeCount}</strong></span>
              <span>关系 <strong>{edgeCount}</strong></span>
              <span>{focusNode ? `当前中心：${focusNodeName}` : '受限全局概览'}</span>
              <span>已查询根节点 <strong>{expandedRootCount}</strong></span>
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
          <span className="req-relationship-status__expanding" aria-live="polite">
            {expandingNodeId ? `正在展开：${expandingNodeName}` : ''}
          </span>
        </div>
        <GraphLegend data={graphLegendData} />
      </div>

      <div
        ref={contentRef}
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
                edgeLabelsVisible={showEdgeLabels}
                focusNode={focusNode}
                layoutRevision={layoutRevision}
                expandingNodeId={expandingNodeId}
                onNodeDoubleClick={handleNodeDoubleClick}
                onRenderStateChange={handleGraphRenderStateChange}
              />
            </Suspense>
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

          {showLoadingOverlay && (
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

function GraphLegend({ data }: { data: GraphLegendData }) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="req-relationship-legend" aria-label="关系图图例">
      <div className="req-relationship-legend__toolbar">
        <Button
          type="text"
          size="small"
          className="req-relationship-legend__toggle"
          icon={collapsed ? <RightOutlined /> : <DownOutlined />}
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展开图例' : '收起图例'}
          onClick={() => setCollapsed((current) => !current)}
        >
          图例
        </Button>
        <span className="req-relationship-legend__summary">
          节点类型 {data.nodes.length} · 关系类型 {data.edges.length}
        </span>
        <span className="req-relationship-legend__hint">单击查看属性，双击节点继续展开</span>
      </div>

      {!collapsed ? (
        <div className="req-relationship-legend__content">
          {data.nodes.length > 0 ? (
            <div className="req-relationship-legend__group">
              <span className="req-relationship-legend__heading">节点</span>
              {data.nodes.map((item) => (
                <span key={item.label} className="req-relationship-legend__item">
                  <span
                    className="req-relationship-legend__node"
                    style={{
                      backgroundColor: item.color,
                      borderColor: item.stroke || item.color,
                      boxShadow: `0 0 0 1px ${item.stroke || item.color}`,
                    }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}

          {data.edges.length > 0 ? (
            <div className="req-relationship-legend__group">
              <span className="req-relationship-legend__heading">关系</span>
              {data.edges.map((item) => (
                <span key={item.label} className="req-relationship-legend__item">
                  <span
                    className="req-relationship-legend__edge"
                    style={{
                      borderColor: item.color,
                      borderTopStyle: item.dashed ? 'dashed' : 'solid',
                    }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function buildReadableGraphData(graphResponse: GraphData): GraphData {
  return {
    nodes: graphResponse.nodes || [],
    edges: (graphResponse.edges || []).map((edge) => {
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

function buildGraphLegendData(
  nodes: NonNullable<GraphData['nodes']>,
  edges: NonNullable<GraphData['edges']>,
): GraphLegendData {
  const nodeLegendItems = new Map<string, GraphLegendItem>()
  const edgeLegendItems = new Map<string, GraphLegendItem>()

  nodes.forEach((node) => {
    const label = getGraphNodeType(node) || '未分类'
    if (nodeLegendItems.has(label)) return

    const style = isRecord(node.style) ? node.style : {}
    const color = getString(style.fill) || '#5b8ff9'
    nodeLegendItems.set(label, {
      label,
      color,
      stroke: getString(style.stroke) || color,
    })
  })

  edges.forEach((edge) => {
    const data = isRecord(edge.data) ? edge.data : {}
    const label = getString(data.relationType) || '未分类'
    if (edgeLegendItems.has(label)) return

    const style = isRecord(edge.style) ? edge.style : {}
    edgeLegendItems.set(label, {
      label,
      color: getString(style.stroke) || '#8c8c8c',
      dashed: Array.isArray(style.lineDash) && style.lineDash.length > 0,
    })
  })

  return {
    nodes: Array.from(nodeLegendItems.values()),
    edges: Array.from(edgeLegendItems.values()),
  }
}

function buildGraphNodeTreeData(nodes: NonNullable<GraphData['nodes']>) {
  const groupedNodes = new Map<string, NonNullable<GraphData['nodes']>>()

  nodes.forEach((node) => {
    const type = getGraphNodeType(node) || '未分类'
    const group = groupedNodes.get(type)

    if (group) {
      group.push(node)
    } else {
      groupedNodes.set(type, [node])
    }
  })

  return Array.from(groupedNodes, ([type, grouped]) => ({
    title: type,
    value: `type:${type}`,
    selectable: false,
    children: grouped.map((node) => ({
      title: getGraphNodeDisplayName(node),
      value: node.id,
    })),
  }))
}

function buildNodeTypeOptions(nodes: NonNullable<GraphData['nodes']>) {
  const nodeTypes = new Set<string>()

  nodes.forEach((node) => {
    const type = getGraphNodeType(node)
    if (type) nodeTypes.add(type)
  })

  return Array.from(nodeTypes, (type) => ({
    label: type,
    value: type,
  }))
}

function mergeGraphData(current: GraphData, incoming: GraphData): GraphData {
  return {
    nodes: mergeElementsById(current.nodes || [], incoming.nodes || []),
    edges: mergeElementsById(current.edges || [], incoming.edges || []),
  }
}

function filterGraphDataByOrigin(graphData: GraphData, origin: GraphDBGraphOrigin): GraphData {
  if (origin === 'all') return graphData

  return {
    ...graphData,
    edges: (graphData.edges || []).filter((edge) => {
      const data = isRecord(edge.data) ? edge.data : {}
      return data.origin === origin
    }),
  }
}

function hasGraphSizeChanged(current: GraphData, next: GraphData) {
  return (current.nodes?.length || 0) !== (next.nodes?.length || 0)
    || (current.edges?.length || 0) !== (next.edges?.length || 0)
}

function mergeElementsById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = [...current]
  const indexById = new Map(current.map((element, index) => [element.id, index]))

  incoming.forEach((element) => {
    const existingIndex = indexById.get(element.id)
    if (existingIndex === undefined) {
      indexById.set(element.id, merged.length)
      merged.push(element)
      return
    }

    merged[existingIndex] = element
  })

  return merged
}

function getNodeDisplayName(graphData: GraphData, nodeId: string | null) {
  if (!nodeId) return ''

  const node = (graphData.nodes || []).find((item) => item.id === nodeId)
  if (!node) return nodeId

  return getGraphNodeDisplayName(node)
}

function getGraphNodeDisplayName(node: NonNullable<GraphData['nodes']>[number]) {
  const data = isRecord(node.data) ? node.data : {}
  const style = isRecord(node.style) ? node.style : {}
  return getString(data.name)
    || getString(data.identifier)
    || getString(style.labelText)
    || node.id
}

function getGraphNodeType(node: NonNullable<GraphData['nodes']>[number]) {
  const data = isRecord(node.data) ? node.data : {}
  return getString(data.type)
}

function isMetaTruncated(meta: GraphDBGraphMeta) {
  return meta.truncated || meta.propertiesTruncated
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
