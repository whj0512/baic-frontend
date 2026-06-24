import type { Edge, Graph, Node } from '@antv/x6'
import { finalizeNewEdgeConnection } from '../edgeConnection'
import type { GraphStrategy } from '../strategies/types'
import { PRE_CONNECTION_PREVIEW_DATA_KEY } from './preConnectionData'

const DEFAULT_MAX_DISTANCE = 200
const MOVE_BATCH_NAME = 'pre-connection-move'

interface Point {
  x: number
  y: number
}

interface PreConnectionState {
  targetNode: Node
  candidateSourceId: string | null
  previewEdge: Edge | null
  documentCleanup: (() => void) | null
  cleanupTimer: ReturnType<typeof setTimeout> | null
  historyBatchStarted: boolean
  stencil: boolean
}

interface BeginPreConnectionOptions {
  stencil?: boolean
}

const states = new WeakMap<Graph, PreConnectionState>()

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
  states.delete(graph)
  stopMoveBatch(graph, state)
}

const getTargetGeometry = (node: Node, center?: Point) => {
  const bbox = node.getBBox()
  const targetCenter = center || bbox.center

  return {
    center: targetCenter,
    top: {
      x: targetCenter.x,
      y: center ? targetCenter.y - bbox.height / 2 : bbox.y,
    },
  }
}

const findNearestSource = (
  graph: Graph,
  strategy: GraphStrategy,
  targetNode: Node,
  targetCenter: Point,
) => {
  const rules = strategy.preConnectionRules
  const maxDistance = rules?.maxDistance ?? DEFAULT_MAX_DISTANCE
  let nearestNode: Node | null = null
  let nearestDistance = Infinity

  graph.getNodes().forEach((node) => {
    if (node.id === targetNode.id || rules?.canUseSource?.(node) === false) return

    const sourceCenter = node.getBBox().center
    const dx = targetCenter.x - sourceCenter.x
    const dy = targetCenter.y - sourceCenter.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < maxDistance && distance < nearestDistance) {
      nearestNode = node
      nearestDistance = distance
    }
  })

  return nearestNode
}

const createPreviewEdge = (graph: Graph, sourceNode: Node, target: Point) => {
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
        strokeDasharray: '5 5',
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
  const sourceNode = findNearestSource(graph, strategy, state.targetNode, target.center)
  if (!sourceNode) {
    removePreviewEdge(graph, state)
    return
  }

  if (
    state.previewEdge &&
    graph.getCellById(state.previewEdge.id) &&
    state.candidateSourceId === sourceNode.id
  ) {
    state.previewEdge.setTarget(target.top)
    return
  }

  removePreviewEdge(graph, state)
  state.candidateSourceId = sourceNode.id
  state.previewEdge = createPreviewEdge(graph, sourceNode, target.top)
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
  updatePreview(graph, strategy, state, localCenter)
}

const restoreFormalEdgeStyle = (edge: Edge, strategy: GraphStrategy) => {
  edge.attr('line', {
    stroke: '#1890ff',
    strokeWidth: 2,
    strokeDasharray: '',
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
  updatePreview(graph, strategy, state)
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
