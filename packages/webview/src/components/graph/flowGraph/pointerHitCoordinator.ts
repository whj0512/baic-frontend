import type { CellView, Edge, EdgeView, Graph, Node } from '@antv/x6'
import {
  ensureNodeConnectionPorts,
  isSequenceEdgeMode,
  setNodeConnectionHotAreaVisible,
} from '../edgeConnection'
import type { GraphStrategy } from '../strategies/types'
import { isPreConnectionPreview } from './preConnectionData'
import { isSequenceConnectionPreview } from './sequenceConnectionData'

type LogicalHit =
  | { type: 'port'; node: Node }
  | { type: 'node'; node: Node }
  | { type: 'edge'; view: EdgeView }
  | { type: 'blank' }

type RankedView = {
  rank: number
  view: CellView
}

type EdgeIndexEntry = {
  buckets: Set<string>
  view: EdgeView
}

type EdgeCandidate = {
  distance: number
  domRank: number
  view: EdgeView
  zIndex: number
}

const EDGE_INDEX_GRID_SIZE = 96
const EDGE_VISIBLE_TOLERANCE_PX = 3
const EDGE_HIT_TOLERANCE_PX = 8
const EDGE_HOT_AREA_WIDTH = 16
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const SPECIAL_INTERACTION_SELECTOR = [
  'button',
  'input',
  'textarea',
  'select',
  'a',
  '[contenteditable="true"]',
  '[data-sequence-lifeline-magnet]',
  '.x6-cell-tools',
  '.x6-edge-tool',
  '.x6-widget-transform',
  '.x6-widget-selection-box',
].join(',')

const isEdgeHotAreaElement = (element: Element) => (
  element.classList.contains('flow-graph-edge-hot-area')
)

const isVisibleMagnet = (element: Element) => {
  const magnet = element.closest('[magnet="true"], [magnet="passive"]') as SVGElement | null
  if (!magnet) return false

  const style = window.getComputedStyle(magnet)
  return style.pointerEvents !== 'none' && style.visibility !== 'hidden' && style.display !== 'none'
}

const collectRankedViews = (graph: Graph, elements: Element[]) => {
  const views = new Map<string, RankedView>()

  elements.forEach((element, rank) => {
    if (isEdgeHotAreaElement(element)) return
    const view = graph.findViewByElem(element)
    if (!view || views.has(view.cell.id)) return
    views.set(view.cell.id, { rank, view })
  })

  return [...views.values()]
}

const isPointInPolygon = (
  x: number,
  y: number,
  points: Array<[number, number]>,
) => {
  let inside = false

  for (let current = 0, previous = points.length - 1; current < points.length; previous = current++) {
    const [currentX, currentY] = points[current]
    const [previousX, previousY] = points[previous]
    const crosses = (currentY > y) !== (previousY > y)
      && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX
    if (crosses) inside = !inside
  }

  return inside
}

const containsNodePoint = (node: Node, x: number, y: number) => {
  const bbox = node.getBBox()
  if (!bbox.containsPoint({ x, y }) || bbox.width === 0 || bbox.height === 0) return false

  const localX = (x - bbox.x) / bbox.width
  const localY = (y - bbox.y) / bbox.height

  if (node.shape === 'start-node' || node.shape === 'then-node') {
    const dx = localX - 0.5
    const dy = localY - 0.5
    return dx * dx + dy * dy <= 0.25
  }

  if (node.shape === 'condition-node') {
    return Math.abs(localX - 0.5) + Math.abs(localY - 0.5) <= 0.5
  }

  if (node.shape === 'goto-node') {
    return isPointInPolygon(localX, localY, [
      [0, 0],
      [0.75, 0],
      [1, 0.5],
      [0.75, 1],
      [0, 1],
    ])
  }

  return true
}

const getGridKey = (x: number, y: number) => `${x}:${y}`

const getGridRange = (x: number, y: number, width: number, height: number) => ({
  minX: Math.floor(x / EDGE_INDEX_GRID_SIZE),
  maxX: Math.floor((x + width) / EDGE_INDEX_GRID_SIZE),
  minY: Math.floor(y / EDGE_INDEX_GRID_SIZE),
  maxY: Math.floor((y + height) / EDGE_INDEX_GRID_SIZE),
})

const isIndexableEdge = (edge: Edge) => (
  edge.isVisible()
  && !isPreConnectionPreview(edge)
  && !isSequenceConnectionPreview(edge)
)

