import type { Edge, Graph, Node } from '@antv/x6'
import { finalizeNewEdgeConnection } from '../edgeConnection'
import type { GraphStrategy } from '../strategies/types'
import { PRE_CONNECTION_PREVIEW_DATA_KEY } from './preConnectionData'

const DEFAULT_MAX_DISTANCE = 200
const SPATIAL_GRID_SIZE = 200
const MOVE_BATCH_NAME = 'pre-connection-move'
const PREVIEW_FLOW_STYLE_ID = 'baic-pre-connection-preview-flow-style'
const PREVIEW_FLOW_ANIMATION_NAME = 'baic-pre-connection-preview-flow'

interface Point {
  x: number
  y: number
}

interface Bounds extends Point {
  width: number
  height: number
}

interface PreConnectionState {
  targetNode: Node
  candidateSourceId: string | null
  previewEdge: Edge | null
  documentCleanup: (() => void) | null
  cleanupTimer: ReturnType<typeof setTimeout> | null
  historyBatchStarted: boolean
  stencil: boolean
  spatialIndex: Map<string, Node[]>
  updateFrame: number | null
  pendingCenter?: Point
}

interface BeginPreConnectionOptions {
  stencil?: boolean
}

const states = new WeakMap<Graph, PreConnectionState>()

const getGridKey = (x: number, y: number) => `${x}:${y}`

const getGridRange = (bounds: Bounds, padding = 0) => ({
  minX: Math.floor((bounds.x - padding) / SPATIAL_GRID_SIZE),
  maxX: Math.floor((bounds.x + bounds.width + padding) / SPATIAL_GRID_SIZE),
  minY: Math.floor((bounds.y - padding) / SPATIAL_GRID_SIZE),
  maxY: Math.floor((bounds.y + bounds.height + padding) / SPATIAL_GRID_SIZE),
})

const buildSpatialIndex = (graph: Graph) => {
  const index = new Map<string, Node[]>()

  graph.getNodes().forEach((node) => {
    const range = getGridRange(node.getBBox())
    for (let x = range.minX; x <= range.maxX; x += 1) {
      for (let y = range.minY; y <= range.maxY; y += 1) {
        const key = getGridKey(x, y)
        const nodes = index.get(key)
        if (nodes) nodes.push(node)
        else index.set(key, [node])
      }
    }
  })

  return index
}

const getNearbyNodes = (
  state: PreConnectionState,
  bounds: Bounds,
  padding: number,
) => {
  const range = getGridRange(bounds, padding)
  const nearby = new Map<string, Node>()

  for (let x = range.minX; x <= range.maxX; x += 1) {
    for (let y = range.minY; y <= range.maxY; y += 1) {
      state.spatialIndex.get(getGridKey(x, y))?.forEach((node) => {
        nearby.set(node.id, node)
      })
    }
  }

  return nearby.values()
}

