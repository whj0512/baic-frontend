type PerformanceFixtureSize = 'medium' | 'large'

interface PerformanceFixtureOptions {
  shape?: string
  size?: PerformanceFixtureSize
}

const FIXTURE_SIZES: Record<PerformanceFixtureSize, { nodes: number; edges: number }> = {
  medium: { nodes: 150, edges: 250 },
  large: { nodes: 500, edges: 800 },
}

export const createFlowGraphPerformanceFixture = ({
  shape = 'device-node',
  size = 'large',
}: PerformanceFixtureOptions = {}) => {
  const target = FIXTURE_SIZES[size]
  const columns = Math.ceil(Math.sqrt(target.nodes))
  const nodes = Array.from({ length: target.nodes }, (_, index) => ({
    id: `perf-node-${index}`,
    shape,
    x: (index % columns) * 180,
    y: Math.floor(index / columns) * 120,
    width: 120,
    height: 60,
    data: {
      nodeName: `Node ${index + 1}`,
      fixture: true,
    },
  }))
  const edges = Array.from({ length: target.edges }, (_, index) => {
    const sourceIndex = index % target.nodes
    const stride = 1 + Math.floor(index / target.nodes)
    const targetIndex = (sourceIndex + stride) % target.nodes

    return {
      id: `perf-edge-${index}`,
      shape: 'edge',
      source: { cell: nodes[sourceIndex].id },
      target: { cell: nodes[targetIndex].id },
      data: { fixture: true },
    }
  })

  return {
    cells: [...nodes, ...edges],
    canvasData: {
      performanceFixture: size,
    },
  }
}
