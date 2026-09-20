export interface LayoutNode {
  id: string
  size: number
  x?: number
  y?: number
}
export interface LayoutRequest {
  version: number
  nodes: LayoutNode[]
  edges: { source: string; target: string }[]
  focusNode: string | null
  animate?: boolean
}
// Both bounds apply: even a small node set can have an expensive dense edge set.
export function shouldAnimateLayout(nodeCount: number, edgeCount: number, reducedMotion = false): boolean {
  return !reducedMotion && nodeCount > 1 && nodeCount <= 200 && edgeCount <= 500
}

export type LayoutStatus = 'initial' | 'tick' | 'converged' | 'budget'
export interface LayoutResult {
  version: number
  status: LayoutStatus
  positions: Float32Array
  elapsedMs: number
}

/** Yielding generator is shared by the Worker and the safe main-thread fallback. */
export function* seedPositions(request: LayoutRequest): Generator<void, Float32Array> {
  const { nodes, edges, focusNode } = request
  const indices = new Map(nodes.map((node, index) => [node.id, index]))
  const adjacency = nodes.map(() => [] as number[])
  for (let i = 0; i < edges.length; i++) {
    const source = indices.get(edges[i].source)
    const target = indices.get(edges[i].target)
    if (source !== undefined && target !== undefined && source !== target) {
      adjacency[source].push(target)
      adjacency[target].push(source)
    }
    if (i % 1000 === 0) yield
  }
  const positions = new Float32Array(nodes.length * 2)
  const visited = new Uint8Array(nodes.length)
  const focus = focusNode ? indices.get(focusNode) : undefined
  const roots = focus === undefined ? nodes.map((_, i) => i) : [focus, ...nodes.map((_, i) => i)]
  const components: { indices: number[]; radius: number }[] = []
  for (const root of roots) {
    if (visited[root]) continue
    const queue = [root]
    const levels: number[][] = [[root]]
    const depth = new Map<number, number>([[root, 0]])
    visited[root] = 1
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head]
      const level = (depth.get(index) || 0) + 1
      for (const neighbor of adjacency[index]) {
        if (visited[neighbor]) continue
        visited[neighbor] = 1
        depth.set(neighbor, level)
        const levelNodes = levels[level] ||= []
        levelNodes.push(neighbor)
        queue.push(neighbor)
      }
      if (head % 500 === 0) yield
    }
    let radius = 0
    for (let depth = 0; depth < levels.length; depth++) {
      const level = levels[depth]
      radius = depth === 0 ? 0 : Math.max(radius + 140, level.length * 60 / (2 * Math.PI))
      for (let offset = 0; offset < level.length; offset++) {
        const index = level[offset]
        const angle = 2 * Math.PI * offset / level.length
        positions[index * 2] = radius * Math.cos(angle)
        positions[index * 2 + 1] = radius * Math.sin(angle)
        if (offset % 500 === 0) yield
      }
    }
    components.push({ indices: queue, radius })
    yield
  }
  // Shelf-pack disconnected components instead of producing a very wide strip.
  const rowWidth = Math.sqrt(components.reduce((area, item) => area + (item.radius * 2 + 160) ** 2, 0))
  let left = 0, top = 0, rowHeight = 0
  for (const component of components) {
    const size = component.radius * 2 + 160
    if (left && left + size > rowWidth) { left = 0; top += rowHeight; rowHeight = 0 }
    for (let i = 0; i < component.indices.length; i++) {
      const index = component.indices[i]
      positions[index * 2] += left + size / 2
      positions[index * 2 + 1] += top + size / 2
      if (i % 500 === 0) yield
    }
    left += size
    rowHeight = Math.max(rowHeight, size)
  }
  // Keep existing positions. New expansion nodes start beside a positioned neighbor.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      positions[i * 2] = node.x!
      positions[i * 2 + 1] = node.y!
    } else {
      const neighbor = adjacency[i].find(index => Number.isFinite(nodes[index].x) && Number.isFinite(nodes[index].y))
      if (neighbor !== undefined) {
        const angle = i * 2.3999632297
        positions[i * 2] = nodes[neighbor].x! + 100 * Math.cos(angle)
        positions[i * 2 + 1] = nodes[neighbor].y! + 100 * Math.sin(angle)
      }
    }
    if (i % 500 === 0) yield
  }
  return positions
}
