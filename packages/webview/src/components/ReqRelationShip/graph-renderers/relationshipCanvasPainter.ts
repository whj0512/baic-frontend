import { GraphEvent } from '@antv/g6'
import type { Graph } from '@antv/g6'

/** Coalesce raster paints independently of G6 model updates. During navigation the
 * browser composites the last complete frame; all elements are redrawn on settle. */
export class RelationshipCanvasPainter {
  private graph: Graph
  private container: HTMLElement
  private timer: ReturnType<typeof setTimeout> | null = null
  private settleTimer: ReturnType<typeof setTimeout> | null = null
  private snapshot: HTMLCanvasElement | null = null
  private layers: HTMLCanvasElement[] = []
  private origin: [number, number] = [0, 0]
  private zoom = 1
  private lastPaint = 0
  private dirty = false
  private large = false
  private disposed = false

  constructor(graph: Graph, container: HTMLElement) {
    this.graph = graph
    this.container = container
    graph.on(GraphEvent.AFTER_DRAW, this.request)
    graph.on(GraphEvent.BEFORE_TRANSFORM, this.beforeTransform)
    graph.on(GraphEvent.AFTER_TRANSFORM, this.afterTransform)
  }

  setLarge(large: boolean) { this.large = large }

  request = () => {
    this.dirty = true
    if (this.disposed || this.snapshot || this.timer) return
    const wait = this.large ? Math.max(0, 500 - (performance.now() - this.lastPaint)) : 0
    this.timer = setTimeout(() => { this.timer = null; this.paint() }, wait)
  }

  paint(force = false) {
    if (this.disposed || this.graph.destroyed) return
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.dirty || force) {
      for (const canvas of Object.values(this.graph.getCanvas().getLayers())) canvas.render()
      this.lastPaint = performance.now()
      this.dirty = false
    }
    this.clearSnapshot()
  }

  private beforeTransform = () => {
    if (!this.large || this.snapshot || !this.lastPaint) return
    const snapshot = document.createElement('canvas')
    const ratio = window.devicePixelRatio || 1
    snapshot.width = this.container.clientWidth * ratio
    snapshot.height = this.container.clientHeight * ratio
    Object.assign(snapshot.style, {
      position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
      pointerEvents: 'none', transformOrigin: '0 0', zIndex: '1',
    })
    const context = snapshot.getContext('2d')
    if (!context) return
    this.layers = Array.from(this.container.querySelectorAll('canvas'))
    for (const layer of this.layers) {
      context.drawImage(layer, 0, 0, snapshot.width, snapshot.height)
      // Preserve the original hit-test surface and its coordinate system.
      layer.style.opacity = '0'
    }
    this.origin = this.graph.getViewportByCanvas([0, 0]) as [number, number]
    this.zoom = this.graph.getZoom()
    this.snapshot = snapshot
    this.container.append(snapshot)
  }

  private afterTransform = () => {
    this.dirty = true
    if (!this.snapshot) { this.request(); return }
    const scale = this.graph.getZoom() / this.zoom
    const [x, y] = this.graph.getViewportByCanvas([0, 0])
    this.snapshot.style.transform = `translate(${x - this.origin[0] * scale}px, ${y - this.origin[1] * scale}px) scale(${scale})`
    if (this.settleTimer) clearTimeout(this.settleTimer)
    this.settleTimer = setTimeout(() => { this.settleTimer = null; this.paint() }, 150)
  }

  private clearSnapshot() {
    this.snapshot?.remove()
    this.snapshot = null
    this.layers.forEach(layer => { layer.style.opacity = '' })
    this.layers = []
  }

  destroy() {
    this.disposed = true
    if (this.timer) clearTimeout(this.timer)
    if (this.settleTimer) clearTimeout(this.settleTimer)
    this.clearSnapshot()
    this.graph.off(GraphEvent.AFTER_DRAW, this.request)
    this.graph.off(GraphEvent.BEFORE_TRANSFORM, this.beforeTransform)
    this.graph.off(GraphEvent.AFTER_TRANSFORM, this.afterTransform)
  }
}
