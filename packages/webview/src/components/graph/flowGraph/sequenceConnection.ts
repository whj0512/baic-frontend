import type { Edge, Graph, Node } from '@antv/x6'
import type { GraphStrategy, SequenceConnectionConfig } from '../strategies/types'
import {
  ensureSequenceEdgeVerticesTool,
  finalizeSequenceEdge,
  toSerializableGraphJSON,
} from '../edgeConnection'
import { sequenceConnectionPreviewData } from './sequenceConnectionData'

type Point = {
  x: number
  y: number
}

interface RegisteredSequenceConnection {
  strategy: GraphStrategy
  config: SequenceConnectionConfig
  onChange?: (data: any) => void
}

interface ActiveSequenceConnection {
  graph: Graph
  strategy: GraphStrategy
  sourceNode: Node
  sourcePoint: Point
  previewEdge: Edge | null
  onChange?: (data: any) => void
  handlePointerMove: (event: PointerEvent) => void
  handlePointerUp: (event: PointerEvent) => void
  handlePointerCancel: () => void
}

const registeredConnections = new WeakMap<Graph, RegisteredSequenceConnection>()
let activeConnection: ActiveSequenceConnection | null = null

const graphHasEdge = (graph: Graph, edge: Edge) => {
  return graph.getEdges().some((item) => item.id === edge.id)
}

const isSequenceParticipant = (node: Node | null | undefined, config: SequenceConnectionConfig) => {
  if (!node?.isNode?.()) return false
  return config.participantShapes.includes(node.shape)
}

const toGraphPoint = (graph: Graph, event: PointerEvent): Point => {
  const point = graph.clientToLocal(event.clientX, event.clientY)
  return { x: point.x, y: point.y }
}

const getLifelinePoint = (node: Node, y: number): Point => {
  const bbox = node.getBBox()
  return {
    x: bbox.center.x,
    y,
  }
}

const getTopParticipantAtPoint = (graph: Graph, point: Point, config: SequenceConnectionConfig) => {
  return graph
    .getNodesFromPoint(point)
    .filter((node) => isSequenceParticipant(node, config))
    .sort((a, b) => ((b.getZIndex?.() ?? 0) - (a.getZIndex?.() ?? 0)))
    [0] || null
}

const createSequenceEdge = (
  graph: Graph,
  strategy: GraphStrategy,
  source: Point,
  target: Point,
  preview = false,
  data?: Record<string, any>,
) => {
  return graph.addEdge({
    shape: 'edge',
    source,
    target,
    attrs: {
      line: {
        stroke: '#1890ff',
        strokeWidth: 2,
        strokeDasharray: preview ? 5 : null,
        sourceMarker: strategy.defaultSourceMarker !== undefined ? strategy.defaultSourceMarker : undefined,
        targetMarker: strategy.defaultEdgeMarker !== undefined ? strategy.defaultEdgeMarker : {
          name: 'block',
          width: 12,
          height: 8,
        },
      },
    },
    data: preview ? sequenceConnectionPreviewData : data,
  })
}

const cleanupActiveConnection = () => {
  if (!activeConnection) return

  document.removeEventListener('pointermove', activeConnection.handlePointerMove)
  document.removeEventListener('pointerup', activeConnection.handlePointerUp)
  document.removeEventListener('pointercancel', activeConnection.handlePointerCancel)

  if (activeConnection.previewEdge && graphHasEdge(activeConnection.graph, activeConnection.previewEdge)) {
    activeConnection.graph.removeEdge(activeConnection.previewEdge)
  }

  activeConnection = null
}

const updatePreviewEdge = (active: ActiveSequenceConnection, targetPoint: Point) => {
  if (!active.previewEdge || !graphHasEdge(active.graph, active.previewEdge)) {
    active.previewEdge = createSequenceEdge(
      active.graph,
      active.strategy,
      active.sourcePoint,
      targetPoint,
      true,
    )
    return
  }

  active.previewEdge.setSource(active.sourcePoint)
  active.previewEdge.setTarget(targetPoint)
}

const completeSequenceConnection = (active: ActiveSequenceConnection, event: PointerEvent) => {
  const registered = registeredConnections.get(active.graph)
  if (!registered) return

  const targetPoint = toGraphPoint(active.graph, event)
  const targetNode = getTopParticipantAtPoint(active.graph, targetPoint, registered.config)
  if (!targetNode) return

  const sourcePoint = getLifelinePoint(active.sourceNode, active.sourcePoint.y)
  const targetLifelinePoint = getLifelinePoint(targetNode, active.sourcePoint.y)

  const edge = createSequenceEdge(active.graph, active.strategy, sourcePoint, targetLifelinePoint, false, {
    sourceId: active.sourceNode.id,
    targetId: targetNode.id,
  })
  const keepEdge = finalizeSequenceEdge(active.graph, edge, active.sourceNode, targetNode, {
    source: sourcePoint,
    target: targetLifelinePoint,
    y: active.sourcePoint.y,
  })

  if (!keepEdge) {
    active.graph.removeEdge(edge)
    return
  }

  ensureSequenceEdgeVerticesTool(edge)
  active.onChange?.(toSerializableGraphJSON(active.graph))
}

export const registerSequenceConnection = (
  graph: Graph,
  strategy: GraphStrategy,
  onChange?: (data: any) => void,
) => {
  if (!strategy.sequenceConnection) return

  registeredConnections.set(graph, {
    strategy,
    config: strategy.sequenceConnection,
    onChange,
  })
}

export const cancelSequenceConnection = (graph?: Graph) => {
  if (!activeConnection) return
  if (graph && activeConnection.graph !== graph) return

  cleanupActiveConnection()
}

export const beginSequenceConnection = (graph: Graph, sourceNode: Node, event: PointerEvent) => {
  const registered = registeredConnections.get(graph)
  if (!registered || !isSequenceParticipant(sourceNode, registered.config)) return false
  if (event.button !== 0) return false

  event.preventDefault()
  event.stopPropagation()

  cleanupActiveConnection()

  const sourcePoint = getLifelinePoint(sourceNode, toGraphPoint(graph, event).y)
  const active: ActiveSequenceConnection = {
    graph,
    strategy: registered.strategy,
    sourceNode,
    sourcePoint,
    previewEdge: null,
    onChange: registered.onChange,
    handlePointerMove: (moveEvent) => {
      moveEvent.preventDefault()
      updatePreviewEdge(active, toGraphPoint(graph, moveEvent))
    },
    handlePointerUp: (upEvent) => {
      upEvent.preventDefault()
      const currentActive = activeConnection
      cleanupActiveConnection()
      if (currentActive) {
        completeSequenceConnection(currentActive, upEvent)
      }
    },
    handlePointerCancel: () => {
      cleanupActiveConnection()
    },
  }

  activeConnection = active
  graph.cleanSelection()
  updatePreviewEdge(active, sourcePoint)

  document.addEventListener('pointermove', active.handlePointerMove)
  document.addEventListener('pointerup', active.handlePointerUp)
  document.addEventListener('pointercancel', active.handlePointerCancel)

  return true
}
