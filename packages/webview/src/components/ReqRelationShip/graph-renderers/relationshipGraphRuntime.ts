import { CanvasEvent, CommonEvent, EdgeEvent, Graph, GraphEvent, NodeEvent } from '@antv/g6'
import type { GraphData, IPointerEvent, NodeData, EdgeData } from '@antv/g6'
import { createG6GraphOptions, updateZoomCanvasOrigin } from './g6GraphOptions'
import { LatestTaskQueue } from './latestTaskQueue'
import { RelationshipCanvasPainter } from './relationshipCanvasPainter'
import { nodeDiameter, ParallelEdgeGeometry, sameTopology, validateRenderData } from './relationshipRenderData'
import type { RenderData } from './relationshipRenderData'
import { seedPositions, shouldAnimateLayout } from './relationshipLayout'
import type { LayoutRequest, LayoutResult } from './relationshipLayout'
import { RelationshipViewportIndex, shouldVirtualize, VIEWPORT_BUFFER } from './relationshipViewport'

export interface RenderInput {
  graphData: GraphData
  visibleEdgeIds: string[]
  edgeLabelsVisible: boolean
  focusNode: string | null
  layoutRevision: number
}
export interface RenderState {
  busy: boolean
  ready: boolean
  status: string
  error: string | null
  viewport?: { nodes: number; edges: number; totalNodes: number; totalEdges: number }
}
interface RuntimeCallbacks {
  state: (state: RenderState) => void
  click: (type: 'node' | 'edge' | null, datum?: NodeData | EdgeData) => void
  doubleClick: (id: string) => void
}
type WrittenElement = { source: NodeData | EdgeData; presentation: string }
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0))

export class RelationshipGraphRuntime {
  readonly graph: Graph
  private container: HTMLElement
  private callbacks: RuntimeCallbacks
  private queue: LatestTaskQueue
  private painter: RelationshipCanvasPainter
  private input?: RenderInput
  private rejectedInput?: RenderInput
  private data?: RenderData
  private visible = new Set<string>()
  private geometryCache = new ParallelEdgeGeometry()
  private geometry = new Map<string, { type: string; style: NonNullable<EdgeData['style']> }>()
  private writtenNodes = new Map<string, WrittenElement>()
  private writtenEdges = new Map<string, WrittenElement>()
  private positions = new Map<string, [number, number]>()
  private positionRevision = 0
  private viewportIndex = new RelationshipViewportIndex()
  private indexedData?: RenderData
  private indexedPositionRevision = -1
  private viewportRevision = 0
  private drawRevision = 0
  private viewportTimer: ReturnType<typeof setTimeout> | null = null
  private selected: string | null = null
  private active = new Set<string>()
  private version = 0
  private needsLayout = false
  private layoutRunning = false
  private worker: Worker | null = null
  private cancelInitial: (() => void) | null = null
  private workerTimeout: ReturnType<typeof setTimeout> | null = null
  private disposed = false
  private initialized = false
  private large: boolean | undefined
  private userMoved = false
  private fitting = false
  private fitRequested = false
  private transforming = false
  private dragging = false
  private panEdge: string | null = null
  private transformTimer: ReturnType<typeof setTimeout> | null = null
  private resizeObserver: ResizeObserver
  private size: [number, number] | null = null
  private fullscreen: boolean
  private state: RenderState = { busy: false, ready: false, status: '', error: null }

