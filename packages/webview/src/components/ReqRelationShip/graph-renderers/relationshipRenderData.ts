import type { EdgeData, GraphData, NodeData } from '@antv/g6'

export type RelationshipEdge = EdgeData & { id: string }
export interface RenderData {
  nodes: Map<string, NodeData>
  edges: Map<string, RelationshipEdge>
  neighbors: Map<string, Set<string>>
  incidentEdges: Map<string, Set<string>>
  large: boolean
}

/** Validate before touching G6 so a malformed response cannot replace a good view. */
export function validateRenderData(data: GraphData): RenderData {
  const nodes = new Map<string, NodeData>()
  const edges = new Map<string, RelationshipEdge>()
  const neighbors = new Map<string, Set<string>>()
  const incidentEdges = new Map<string, Set<string>>()
  const ids = new Set<string>()
  const addId = (id: unknown) => {
    if (typeof id !== 'string' || !id.trim()) throw new Error('关系图中的节点和关系必须具有非空 ID')
    if (ids.has(id)) throw new Error(`关系图存在重复 ID：${id}`)
    ids.add(id)
    return id
  }
  for (const node of data.nodes || []) {
    const id = addId(node.id)
    nodes.set(id, node)
    neighbors.set(id, new Set())
    incidentEdges.set(id, new Set())
  }
  for (const edge of data.edges || []) {
    const id = addId(edge.id)
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) {
      throw new Error(`关系 ${id} 的端点不存在`)
    }
    edges.set(id, edge as RelationshipEdge)
    neighbors.get(edge.source)?.add(edge.target)
    neighbors.get(edge.target)?.add(edge.source)
    incidentEdges.get(edge.source)?.add(id)
    incidentEdges.get(edge.target)?.add(id)
  }
  return { nodes, edges, neighbors, incidentEdges, large: nodes.size > 500 || edges.size > 2000 }
}

export function sameTopology(a: RenderData | undefined, b: RenderData) {
  if (!a || a.nodes.size !== b.nodes.size || a.edges.size !== b.edges.size) return false
  for (const id of b.nodes.keys()) if (!a.nodes.has(id)) return false
  for (const [id, edge] of b.edges) {
    const previous = a.edges.get(id)
    if (!previous || previous.source !== edge.source || previous.target !== edge.target) return false
  }
  return true
}

type EdgeGeometry = { type: string; style: NonNullable<EdgeData['style']> }
const LOOP_PLACEMENTS = ['top', 'top-right', 'right', 'right-bottom', 'bottom', 'bottom-left', 'left', 'left-top'] as const

/** O(E) indexing; unchanged endpoint groups reuse their geometry, never scan E for each edge. */
export class ParallelEdgeGeometry {
  private groups = new Map<string, { signature: string; geometry: Map<string, EdgeGeometry> }>()

  update(edges: Map<string, RelationshipEdge>) {
    const grouped = new Map<string, RelationshipEdge[]>()
    for (const edge of edges.values()) {
      const key = JSON.stringify([edge.source, edge.target].sort())
      const group = grouped.get(key)
      if (group) group.push(edge)
      else grouped.set(key, [edge])
    }
    const next = new Map<string, { signature: string; geometry: Map<string, EdgeGeometry> }>()
    const result = new Map<string, EdgeGeometry>()
    for (const [key, group] of grouped) {
      const signature = JSON.stringify(group.map(edge => [edge.id, edge.source, edge.target]))
      let cached = this.groups.get(key)
      if (cached?.signature !== signature) {
        const geometry = new Map<string, EdgeGeometry>()
        group.forEach((edge, index) => {
          if (edge.source === edge.target) {
            geometry.set(edge.id, {
              type: 'quadratic',
              style: { loopPlacement: LOOP_PLACEMENTS[index % 8], loopDist: 50 + Math.floor(index / 8) * 28 },
            })
          } else {
            const offset = (index - (group.length - 1) / 2) * 56
            geometry.set(edge.id, {
              type: group.length === 1 ? 'line' : 'quadratic',
              style: { curveOffset: edge.source < edge.target ? offset : -offset },
            })
          }
        })
        cached = { signature, geometry }
      }
      next.set(key, cached)
      for (const [id, geometry] of cached.geometry) result.set(id, geometry)
    }
    this.groups = next
    return result
  }
}

export function nodeDiameter(size: unknown): number {
  if (typeof size === 'number' && Number.isFinite(size) && size > 0) return size
  if (Array.isArray(size)) return Math.max(1, ...size.filter(value => typeof value === 'number' && Number.isFinite(value)))
  return 44
}