const compareDomOrder = (left: EdgeView, right: EdgeView) => {
  if (left.container === right.container) return 0
  const position = left.container.compareDocumentPosition(right.container)
  if ((position & 4) !== 0) return 1
  if ((position & 2) !== 0) return -1
  return 0
}

const compareEdgeCandidates = (left: EdgeCandidate, right: EdgeCandidate) => (
  left.distance - right.distance
  || right.zIndex - left.zIndex
  || left.domRank - right.domRank
  || compareDomOrder(left.view, right.view)
  || left.view.cell.id.localeCompare(right.view.cell.id)
)

export const registerPointerHitCoordinator = (
  graph: Graph,
  strategy: GraphStrategy,
  readOnly: boolean,
) => {
  const container = graph.container
  const connectionHotAreasEnabled = !readOnly && !isSequenceEdgeMode(strategy)
  const edgeBuckets = new Map<string, Map<string, EdgeView>>()
  const edgeIndexEntries = new Map<string, EdgeIndexEntry>()
  const dirtyEdgeIds = new Set<string>()
  const renderPendingEdgeIds = new Set<string>()
  let edgeIndexInitialized = false
  let edgeIndexFrameId: number | null = null
  let frameId: number | null = null
  let releaseFrameId: number | null = null
  let pendingPoint: { clientX: number; clientY: number } | null = null
  let interactionLocked = false
  let lockedEdgeView: EdgeView | null = null
  let activeHotAreaNode: Node | null = null
  let activeHotAreaEdgeView: EdgeView | null = null
  let edgeHotArea: SVGPathElement | null = null
  let cursorElement: HTMLElement | SVGElement | null = null
  let previousInlineCursor = ''
  let activeCursor = ''

  const restoreCursor = () => {
    if (!cursorElement) return
    cursorElement.style.cursor = previousInlineCursor
    cursorElement = null
    previousInlineCursor = ''
    activeCursor = ''
  }

  const setCursor = (element: Element | undefined, cursor?: string) => {
    if (element === cursorElement && cursor === activeCursor) return
    restoreCursor()
    if (!element || !cursor || !(element instanceof HTMLElement || element instanceof SVGElement)) return

    cursorElement = element
    previousInlineCursor = element.style.cursor
    activeCursor = cursor
    element.style.cursor = cursor
  }

  const setActiveHotAreaNode = (node: Node | null) => {
    if (!connectionHotAreasEnabled) return
    if (activeHotAreaNode?.id === node?.id) return

    if (activeHotAreaNode) setNodeConnectionHotAreaVisible(graph, activeHotAreaNode, false)
    activeHotAreaNode = node
    if (activeHotAreaNode) setNodeConnectionHotAreaVisible(graph, activeHotAreaNode, true)
  }

  const removeEdgeHotArea = () => {
    edgeHotArea?.remove()
    edgeHotArea = null
    activeHotAreaEdgeView = null
  }

  const setActiveHotAreaEdge = (view: EdgeView | null) => {
    if (!view || !graph.getCellById(view.cell.id) || !isIndexableEdge(view.cell as Edge)) {
      removeEdgeHotArea()
      return
    }

    if (!edgeHotArea) {
      edgeHotArea = document.createElementNS(SVG_NAMESPACE, 'path')
      edgeHotArea.classList.add('x6-cell', 'x6-edge', 'flow-graph-edge-hot-area')
      edgeHotArea.setAttribute('fill', 'none')
      edgeHotArea.setAttribute('stroke', 'transparent')
      edgeHotArea.setAttribute('stroke-linecap', 'round')
      edgeHotArea.setAttribute('stroke-linejoin', 'round')
      edgeHotArea.setAttribute('pointer-events', 'stroke')
      edgeHotArea.setAttribute('stroke-width', `${EDGE_HOT_AREA_WIDTH}`)
      edgeHotArea.setAttribute('vector-effect', 'non-scaling-stroke')
      edgeHotArea.style.cursor = readOnly ? 'default' : 'move'
      graph.view.overlay.appendChild(edgeHotArea)
    }

    activeHotAreaEdgeView = view
    edgeHotArea.setAttribute('data-cell-id', view.cell.id)
    edgeHotArea.setAttribute('data-shape', view.cell.shape)
    edgeHotArea.setAttribute('d', view.getConnectionPathData())
  }

  const removeEdgeIndexEntry = (edgeId: string) => {
    const entry = edgeIndexEntries.get(edgeId)
    if (!entry) return

    entry.buckets.forEach((key) => {
      const bucket = edgeBuckets.get(key)
      bucket?.delete(edgeId)
      if (bucket?.size === 0) edgeBuckets.delete(key)
    })
    edgeIndexEntries.delete(edgeId)
  }

  const addSegmentToIndex = (
    view: EdgeView,
    buckets: Set<string>,
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    const range = getGridRange(x, y, Math.abs(end.x - start.x), Math.abs(end.y - start.y))

    for (let gridX = range.minX; gridX <= range.maxX; gridX += 1) {
      for (let gridY = range.minY; gridY <= range.maxY; gridY += 1) {
        const key = getGridKey(gridX, gridY)
        let bucket = edgeBuckets.get(key)
        if (!bucket) {
          bucket = new Map<string, EdgeView>()
          edgeBuckets.set(key, bucket)
        }
        bucket.set(view.cell.id, view)
        buckets.add(key)
      }
    }
  }

  const updateEdgeIndexEntry = (edgeId: string) => {
    removeEdgeIndexEntry(edgeId)
    const edge = graph.getCellById(edgeId)
    if (!edge?.isEdge() || !isIndexableEdge(edge)) return

    const view = graph.findViewByCell(edge)
    if (!view?.isEdgeView()) return

    const connection = view.getConnection()
    if (!connection) return
    const polylines = connection.toPoints({
      segmentSubdivisions: view.getConnectionSubdivisions(),
    })
    if (!polylines) return

    const buckets = new Set<string>()
    polylines.forEach((points) => {
      for (let index = 1; index < points.length; index += 1) {
        addSegmentToIndex(view, buckets, points[index - 1], points[index])
      }
    })

    if (buckets.size > 0) edgeIndexEntries.set(edgeId, { buckets, view })
  }

  const buildEdgeIndex = () => {
    edgeBuckets.clear()
    edgeIndexEntries.clear()
    dirtyEdgeIds.clear()
    graph.getEdges().forEach(edge => updateEdgeIndexEntry(edge.id))
    edgeIndexInitialized = true
  }

  const flushDirtyEdgeIndex = () => {
    if (!edgeIndexInitialized) {
      buildEdgeIndex()
      return
    }

    const edgeIds = [...dirtyEdgeIds]
    dirtyEdgeIds.clear()
    edgeIds.forEach(updateEdgeIndexEntry)
  }

  const scheduleEdgeIndexUpdate = () => {
    if (edgeIndexFrameId !== null) return
    edgeIndexFrameId = requestAnimationFrame(() => {
      edgeIndexFrameId = null
      flushDirtyEdgeIndex()
    })
  }

  const markEdgeDirty = (edge: Edge) => {
    dirtyEdgeIds.add(edge.id)
    renderPendingEdgeIds.add(edge.id)
    scheduleEdgeIndexUpdate()
  }

  const markConnectedEdgesDirty = (node: Node) => {
    graph.getConnectedEdges(node).forEach(markEdgeDirty)
  }

  const getNearbyEdgeViews = (x: number, y: number, tolerance: number) => {
    if (!edgeIndexInitialized) buildEdgeIndex()
    else if (dirtyEdgeIds.size > 0) flushDirtyEdgeIndex()

    const range = getGridRange(x - tolerance, y - tolerance, tolerance * 2, tolerance * 2)
    const views = new Map<string, EdgeView>()
    for (let gridX = range.minX; gridX <= range.maxX; gridX += 1) {
      for (let gridY = range.minY; gridY <= range.maxY; gridY += 1) {
        edgeBuckets.get(getGridKey(gridX, gridY))?.forEach((view, edgeId) => {
          views.set(edgeId, view)
        })
      }
    }
    return [...views.values()]
  }

  const resolveLogicalHit = (
    elements: Element[],
    clientX: number,
    clientY: number,
  ): LogicalHit => {
    const rankedViews = collectRankedViews(graph, elements)
    const localPoint = graph.clientToLocal(clientX, clientY)

    for (const element of elements) {
      if (isEdgeHotAreaElement(element) || !isVisibleMagnet(element)) continue
      const view = graph.findViewByElem(element)
      if (view?.isNodeView()) return { type: 'port', node: view.cell as Node }
    }

    const zoom = Math.max(graph.zoom(), 0.01)
    const visibleTolerance = EDGE_VISIBLE_TOLERANCE_PX / zoom
    const hitTolerance = EDGE_HIT_TOLERANCE_PX / zoom
    const domRanks = new Map<string, number>()
    rankedViews.forEach(({ rank, view }) => domRanks.set(view.cell.id, rank))
    const edgeHit = getNearbyEdgeViews(localPoint.x, localPoint.y, hitTolerance)
      .map((view): EdgeCandidate => {
        const closestPoint = view.getClosestPoint(localPoint)
        return {
          distance: closestPoint?.distance(localPoint) ?? Number.POSITIVE_INFINITY,
          domRank: domRanks.get(view.cell.id) ?? Number.MAX_SAFE_INTEGER,
          view,
          zIndex: view.cell.getZIndex() ?? 0,
        }
      })
      .filter(({ distance }) => distance <= hitTolerance)
      .sort(compareEdgeCandidates)[0]

    if (edgeHit && edgeHit.distance <= visibleTolerance) {
      return { type: 'edge', view: edgeHit.view }
    }

    const nodeHit = rankedViews.find(({ view }) => (
      view.isNodeView() && containsNodePoint(view.cell as Node, localPoint.x, localPoint.y)
    ))
    if (nodeHit) return { type: 'node', node: nodeHit.view.cell as Node }

    return edgeHit ? { type: 'edge', view: edgeHit.view } : { type: 'blank' }
  }

  const getElementsAtPoint = (clientX: number, clientY: number) => (
    document.elementsFromPoint(clientX, clientY)
      .filter(element => container.contains(element))
  )

  const resolveAtPoint = (
    clientX: number,
    clientY: number,
    options: { lock?: boolean } = {},
  ) => {
    const elements = getElementsAtPoint(clientX, clientY)
    const interactionElement = elements.find(element => !isEdgeHotAreaElement(element))
    const specialElement = interactionElement?.closest(SPECIAL_INTERACTION_SELECTOR)

    if (specialElement) {
      restoreCursor()
      const specialView = graph.findViewByElem(specialElement)
      setActiveHotAreaNode(specialView?.isNodeView() ? specialView.cell as Node : null)
      removeEdgeHotArea()
      return { type: 'blank' } as LogicalHit
    }

    const hit = resolveLogicalHit(elements, clientX, clientY)
    setActiveHotAreaNode(hit.type === 'node' || hit.type === 'port' ? hit.node : null)
    setActiveHotAreaEdge(hit.type === 'edge' ? hit.view : null)

    const topElement = elements.find(element => !isEdgeHotAreaElement(element)) || elements[0]
    if (options.lock) {
      restoreCursor()
    } else if (hit.type === 'port') {
      restoreCursor()
    } else if (hit.type === 'node' || hit.type === 'edge') {
      setCursor(topElement, readOnly ? 'default' : 'move')
    } else {
      setCursor(topElement, 'grab')
    }

    return hit
  }

  const clearHoverState = () => {
    restoreCursor()
    setActiveHotAreaNode(null)
    removeEdgeHotArea()
  }

  const clear = () => {
    if (frameId !== null) cancelAnimationFrame(frameId)
    if (releaseFrameId !== null) cancelAnimationFrame(releaseFrameId)
    if (edgeIndexFrameId !== null) cancelAnimationFrame(edgeIndexFrameId)
    frameId = null
    releaseFrameId = null
    edgeIndexFrameId = null
    pendingPoint = null
    interactionLocked = false
    lockedEdgeView = null
    clearHoverState()
  }

  const update = () => {
    frameId = null
    const point = pendingPoint
    pendingPoint = null
    if (!point) return

    if (interactionLocked) {
      restoreCursor()
      setActiveHotAreaNode(null)
      setActiveHotAreaEdge(lockedEdgeView)
      return
    }

    resolveAtPoint(point.clientX, point.clientY)
  }

  const handlePointerMove = (event: PointerEvent) => {
    pendingPoint = { clientX: event.clientX, clientY: event.clientY }
    if (frameId === null) frameId = requestAnimationFrame(update)
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (frameId !== null) cancelAnimationFrame(frameId)
    if (releaseFrameId !== null) cancelAnimationFrame(releaseFrameId)
    frameId = null
    releaseFrameId = null
    pendingPoint = null

    const hit = resolveAtPoint(event.clientX, event.clientY, { lock: true })
    interactionLocked = true
    lockedEdgeView = hit.type === 'edge' ? hit.view : null
    setActiveHotAreaEdge(lockedEdgeView)
  }

  const releaseInteraction = (event: PointerEvent) => {
    if (!interactionLocked) return
    if (releaseFrameId !== null) cancelAnimationFrame(releaseFrameId)
    releaseFrameId = requestAnimationFrame(() => {
      releaseFrameId = null
      interactionLocked = false
      lockedEdgeView = null
      resolveAtPoint(event.clientX, event.clientY)
    })
  }

  const cancelInteraction = () => {
    interactionLocked = false
    lockedEdgeView = null
    clearHoverState()
  }

  const handlePointerLeave = () => {
    if (!interactionLocked) clearHoverState()
  }

  const handleEdgeAdded = ({ edge }: { edge: Edge }) => markEdgeDirty(edge)
  const handleEdgeRemoved = ({ edge }: { edge: Edge }) => {
    dirtyEdgeIds.delete(edge.id)
    renderPendingEdgeIds.delete(edge.id)
    removeEdgeIndexEntry(edge.id)
    if (activeHotAreaEdgeView?.cell.id === edge.id) removeEdgeHotArea()
    if (lockedEdgeView?.cell.id === edge.id) cancelInteraction()
  }
  const handleEdgeChanged = ({ edge }: { edge: Edge }) => markEdgeDirty(edge)
  const handleNodeChanged = ({ node }: { node: Node }) => markConnectedEdgesDirty(node)
  const handleNodeSizeChanged = ({ node }: { node: Node }) => {
    handleNodeChanged({ node })
    if (!connectionHotAreasEnabled) return

    ensureNodeConnectionPorts(node, strategy)
    if (activeHotAreaNode?.id === node.id) {
      setNodeConnectionHotAreaVisible(graph, node, true)
    }
  }
  const handleNodeRemoved = ({ node }: { node: Node }) => {
    if (activeHotAreaNode?.id === node.id) setActiveHotAreaNode(null)
  }
  const handleRenderDone = () => {
    if (!edgeIndexInitialized) {
      buildEdgeIndex()
    } else {
      renderPendingEdgeIds.forEach(edgeId => dirtyEdgeIds.add(edgeId))
      renderPendingEdgeIds.clear()
      if (dirtyEdgeIds.size > 0) flushDirtyEdgeIndex()
    }
    if (activeHotAreaNode) setNodeConnectionHotAreaVisible(graph, activeHotAreaNode, true)
    if (activeHotAreaEdgeView) setActiveHotAreaEdge(activeHotAreaEdgeView)
  }

  container.addEventListener('pointermove', handlePointerMove, true)
  container.addEventListener('pointerdown', handlePointerDown, true)
  container.addEventListener('pointerleave', handlePointerLeave, true)
  document.addEventListener('pointerup', releaseInteraction, true)
  document.addEventListener('pointercancel', cancelInteraction, true)
  graph.on('edge:added', handleEdgeAdded)
  graph.on('edge:removed', handleEdgeRemoved)
  graph.on('edge:change:source', handleEdgeChanged)
  graph.on('edge:change:target', handleEdgeChanged)
  graph.on('edge:change:vertices', handleEdgeChanged)
  graph.on('edge:change:router', handleEdgeChanged)
  graph.on('edge:change:connector', handleEdgeChanged)
  graph.on('edge:change:visible', handleEdgeChanged)
  graph.on('node:change:position', handleNodeChanged)
  graph.on('node:change:size', handleNodeSizeChanged)
  graph.on('node:change:angle', handleNodeChanged)
  graph.on('node:change:ports', handleNodeChanged)
  graph.on('node:removed', handleNodeRemoved)
  graph.on('render:done', handleRenderDone)

  return () => {
    container.removeEventListener('pointermove', handlePointerMove, true)
    container.removeEventListener('pointerdown', handlePointerDown, true)
    container.removeEventListener('pointerleave', handlePointerLeave, true)
    document.removeEventListener('pointerup', releaseInteraction, true)
    document.removeEventListener('pointercancel', cancelInteraction, true)
    graph.off('edge:added', handleEdgeAdded)
    graph.off('edge:removed', handleEdgeRemoved)
    graph.off('edge:change:source', handleEdgeChanged)
    graph.off('edge:change:target', handleEdgeChanged)
    graph.off('edge:change:vertices', handleEdgeChanged)
    graph.off('edge:change:router', handleEdgeChanged)
    graph.off('edge:change:connector', handleEdgeChanged)
    graph.off('edge:change:visible', handleEdgeChanged)
    graph.off('node:change:position', handleNodeChanged)
    graph.off('node:change:size', handleNodeSizeChanged)
    graph.off('node:change:angle', handleNodeChanged)
    graph.off('node:change:ports', handleNodeChanged)
    graph.off('node:removed', handleNodeRemoved)
    graph.off('render:done', handleRenderDone)
    clear()
    edgeBuckets.clear()
    edgeIndexEntries.clear()
    dirtyEdgeIds.clear()
    renderPendingEdgeIds.clear()
  }
}