  constructor(container: HTMLElement, callbacks: RuntimeCallbacks) {
    this.container = container
    this.callbacks = callbacks
    this.fullscreen = this.isFullscreen()
    this.graph = new Graph({ container, ...createG6GraphOptions(container) })
    this.painter = new RelationshipCanvasPainter(this.graph, container)
    this.queue = new LatestTaskQueue(() => this.flush(), error => {
      if (this.disposed) return
      this.cancelLayout()
      this.publish({ busy: false, error: error instanceof Error ? error.message : String(error) })
    })
    this.graph.on(NodeEvent.CLICK, this.onClick)
    this.graph.on(EdgeEvent.CLICK, this.onClick)
    this.graph.on(CanvasEvent.CLICK, this.onCanvasClick)
    this.graph.on(NodeEvent.DBLCLICK, this.onDoubleClick)
    this.graph.on(NodeEvent.DRAG_START, this.onDragStart)
    this.graph.on(NodeEvent.DRAG_END, this.onDragEnd)
    this.graph.on(CommonEvent.DRAG_START, this.onPanStart)
    this.graph.on(CommonEvent.DRAG_END, this.onPanEnd)
    this.graph.on(GraphEvent.BEFORE_TRANSFORM, this.onTransformStart)
    this.graph.on(GraphEvent.AFTER_TRANSFORM, this.onTransformEnd)
    this.resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth <= 0 || container.clientHeight <= 0) return
      this.size = [container.clientWidth, container.clientHeight]
      const fullscreen = this.isFullscreen()
      this.fitRequested ||= fullscreen !== this.fullscreen
      this.fullscreen = fullscreen
      this.queue.request()
    })
    this.resizeObserver.observe(container)
  }

  setInput(input: RenderInput) {
    try {
      const next = input.graphData === this.input?.graphData && this.data
        ? this.data : validateRenderData(input.graphData)
      const changed = !sameTopology(this.data, next)
      if (changed) {
        this.version++
        this.cancelLayout()
        this.needsLayout = true
        this.geometry = this.geometryCache.update(next.edges)
        this.fitRequested = !this.data || ![...next.nodes.keys()].some(id => this.data?.nodes.has(id))
        if (this.fitRequested) this.userMoved = false
        this.publish({ busy: true, error: null, status: '正在准备关系图' })
        this.selected = null
        this.active.clear()
        this.callbacks.click(null)
      }
      this.data = next
      for (const id of this.positions.keys()) if (!next.nodes.has(id)) this.positions.delete(id)
      this.input = input
      if (this.rejectedInput) this.publish({ error: null })
      this.rejectedInput = undefined
      this.visible = new Set(input.visibleEdgeIds)
      this.queue.request()
    } catch (error) {
      this.rejectedInput = input
      this.publish({ error: error instanceof Error ? error.message : String(error) })
    }
  }

  retry() {
    if (this.rejectedInput) { this.setInput(this.rejectedInput); return }
    if (!this.input) return
    this.cancelLayout()
    this.version++
    this.needsLayout = true
    this.publish({ busy: true, error: null, status: '正在重新整理布局' })
    this.queue.request()
  }

  private publish(patch: Partial<RenderState>) {
    if (this.disposed) return
    this.state = { ...this.state, ...patch }
    this.callbacks.state(this.state)
  }

  private isFullscreen() {
    return !!this.container.closest('.req-relationship-content--fullscreen')
  }

  private current(version: number) {
    return !this.disposed && version === this.version
  }

  private capturePositions() {
    let changed = false
    for (const node of this.graph.getNodeData()) {
      const x = node.style?.x
      const y = node.style?.y
      if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) {
        const previous = this.positions.get(node.id)
        if (previous?.[0] !== x || previous?.[1] !== y) {
          this.positions.set(node.id, [x, y])
          changed = true
        }
      }
    }
    if (changed) this.positionRevision++
  }

  private isVirtual() {
    return !!this.data && shouldVirtualize(this.data.nodes.size, this.data.edges.size)
  }

  private canDraw(version: number) {
    return this.current(version) && this.drawRevision === this.viewportRevision
  }

  private cancelLayout() {
    this.worker?.terminate()
    this.worker = null
    if (this.workerTimeout) clearTimeout(this.workerTimeout)
    this.workerTimeout = null
    this.cancelInitial?.()
    this.cancelInitial = null
    this.layoutRunning = false
  }

  private acceptPositions(request: LayoutRequest, result: LayoutResult) {
    if (!this.current(result.version)) return
    this.positionRevision++
    request.nodes.forEach((node, index) => {
      this.positions.set(node.id, [result.positions[index * 2], result.positions[index * 2 + 1]])
    })
  }

  private async fallback(request: LayoutRequest) {
    const generator = seedPositions(request)
    let step = generator.next()
    while (!step.done) {
      if (!this.current(request.version)) return
      const start = performance.now()
      do { step = generator.next() } while (!step.done && performance.now() - start < 8)
      await pause()
    }
    if (this.current(request.version)) this.acceptPositions(request, {
      version: request.version, status: 'initial', positions: step.value, elapsedMs: 0,
    })
  }

  private async startLayout(data: RenderData, version: number) {
    this.capturePositions()
    const request: LayoutRequest = {
      version, focusNode: this.input?.focusNode || null,
      animate: shouldAnimateLayout(data.nodes.size, data.edges.size, window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      nodes: [...data.nodes.values()].map(node => {
        const position = this.positions.get(node.id)
        return { id: node.id, size: nodeDiameter(node.style?.size), x: position?.[0], y: position?.[1] }
      }),
      edges: [...data.edges.values()].map(edge => ({ source: edge.source, target: edge.target })),
    }
    this.layoutRunning = true
    await new Promise<void>(resolve => {
      let initialReceived = false
      let settled = false
      const release = () => { if (!settled) { settled = true; resolve() } }
      this.cancelInitial = release
      const fail = (message: string) => {
        if (!this.current(version)) { release(); return }
        this.worker?.terminate()
        this.worker = null
        if (this.workerTimeout) clearTimeout(this.workerTimeout)
        this.workerTimeout = null
        this.layoutRunning = false
        this.publish({ error: `后台布局失败：${message}。保留基础位置，可重试。`, status: '已使用基础布局' })
        if (initialReceived) { release(); this.queue.request() }
        else void this.fallback(request).then(release).catch(error => {
          this.publish({ error: String(error), busy: false })
          release()
        })
      }
      try {
        const worker = new Worker(new URL('./relationshipLayout.worker.ts', import.meta.url), { type: 'module' })
        this.worker = worker
        this.workerTimeout = setTimeout(() => fail('计算超时'), 12000)
        worker.onerror = event => { event.preventDefault(); fail(event.message) }
        worker.onmessageerror = () => fail('无法读取布局结果')
        worker.onmessage = ({ data: result }: MessageEvent<LayoutResult | { version: number; error: string }>) => {
          if (!this.current(result.version) || this.worker !== worker) return
          if ('error' in result) { fail(result.error); return }
          if (result.status === 'initial') {
            initialReceived = true
            this.acceptPositions(request, result)
            release()
          } else if (result.status === 'tick') {
            this.acceptPositions(request, result)
            this.queue.request()
          } else {
            this.acceptPositions(request, result)
            this.layoutRunning = false
            worker.terminate()
            this.worker = null
            if (this.workerTimeout) clearTimeout(this.workerTimeout)
            this.workerTimeout = null
            this.publish({ status: result.status === 'converged' ? '布局已收敛' : '已达到布局计算预算' })
            if (!this.userMoved) this.fitRequested = true
            this.queue.request()
          }
        }
        worker.postMessage(request)
      } catch (error) { fail(String(error)) }
    })
  }

  private async batches<T>(items: T[], size: number, version: number, apply: (batch: T[]) => void) {
    const minimumSize = size
    for (let index = 0; index < items.length;) {
      if (!this.canDraw(version)) return
      const batch = items.slice(index, index + size)
      const start = performance.now()
      apply(batch)
      await this.graph.draw()
      if (!this.canDraw(version)) return
      if (!this.state.ready) { this.painter.paint(); this.publish({ ready: true }) }
      index += batch.length
      const elapsed = performance.now() - start
      // G6 repaints the canvas after yielding. Tiny batches repeatedly repaint all
      // previously added edges, so never shrink below the initial batch size.
      size = Math.max(minimumSize, Math.min(4000, Math.round(size * Math.min(2, 80 / Math.max(elapsed, 1)))))
      await pause()
    }
  }

  private async flush() {
    if (this.disposed || this.dragging || !this.data || !this.input) return
    const version = this.version
    const data = this.data
    this.drawRevision = this.viewportRevision
    const virtual = this.isVirtual()
    if (!this.initialized) {
      await this.graph.render()
      this.initialized = true
      if (!this.current(version)) return
    }
    if (this.size) {
      this.graph.resize(...this.size)
      this.size = null
      // Resizing clears the backing canvases without an AFTER_DRAW event. Auto
      // rendering is disabled, so repaint even when graph data has not changed.
      // This also discards a navigation snapshot captured at the old dimensions.
      this.painter.paint(true)
      updateZoomCanvasOrigin(this.graph, this.container)
    }
    if (this.needsLayout) {
      this.needsLayout = false
      await this.startLayout(data, version)
      if (!this.current(version)) return
    }
    // Virtual views start at readable scale around the focus, never fit the loaded
    // subset (which would keep changing as the user navigates).
    if (this.fitRequested && this.positions.size && (virtual || !this.state.ready)) {
        this.fitRequested = false
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const id of data.nodes.keys()) {
          const position = this.positions.get(id)
          if (!position) continue
          minX = Math.min(minX, position[0])
          maxX = Math.max(maxX, position[0])
          minY = Math.min(minY, position[1])
          maxY = Math.max(maxY, position[1])
        }
        const zoom = virtual ? (this.userMoved ? this.graph.getZoom() : 1) : Math.min(1, Math.max(0.0001, Math.min(
          Math.max(1, this.container.clientWidth - 112) / (maxX - minX + 80),
          Math.max(1, this.container.clientHeight - 112) / (maxY - minY + 80),
        )))
        this.fitting = true
        try {
          await this.graph.zoomTo(zoom, false)
          if (!this.current(version)) return
          const focus = virtual && this.positions.get(this.input.focusNode || data.nodes.keys().next().value || '')
          const center = this.graph.getViewportByCanvas(focus || [(minX + maxX) / 2, (minY + maxY) / 2])
          await this.graph.translateBy([
            this.container.clientWidth / 2 - center[0],
            this.container.clientHeight / 2 - center[1],
          ], false)
        } finally { this.fitting = false }
    }
    if (!this.canDraw(version)) return
    if (this.large !== data.large) {
      this.large = data.large
      this.graph.getCanvas().getRenderer('main').setConfig({
        enableDirtyRectangleRendering: false,
        enableRenderingOptimization: false,
      })
      this.graph.setPlugins(data.large ? [] : [{ type: 'grid-line', key: 'relationship-grid', size: 20, stroke: '#0001', follow: true }])
    }
    // Composite the last frame between viewport updates. A completed virtual
    // update below repaints at the current camera, including newly loaded content.
    this.painter.setLarge(data.large)
    let residentNodes: Set<string>, residentEdges: Set<string>, visibleNodes: Set<string>
    if (virtual) {
      if (this.indexedData !== data || this.indexedPositionRevision !== this.positionRevision) {
        this.viewportIndex.rebuild(data, this.positions, this.geometry)
        this.indexedData = data
        this.indexedPositionRevision = this.positionRevision
      }
      const a = this.graph.getCanvasByViewport([-VIEWPORT_BUFFER, -VIEWPORT_BUFFER])
      const b = this.graph.getCanvasByViewport([this.container.clientWidth + VIEWPORT_BUFFER, this.container.clientHeight + VIEWPORT_BUFFER])
      const view = this.viewportIndex.select({ minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minY: Math.min(a[1], b[1]), maxY: Math.max(a[1], b[1]) }, data, this.visible)
      residentNodes = view.nodes; residentEdges = view.edges; visibleNodes = view.visibleNodes
      // The drag plugin dispatches the rest of a gesture to its original edge.
      // Retain that object until pointer-up, even if it leaves the buffer.
      const panEdge = this.panEdge && data.edges.get(this.panEdge)
      if (panEdge) {
        residentEdges.add(panEdge.id)
        residentNodes.add(panEdge.source); residentNodes.add(panEdge.target)
      }
    } else {
      residentNodes = new Set(data.nodes.keys()); residentEdges = new Set(data.edges.keys()); visibleNodes = residentNodes
    }
    // Remove retargeted edges before removing their old endpoint nodes. G6 deletes
    // incident edges with a node, even when that edge ID exists in the next graph.
    const removeEdges = [...this.writtenEdges].filter(([id, written]) => {
      const next = data.edges.get(id)
      const previous = written.source as EdgeData
      return !next || !residentEdges.has(id) || previous.source !== next.source || previous.target !== next.target
    }).map(([id]) => id)
    await this.batches(removeEdges, 500, version, ids => {
      this.graph.removeEdgeData(ids)
      ids.forEach(id => this.writtenEdges.delete(id))
    })
    const removeNodes = [...this.writtenNodes.keys()].filter(id => !residentNodes.has(id))
    await this.batches(removeNodes, 300, version, ids => {
      this.graph.removeNodeData(ids)
      ids.forEach(id => this.writtenNodes.delete(id))
    })
    if (!this.canDraw(version)) return
    const positionRevision = this.positionRevision
    const nodeChanges: { node: NodeData; source: NodeData; presentation: string }[] = []
    const showNodeLabels = !data.large || this.graph.getZoom() >= 0.7
    for (const [id, source] of data.nodes) {
      if (!residentNodes.has(id)) continue
      const [x, y] = this.positions.get(id) || [0, 0]
      const label = (!this.transforming && showNodeLabels) || id === this.selected
      const state = id === this.selected ? 'active' : this.active.has(id) ? 'neighborActive' : ''
      const visibility = visibleNodes.has(id) ? 'visible' : 'hidden'
      const presentation = `${x},${y},${label},${state},${visibility}`
      const previous = this.writtenNodes.get(id)
      if (previous?.source === source && previous.presentation === presentation) continue
      nodeChanges.push({ source, presentation, node: { ...source, states: state ? [state] : [], style: { zIndex: 1, ...source.style, x, y, label, visibility } } })
    }
    await this.batches(nodeChanges, 300, version, batch => {
      this.graph.addNodeData(batch.filter(item => !this.writtenNodes.has(item.node.id)).map(item => item.node))
      this.graph.updateNodeData(batch.filter(item => this.writtenNodes.has(item.node.id)).map(item => item.node))
      batch.forEach(item => this.writtenNodes.set(item.node.id, { source: item.source, presentation: item.presentation }))
    })
    if (!this.canDraw(version)) return
    const edgeChanges: { edge: EdgeData & { id: string }; source: EdgeData; presentation: string }[] = []
    for (const [id, source] of data.edges) {
      if (!residentEdges.has(id)) continue
      const geometry = this.geometry.get(id)
      const visible = this.visible.has(id)
      const label = this.input.edgeLabelsVisible && !this.transforming
      const state = id === this.selected ? 'active' : this.active.has(id) ? 'neighborActive' : ''
      const presentation = `${visible},${label},${state},${JSON.stringify(geometry)}`
      const previous = this.writtenEdges.get(id)
      if (previous?.source === source && previous.presentation === presentation) continue
      edgeChanges.push({ source, presentation, edge: {
        ...source, type: geometry?.type || source.type, states: state ? [state] : [],
        style: { zIndex: 0, ...source.style, ...geometry?.style, label, visibility: visible ? 'visible' : 'hidden' },
      } })
    }
    await this.batches(edgeChanges, 500, version, batch => {
      this.graph.addEdgeData(batch.filter(item => !this.writtenEdges.has(item.edge.id)).map(item => item.edge))
      this.graph.updateEdgeData(batch.filter(item => this.writtenEdges.has(item.edge.id)).map(item => item.edge))
      batch.forEach(item => this.writtenEdges.set(item.edge.id, { source: item.source, presentation: item.presentation }))
    })
    if (!this.canDraw(version)) return
    const positionsCurrent = positionRevision === this.positionRevision
    if (!virtual && this.fitRequested && positionsCurrent && !this.fitting && data.nodes.size) {
      this.fitRequested = false
      this.fitting = true
      try { await this.graph.fitView({ when: 'always', direction: 'both' }, false) }
      finally { this.fitting = false }
      if (!this.current(version)) return
    }
    if (!this.transforming || virtual) this.painter.paint()
    this.publish({ busy: this.layoutRunning || !positionsCurrent, ready: data.nodes.size > 0,
      viewport: virtual ? { nodes: visibleNodes.size, edges: residentEdges.size, totalNodes: data.nodes.size, totalEdges: data.edges.size } : undefined,
    })
  }

  private onClick = (event: IPointerEvent) => {
    if (event.targetType !== 'node' && event.targetType !== 'edge') return
    const id = pointerTargetId(event)
    if (!id) return
    this.selected = this.selected === id ? null : id
    this.active.clear()
    if (this.selected && event.targetType === 'node') {
      this.data?.neighbors.get(id)?.forEach(value => this.active.add(value))
      this.data?.incidentEdges.get(id)?.forEach(value => this.active.add(value))
    } else if (this.selected) {
      const edge = this.data?.edges.get(id)
      if (edge) { this.active.add(edge.source); this.active.add(edge.target) }
    }
    this.callbacks.click(event.targetType, this.graph.getElementData(id))
    this.queue.request()
  }

  private onCanvasClick = () => {
    this.selected = null
    this.active.clear()
    this.callbacks.click(null)
    this.queue.request()
  }

  private onDoubleClick = (event: IPointerEvent) => {
    const id = pointerTargetId(event)
    if (id) this.callbacks.doubleClick(id)
  }

  private onDragStart = () => {
    this.dragging = true
    this.cancelLayout()
    this.version++
    this.needsLayout = false
    this.publish({ busy: false, status: '已停止布局，可拖动节点' })
  }

  private onPanStart = (event: IPointerEvent) => {
    if (event.targetType === 'edge') this.panEdge = pointerTargetId(event)
  }

  private onPanEnd = () => {
    if (!this.panEdge) return
    this.panEdge = null
    this.queue.request()
  }

  private onDragEnd = () => {
    this.dragging = false
    this.capturePositions()
    this.queue.request()
  }

  private onTransformStart = () => {
    // G6 initializes its camera during the first render; this is not a user pan.
    if (this.fitting || !this.initialized) return
    this.userMoved = true
    if (!this.data?.large || this.transforming) return
    this.transforming = true
    this.queue.request()
  }

  private onTransformEnd = () => {
    if (this.fitting || !this.initialized) return
    if (this.isVirtual()) {
      this.viewportRevision++
      if (!this.viewportTimer) this.viewportTimer = setTimeout(() => {
        this.viewportTimer = null
        this.queue.request()
      }, 50)
    }
    if (this.transformTimer) clearTimeout(this.transformTimer)
    this.transformTimer = setTimeout(() => {
      this.transforming = false
      this.queue.request()
    }, 150)
  }

  destroy() {
    this.disposed = true
    this.version++
    this.cancelLayout()
    this.queue.dispose()
    this.painter.destroy()
    this.resizeObserver.disconnect()
    if (this.transformTimer) clearTimeout(this.transformTimer)
    if (this.viewportTimer) clearTimeout(this.viewportTimer)
    this.graph.destroy()
    this.positions.clear()
    this.writtenNodes.clear()
    this.writtenEdges.clear()
  }
}

function pointerTargetId(event: IPointerEvent) {
  return 'id' in event.target && typeof event.target.id === 'string' ? event.target.id : null
}
