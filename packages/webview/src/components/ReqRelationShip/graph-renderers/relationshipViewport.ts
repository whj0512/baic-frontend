import type { EdgeData } from '@antv/g6'
import type { RenderData } from './relationshipRenderData'

export interface ViewBounds { minX: number; minY: number; maxX: number; maxY: number }
type Point = readonly [number, number]
interface Entry extends ViewBounds { id: string; start?: Point; end?: Point; padding?: number }
interface Branch extends ViewBounds { entries?: Entry[]; left?: Branch; right?: Branch }

export const VIEWPORT_BUFFER = 240
export const shouldVirtualize = (nodes: number, edges: number) => nodes >= 3000 || edges >= 10000

const intersects = (a: ViewBounds, b: ViewBounds) => a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
const expand = (box: ViewBounds, padding: number): ViewBounds => ({
  minX: box.minX - padding, minY: box.minY - padding, maxX: box.maxX + padding, maxY: box.maxY + padding,
})

/** A packed bounding-volume tree avoids scanning all edges on every pan. Long
 * edges occupy a single entry rather than thousands of spatial-grid cells. */
function build(entries: Entry[]): Branch | undefined {
  if (!entries.length) return undefined
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const entry of entries) {
    box.minX = Math.min(box.minX, entry.minX); box.minY = Math.min(box.minY, entry.minY)
    box.maxX = Math.max(box.maxX, entry.maxX); box.maxY = Math.max(box.maxY, entry.maxY)
  }
  if (entries.length <= 16) return { ...box, entries }
  const horizontal = box.maxX - box.minX >= box.maxY - box.minY
  entries.sort((a, b) => horizontal ? (a.minX + a.maxX) - (b.minX + b.maxX) : (a.minY + a.maxY) - (b.minY + b.maxY))
  const middle = Math.floor(entries.length / 2)
  return { ...box, left: build(entries.slice(0, middle)), right: build(entries.slice(middle)) }
}

function query(tree: Branch | undefined, bounds: ViewBounds, visit: (entry: Entry) => void) {
  if (!tree || !intersects(tree, bounds)) return
  if (tree.entries) {
    for (const entry of tree.entries) if (intersects(entry, bounds)) visit(entry)
  } else { query(tree.left, bounds, visit); query(tree.right, bounds, visit) }
}

// Slab clipping also catches lines crossing the viewport with both ends outside.
export function segmentIntersects(start: Point, end: Point, bounds: ViewBounds): boolean {
  let enter = 0, leave = 1
  for (const [index, min, max] of [[0, bounds.minX, bounds.maxX], [1, bounds.minY, bounds.maxY]]) {
    const delta = end[index] - start[index]
    if (delta === 0) { if (start[index] < min || start[index] > max) return false; continue }
    const a = (min - start[index]) / delta, b = (max - start[index]) / delta
    enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b))
    if (enter > leave) return false
  }
  return true
}

export class RelationshipViewportIndex {
  private nodes?: Branch
  private edges?: Branch

  rebuild(data: RenderData, positions: ReadonlyMap<string, Point>, geometry: ReadonlyMap<string, { style: NonNullable<EdgeData['style']> }>) {
    const nodes: Entry[] = [], edges: Entry[] = []
    const radii = new Map<string, number>()
    for (const [id, node] of data.nodes) {
      const position = positions.get(id)
      if (!position) continue
      const size = node.style?.size
      const radius = Math.max(22, ...(Array.isArray(size) ? size : [Number(size) || 44])) / 2
      radii.set(id, radius)
      nodes.push({ id, ...expand({ minX: position[0], maxX: position[0], minY: position[1], maxY: position[1] }, radius) })
    }
    for (const [id, edge] of data.edges) {
      const start = positions.get(edge.source), end = positions.get(edge.target)
      if (!start || !end) continue
      const style = geometry.get(id)?.style
      // Conservative bounds include quadratic bends, loops and endpoint radii.
      const padding = Math.max(radii.get(edge.source) || 22, radii.get(edge.target) || 22)
        + (edge.source === edge.target ? (Number(style?.loopDist) || 50) * 2 : Math.abs(Number(style?.curveOffset) || 0)) + 16
      edges.push({ id, start, end, padding, ...expand({
        minX: Math.min(start[0], end[0]), maxX: Math.max(start[0], end[0]),
        minY: Math.min(start[1], end[1]), maxY: Math.max(start[1], end[1]),
      }, padding) })
    }
    this.nodes = build(nodes); this.edges = build(edges)
  }

  select(bounds: ViewBounds, data: RenderData, visibleEdges: ReadonlySet<string>) {
    const visibleNodes = new Set<string>(), nodes = new Set<string>(), edges = new Set<string>()
    query(this.nodes, bounds, entry => { visibleNodes.add(entry.id); nodes.add(entry.id) })
    query(this.edges, bounds, entry => {
      if (!visibleEdges.has(entry.id) || !entry.start || !entry.end || !segmentIntersects(entry.start, entry.end, expand(bounds, entry.padding || 0))) return
      const edge = data.edges.get(entry.id)
      if (!edge) return
      edges.add(entry.id)
      // G6 requires real endpoints. Offscreen endpoints are hidden anchors only;
      // their other incident edges are not recursively loaded.
      nodes.add(edge.source); nodes.add(edge.target)
    })
    return { nodes, edges, visibleNodes }
  }
}
