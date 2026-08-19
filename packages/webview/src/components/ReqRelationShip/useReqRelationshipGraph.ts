import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { GraphData } from '@antv/g6'
import type {
  GraphDBGraphDepth,
  GraphDBGraphMeta,
  GraphDBGraphOrigin,
  GraphDBGraphRequest,
  GraphDBGraphResponse,
} from '../../models/GraphDBGraph'
import {
  loadRelationshipGraph,
  loadRelationshipGraphExpansion,
} from './relationshipGraphLoader'
import type {
  RelationshipGraphExpansion,
  RelationshipGraphSnapshot,
} from './relationshipGraphLoader'
import {
  buildGraphLegendData,
  buildReadableGraphData,
  createNodeTypeColorResolver,
  DEFAULT_GRAPH_REQUEST,
  filterGraphDataByOrigin,
  getNodeDisplayName,
  hasGraphSizeChanged,
  isAbortError,
  isMetaTruncated,
  mergeGraphData,
} from './relationshipGraphModel'

interface UseReqRelationshipGraphOptions {
  initialRequest?: GraphDBGraphRequest
  initialGraph?: GraphDBGraphResponse
}

interface RelationshipGraphState {
  graphData: GraphData
  latestMeta: GraphDBGraphMeta | null
  focusNode: string | null
  layoutRevision: number
  expandedRootIds: Set<string>
  isTruncated: boolean
  loading: boolean
  expandingNodeId: string | null
  queryError: string | null
}

type RelationshipGraphAction =
  | { type: 'replaceStarted' }
  | { type: 'replaceSucceeded', snapshot: RelationshipGraphSnapshot }
  | { type: 'replaceFailed', message: string }
  | { type: 'expandStarted', root: string }
  | { type: 'expandSucceeded', expansion: RelationshipGraphExpansion }
  | { type: 'expandFailed', message: string }
  | { type: 'expandCancelled' }
  | { type: 'errorDismissed' }

export function useReqRelationshipGraph({
  initialRequest,
  initialGraph,
}: UseReqRelationshipGraphOptions) {
  const baseGraphRequest = useMemo<GraphDBGraphRequest>(
    () => ({
      ...DEFAULT_GRAPH_REQUEST,
      ...initialRequest,
    }),
    [initialRequest],
  )
  const [resolveNodeColor] = useState(createNodeTypeColorResolver)
  const initialState = useMemo(
    () => createInitialState(initialGraph, baseGraphRequest, resolveNodeColor),
    [baseGraphRequest, initialGraph, resolveNodeColor],
  )
  const [state, dispatch] = useReducer(relationshipGraphReducer, initialState)
  const [depth, setDepth] = useState<GraphDBGraphDepth>(
    () => baseGraphRequest.depth ?? 2,
  )
  const [origin, setOrigin] = useState<GraphDBGraphOrigin>(
    () => baseGraphRequest.origin ?? 'all',
  )
  const replaceAbortControllerRef = useRef<AbortController | null>(null)
  const expandAbortControllerRef = useRef<AbortController | null>(null)
  const replaceRequestSequenceRef = useRef(0)
  const expandRequestSequenceRef = useRef(0)

  const cancelExpansion = useCallback(() => {
    expandRequestSequenceRef.current += 1
    expandAbortControllerRef.current?.abort()
    expandAbortControllerRef.current = null
    dispatch({ type: 'expandCancelled' })
  }, [])

  const runReplaceQuery = useCallback(async (request: GraphDBGraphRequest) => {
    replaceAbortControllerRef.current?.abort()
    cancelExpansion()

    const controller = new AbortController()
    const requestSequence = replaceRequestSequenceRef.current + 1
    replaceRequestSequenceRef.current = requestSequence
    replaceAbortControllerRef.current = controller
    dispatch({ type: 'replaceStarted' })

    try {
      const snapshot = await loadRelationshipGraph(
        request,
        controller.signal,
        resolveNodeColor,
      )
      if (requestSequence !== replaceRequestSequenceRef.current) return

      dispatch({ type: 'replaceSucceeded', snapshot })
    } catch (error: unknown) {
      if (isAbortError(error) || requestSequence !== replaceRequestSequenceRef.current) return

      controller.abort()
      dispatch({
        type: 'replaceFailed',
        message: error instanceof Error ? error.message : '获取需求关系失败',
      })
    } finally {
      if (replaceAbortControllerRef.current === controller) {
        replaceAbortControllerRef.current = null
      }
    }
  }, [cancelExpansion, resolveNodeColor])

  const runExpandQuery = useCallback(async (root: string) => {
    expandAbortControllerRef.current?.abort()

    const controller = new AbortController()
    const requestSequence = expandRequestSequenceRef.current + 1
    expandRequestSequenceRef.current = requestSequence
    expandAbortControllerRef.current = controller
    dispatch({ type: 'expandStarted', root })

    try {
      const expansion = await loadRelationshipGraphExpansion(
        baseGraphRequest,
        root,
        controller.signal,
        resolveNodeColor,
      )
      if (requestSequence !== expandRequestSequenceRef.current) return

      dispatch({ type: 'expandSucceeded', expansion })
    } catch (error: unknown) {
      if (isAbortError(error) || requestSequence !== expandRequestSequenceRef.current) return

      dispatch({
        type: 'expandFailed',
        message: error instanceof Error ? error.message : '展开节点关系失败',
      })
    } finally {
      if (expandAbortControllerRef.current === controller) {
        expandAbortControllerRef.current = null
      }
    }
  }, [baseGraphRequest, resolveNodeColor])

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

  const refresh = useCallback((requestOverrides?: Partial<GraphDBGraphRequest>) => {
    const root = requestOverrides?.root === undefined
      ? baseGraphRequest.root || null
      : requestOverrides.root

    void runReplaceQuery({
      ...baseGraphRequest,
      root,
      depth: requestOverrides?.depth ?? depth,
      origin: requestOverrides?.origin ?? origin,
    })
  }, [baseGraphRequest, depth, origin, runReplaceQuery])

  const changeDepth = useCallback((nextDepth: GraphDBGraphDepth) => {
    setDepth(nextDepth)
    refresh({ depth: nextDepth })
  }, [refresh])

  const changeOrigin = useCallback((nextOrigin: GraphDBGraphOrigin) => {
    setOrigin(nextOrigin)
    refresh({ origin: nextOrigin })
  }, [refresh])

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    if (state.loading || state.expandingNodeId === nodeId) return

    if (state.expandedRootIds.has(nodeId)) {
      cancelExpansion()
      return
    }

    void runExpandQuery(nodeId)
  }, [
    cancelExpansion,
    runExpandQuery,
    state.expandedRootIds,
    state.expandingNodeId,
    state.loading,
  ])

  const dismissError = useCallback(() => {
    dispatch({ type: 'errorDismissed' })
  }, [])

  const visibleGraphData = useMemo(
    () => filterGraphDataByOrigin(state.graphData, origin),
    [origin, state.graphData],
  )
  const visibleEdgeIds = useMemo(
    () => (visibleGraphData.edges || []).map(edge => edge.id),
    [visibleGraphData.edges],
  )
  const legendData = useMemo(
    () => buildGraphLegendData(state.graphData.nodes || [], resolveNodeColor),
    [resolveNodeColor, state.graphData.nodes],
  )
  const focusNodeName = useMemo(
    () => getNodeDisplayName(state.graphData, state.focusNode),
    [state.focusNode, state.graphData],
  )
  const expandingNodeName = useMemo(
    () => getNodeDisplayName(state.graphData, state.expandingNodeId),
    [state.expandingNodeId, state.graphData],
  )

  return {
    graphData: state.graphData,
    latestMeta: state.latestMeta,
    focusNode: state.focusNode,
    focusNodeName,
    layoutRevision: state.layoutRevision,
    expandedRootCount: state.expandedRootIds.size,
    isTruncated: state.isTruncated,
    loading: state.loading,
    expandingNodeId: state.expandingNodeId,
    expandingNodeName,
    queryError: state.queryError,
    depth,
    origin,
    visibleEdgeIds,
    legendData,
    nodeCount: visibleGraphData.nodes?.length || 0,
    edgeCount: visibleGraphData.edges?.length || 0,
    refresh,
    changeDepth,
    changeOrigin,
    toggleNodeExpansion,
    dismissError,
  }
}