const ensurePreviewFlowStyle = () => {
  if (typeof document === 'undefined' || document.getElementById(PREVIEW_FLOW_STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = PREVIEW_FLOW_STYLE_ID
  style.textContent = `
@keyframes ${PREVIEW_FLOW_ANIMATION_NAME} {
  from {
    stroke-dashoffset: 0;
  }

  to {
    stroke-dashoffset: -28;
  }
}
`
  document.head.appendChild(style)
}

const getFormalConnectedEdges = (graph: Graph, node: Node) => {
  return graph.getConnectedEdges(node).filter((edge) => {
    return edge.getData()?.[PRE_CONNECTION_PREVIEW_DATA_KEY] !== true
  })
}

const canUseTarget = (graph: Graph, strategy: GraphStrategy, node: Node) => {
  const rules = strategy.preConnectionRules
  if (!rules || rules.canUseTarget?.(node) === false) return false
  return getFormalConnectedEdges(graph, node).length === 0
}

const removePreviewEdge = (graph: Graph, state: PreConnectionState) => {
  const edge = state.previewEdge
  state.previewEdge = null
  state.candidateSourceId = null

  if (edge && graph.getCellById(edge.id)) {
    graph.removeEdge(edge)
  }
}

const clearTimer = (state: PreConnectionState) => {
  if (state.cleanupTimer == null) return
  clearTimeout(state.cleanupTimer)
  state.cleanupTimer = null
}

const clearDocumentEvents = (state: PreConnectionState) => {
  state.documentCleanup?.()
  state.documentCleanup = null
}

const stopMoveBatch = (graph: Graph, state: PreConnectionState) => {
  if (!state.historyBatchStarted) return
  state.historyBatchStarted = false
  graph.stopBatch(MOVE_BATCH_NAME)
}

const releaseState = (graph: Graph, state: PreConnectionState) => {
  clearTimer(state)
  clearDocumentEvents(state)
  if (state.updateFrame !== null) cancelAnimationFrame(state.updateFrame)
  state.updateFrame = null
  states.delete(graph)
  stopMoveBatch(graph, state)
}

const getTargetGeometry = (node: Node, center?: Point) => {
  const bbox = node.getBBox()
  const targetCenter = center || bbox.center
  const bounds = {
    x: center ? targetCenter.x - bbox.width / 2 : bbox.x,
    y: center ? targetCenter.y - bbox.height / 2 : bbox.y,
    width: bbox.width,
    height: bbox.height,
  }

  return {
    center: targetCenter,
    bounds,
    top: {
      x: targetCenter.x,
      y: center ? targetCenter.y - bbox.height / 2 : bbox.y,
    },
  }
}

const getBoundsDistance = (a: Bounds, b: Bounds) => {
  const aRight = a.x + a.width
  const bRight = b.x + b.width
  const aBottom = a.y + a.height
  const bBottom = b.y + b.height
  const dx = Math.max(b.x - aRight, a.x - bRight, 0)
  const dy = Math.max(b.y - aBottom, a.y - bBottom, 0)

  return Math.sqrt(dx * dx + dy * dy)
}

const getCenterDistance = (a: Bounds, b: Bounds) => {
  const ax = a.x + a.width / 2
  const ay = a.y + a.height / 2
  const bx = b.x + b.width / 2
  const by = b.y + b.height / 2
  const dx = ax - bx
  const dy = ay - by

  return Math.sqrt(dx * dx + dy * dy)
}

const findNearestSource = (
  state: PreConnectionState,
  strategy: GraphStrategy,
  targetNode: Node,
  targetBounds: Bounds,
) => {
  const rules = strategy.preConnectionRules
  const maxDistance = rules?.maxDistance ?? DEFAULT_MAX_DISTANCE
  let nearestNode: Node | null = null
  let nearestDistance = Infinity
  let nearestCenterDistance = Infinity

  for (const node of getNearbyNodes(state, targetBounds, maxDistance)) {
    if (node.id === targetNode.id || rules?.canUseSource?.(node) === false) continue

    const sourceBounds = node.getBBox()
    const distance = getBoundsDistance(targetBounds, sourceBounds)
    const centerDistance = getCenterDistance(targetBounds, sourceBounds)

    if (
      distance < maxDistance &&
      (
        distance < nearestDistance ||
        (distance === nearestDistance && centerDistance < nearestCenterDistance)
      )
    ) {
      nearestNode = node
      nearestDistance = distance
      nearestCenterDistance = centerDistance
    }
  }

  return nearestNode
}

const createPreviewEdge = (graph: Graph, sourceNode: Node, target: Point) => {
  ensurePreviewFlowStyle()

  return graph.addEdge({
    shape: 'edge',
    source: { cell: sourceNode.id },
    target,
    data: {
      [PRE_CONNECTION_PREVIEW_DATA_KEY]: true,
    },
    attrs: {
      line: {
        stroke: '#1568DD',
        strokeWidth: 2,
        strokeDasharray: '10 6',
        strokeDashoffset: 0,
        strokeLinecap: 'round',
        style: {
          animation: `${PREVIEW_FLOW_ANIMATION_NAME} 0.8s linear infinite`,
        },
        targetMarker: {
          name: 'block',
          width: 12,
          height: 8,
        },
      },
    },
    router: {
      name: 'manhattan',
    },
    connector: {
      name: 'rounded',
      args: { radius: 8 },
    },
  })
}

const updatePreview = (
  graph: Graph,
  strategy: GraphStrategy,
  state: PreConnectionState,
  center?: Point,
) => {
  if (!canUseTarget(graph, strategy, state.targetNode)) {
    removePreviewEdge(graph, state)
    return
  }

  const target = getTargetGeometry(state.targetNode, center)
  const sourceNode = findNearestSource(state, strategy, state.targetNode, target.bounds)
  if (!sourceNode) {
    removePreviewEdge(graph, state)
    return
  }

  if (
    state.previewEdge &&
    graph.getCellById(state.previewEdge.id) &&
    state.candidateSourceId === sourceNode.id
  ) {
    const currentTarget = state.previewEdge.getTarget() as Point
    if (currentTarget.x !== target.top.x || currentTarget.y !== target.top.y) {
      state.previewEdge.setTarget(target.top)
    }
    return
  }

  removePreviewEdge(graph, state)
  state.candidateSourceId = sourceNode.id
  state.previewEdge = createPreviewEdge(graph, sourceNode, target.top)
}

const schedulePreviewUpdate = (
  graph: Graph,
  strategy: GraphStrategy,
  state: PreConnectionState,
  center?: Point,
) => {
  state.pendingCenter = center
  if (state.updateFrame !== null) return

  state.updateFrame = requestAnimationFrame(() => {
    state.updateFrame = null
    const pendingCenter = state.pendingCenter
    state.pendingCenter = undefined
    if (states.get(graph) === state) updatePreview(graph, strategy, state, pendingCenter)
  })
}

const getClientPoint = (event: MouseEvent | TouchEvent): Point | null => {
  if ('touches' in event) {
    const touch = event.touches[0] || event.changedTouches[0]
    return touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  return { x: event.clientX, y: event.clientY }
}

const updateFromDocumentEvent = (
  graph: Graph,
  strategy: GraphStrategy,
  event: MouseEvent | TouchEvent,
) => {
  const state = states.get(graph)
  const clientPoint = getClientPoint(event)
  if (!state || !clientPoint) return

  const rect = graph.container.getBoundingClientRect()
  const inside = clientPoint.x >= rect.left &&
    clientPoint.x <= rect.right &&
    clientPoint.y >= rect.top &&
    clientPoint.y <= rect.bottom

  if (!inside) {
    removePreviewEdge(graph, state)
    return
  }

  const localCenter = graph.clientToLocal(clientPoint.x, clientPoint.y)
  schedulePreviewUpdate(graph, strategy, state, localCenter)
}

const restoreFormalEdgeStyle = (edge: Edge, strategy: GraphStrategy) => {
  edge.attr('line', {
    stroke: '#1890ff',
    strokeWidth: 2,
    strokeDasharray: '',
    strokeDashoffset: '',
    strokeLinecap: '',
    style: {
      animation: '',
    },
    sourceMarker: strategy.defaultSourceMarker !== undefined
      ? strategy.defaultSourceMarker
      : undefined,
    targetMarker: strategy.defaultEdgeMarker !== undefined
      ? strategy.defaultEdgeMarker
      : {
        name: 'block',
        width: 12,
        height: 8,
      },
  })
  edge.prop('router', { name: 'manhattan' })
  edge.prop('connector', { name: 'rounded', args: { radius: 8 } })
}

const rollbackAddedPorts = (node: Node, existingPortIds: Set<string>) => {
  node.getPorts().forEach((port) => {
    if (!port.id || existingPortIds.has(port.id)) return
    node.removePort(port.id)
  })
}

export const beginPreConnection = (
  graph: Graph,
  strategy: GraphStrategy,
  targetNode: Node,
  { stencil = false }: BeginPreConnectionOptions = {},
) => {
  if (!strategy.preConnectionRules || !canUseTarget(graph, strategy, targetNode)) {
    return false
  }

  const currentState = states.get(graph)
  if (currentState) {
    return currentState.targetNode.id === targetNode.id
  }

  const state: PreConnectionState = {
    targetNode,
    candidateSourceId: null,
    previewEdge: null,
    documentCleanup: null,
    cleanupTimer: null,
    historyBatchStarted: false,
    stencil,
    spatialIndex: buildSpatialIndex(graph),
    updateFrame: null,
  }

  states.set(graph, state)
  if (!stencil) {
    graph.startBatch(MOVE_BATCH_NAME)
    state.historyBatchStarted = true
  }

  return true
}

export const updatePreConnection = (
  graph: Graph,
  strategy: GraphStrategy,
  targetNode: Node,
) => {
  const state = states.get(graph)
  if (!state || state.targetNode.id !== targetNode.id) return
  schedulePreviewUpdate(graph, strategy, state)
}

export const transferPreConnectionTarget = (
  graph: Graph,
  draggingNode: Node,
  droppingNode: Node,
) => {
  const state = states.get(graph)
  if (!state || state.targetNode !== draggingNode) return
  state.targetNode = droppingNode
}

export const registerPreConnectionDocumentEvents = (
  graph: Graph,
  strategy: GraphStrategy,
) => {
  const state = states.get(graph)
  if (!state || state.documentCleanup) return

  const handleMove = (event: MouseEvent | TouchEvent) => {
    updateFromDocumentEvent(graph, strategy, event)
  }
  const handleEnd = () => schedulePreConnectionCleanup(graph)
  const handleCancel = () => cancelPreConnection(graph)

  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleEnd)
  document.addEventListener('touchmove', handleMove)
  document.addEventListener('touchend', handleEnd)
  document.addEventListener('touchcancel', handleCancel)

  state.documentCleanup = () => {
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
    document.removeEventListener('touchcancel', handleCancel)
  }
}

export const schedulePreConnectionCleanup = (graph: Graph) => {
  const state = states.get(graph)
  if (!state) return

  clearDocumentEvents(state)
  clearTimer(state)
  state.cleanupTimer = setTimeout(() => {
    const currentState = states.get(graph)
    if (currentState === state) {
      cancelPreConnection(graph)
    }
  }, 0)
}

export const completePreConnection = (
  graph: Graph,
  strategy: GraphStrategy,
  targetNode: Node,
) => {
  const state = states.get(graph)
  if (!state || state.targetNode !== targetNode) return false

  if (state.updateFrame !== null) {
    cancelAnimationFrame(state.updateFrame)
    state.updateFrame = null
    state.pendingCenter = undefined
  }
  updatePreview(graph, strategy, state)
  const edge = state.previewEdge
  const sourceNode = state.candidateSourceId
    ? graph.getCellById(state.candidateSourceId)
    : null
  const targetStillExists = graph.getCellById(targetNode.id) === targetNode

  if (
    !edge ||
    !graph.getCellById(edge.id) ||
    !sourceNode?.isNode?.() ||
    !targetStillExists ||
    !canUseTarget(graph, strategy, targetNode) ||
    strategy.preConnectionRules?.canUseSource?.(sourceNode) === false
  ) {
    removePreviewEdge(graph, state)
    releaseState(graph, state)
    return false
  }

  const sourcePortIds = new Set(sourceNode.getPorts().flatMap(port => port.id ? [port.id] : []))
  const targetPortIds = new Set(targetNode.getPorts().flatMap(port => port.id ? [port.id] : []))
  let finalized = false

  try {
    edge.setTarget({ cell: targetNode.id })
    finalized = finalizeNewEdgeConnection(graph, strategy, edge)
    if (finalized) {
      restoreFormalEdgeStyle(edge, strategy)
      const data = { ...(edge.getData() || {}) }
      delete data[PRE_CONNECTION_PREVIEW_DATA_KEY]
      edge.setData(data, { overwrite: true })
    }
  } catch {
    finalized = false
  }

  if (!finalized) {
    rollbackAddedPorts(sourceNode, sourcePortIds)
    rollbackAddedPorts(targetNode, targetPortIds)
    removePreviewEdge(graph, state)
  } else {
    state.previewEdge = null
    state.candidateSourceId = null
  }

  releaseState(graph, state)
  return finalized
}

export const handlePreConnectionNodeRemoved = (graph: Graph, node: Node) => {
  const state = states.get(graph)
  if (!state) return
  if (state.targetNode.id === node.id || state.candidateSourceId === node.id) {
    cancelPreConnection(graph)
  }
}

export const cancelPreConnection = (graph: Graph) => {
  const state = states.get(graph)
  if (!state) return

  removePreviewEdge(graph, state)
  releaseState(graph, state)
}