function createInitialState(
  initialGraph: GraphDBGraphResponse | undefined,
  baseGraphRequest: GraphDBGraphRequest,
  resolveNodeColor: ReturnType<typeof createNodeTypeColorResolver>,
): RelationshipGraphState {
  const initialRoot = initialGraph?.meta.root || baseGraphRequest.root || null

  return {
    graphData: initialGraph
      ? buildReadableGraphData(initialGraph, resolveNodeColor)
      : { nodes: [], edges: [] },
    latestMeta: initialGraph?.meta ?? null,
    focusNode: initialRoot,
    layoutRevision: initialGraph ? 1 : 0,
    expandedRootIds: new Set(initialRoot ? [initialRoot] : []),
    isTruncated: initialGraph ? isMetaTruncated(initialGraph.meta) : false,
    loading: false,
    expandingNodeId: null,
    queryError: null,
  }
}

function relationshipGraphReducer(
  state: RelationshipGraphState,
  action: RelationshipGraphAction,
): RelationshipGraphState {
  switch (action.type) {
    case 'replaceStarted':
      return {
        ...state,
        loading: true,
        expandingNodeId: null,
        queryError: null,
      }
    case 'replaceSucceeded':
      return {
        ...state,
        graphData: action.snapshot.graphData,
        latestMeta: action.snapshot.meta,
        focusNode: action.snapshot.focusNode,
        layoutRevision: state.layoutRevision + 1,
        expandedRootIds: new Set(action.snapshot.expandedRootIds),
        isTruncated: isMetaTruncated(action.snapshot.meta),
        loading: false,
        queryError: null,
      }
    case 'replaceFailed':
      return {
        ...state,
        loading: false,
        queryError: action.message,
      }
    case 'expandStarted':
      return {
        ...state,
        expandingNodeId: action.root,
        queryError: null,
      }
    case 'expandSucceeded': {
      const nextGraphData = mergeGraphData(state.graphData, action.expansion.graphData)
      const graphSizeChanged = hasGraphSizeChanged(state.graphData, nextGraphData)
      const expandedRootIds = new Set(state.expandedRootIds)
      expandedRootIds.add(action.expansion.root)

      return {
        ...state,
        graphData: nextGraphData,
        latestMeta: action.expansion.meta,
        focusNode: graphSizeChanged ? action.expansion.root : state.focusNode,
        layoutRevision: graphSizeChanged
          ? state.layoutRevision + 1
          : state.layoutRevision,
        expandedRootIds,
        isTruncated: state.isTruncated || isMetaTruncated(action.expansion.meta),
        expandingNodeId: null,
        queryError: null,
      }
    }
    case 'expandFailed':
      return {
        ...state,
        expandingNodeId: null,
        queryError: action.message,
      }
    case 'expandCancelled':
      return {
        ...state,
        expandingNodeId: null,
      }
    case 'errorDismissed':
      return {
        ...state,
        queryError: null,
      }
  }
}
