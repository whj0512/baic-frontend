type GraphCell = Record<string, any> & {
  shape?: string
  x?: number
  y?: number
  width?: number
  height?: number
}

const START_NODE_SHAPE = 'start-node'
const START_NODE_SIZE = 30
const START_NODE_GAP = 48
const CANVAS_MARGIN = 20

const getNumber = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
)

const isNodeCell = (cell: unknown): cell is GraphCell => {
  if (!cell || typeof cell !== 'object') return false

  const candidate = cell as GraphCell
  return candidate.shape !== 'edge' && !('source' in candidate && 'target' in candidate)
}

const getStartNodePosition = (nodes: GraphCell[]) => {
  const nodeBounds = nodes.map((node) => {
    const x = getNumber(node.x, CANVAS_MARGIN)
    const y = getNumber(node.y, CANVAS_MARGIN)
    const width = getNumber(node.width, 120)
    const height = getNumber(node.height, 60)

    return { x, y, width, height }
  })
  const anchor = nodeBounds.reduce((current, node) => (
    node.y < current.y || (node.y === current.y && node.x < current.x) ? node : current
  ))
  const minX = Math.min(...nodeBounds.map(node => node.x))
  const minY = Math.min(...nodeBounds.map(node => node.y))
  const maxX = Math.max(...nodeBounds.map(node => node.x + node.width))

  if (minY - START_NODE_SIZE - START_NODE_GAP >= CANVAS_MARGIN) {
    return {
      x: anchor.x + (anchor.width - START_NODE_SIZE) / 2,
      y: minY - START_NODE_SIZE - START_NODE_GAP,
    }
  }

  if (minX - START_NODE_SIZE - START_NODE_GAP >= CANVAS_MARGIN) {
    return {
      x: minX - START_NODE_SIZE - START_NODE_GAP,
      y: anchor.y + (anchor.height - START_NODE_SIZE) / 2,
    }
  }

  return {
    x: maxX + START_NODE_GAP,
    y: anchor.y + (anchor.height - START_NODE_SIZE) / 2,
  }
}

const generateStartNodeId = () => (
  `start_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
)

export const createMissingInternalConstraintsStartNode = (graphData: object): GraphCell | null => {
  const cells = Array.isArray((graphData as { cells?: unknown }).cells)
    ? (graphData as { cells: unknown[] }).cells
    : []
  const nodes = cells.filter(isNodeCell)

  if (nodes.length === 0 || nodes.some(node => node.shape === START_NODE_SHAPE)) {
    return null
  }

  return {
    id: generateStartNodeId(),
    shape: START_NODE_SHAPE,
    width: START_NODE_SIZE,
    height: START_NODE_SIZE,
    data: {
      nodeName: 'start',
      stroke: '#333',
      fill: '#686666',
    },
  }
}

export const ensureInternalConstraintsStartNode = (graphData: object): object => {
  const startNode = createMissingInternalConstraintsStartNode(graphData)
  if (!startNode) return graphData

  const cells = (graphData as { cells: unknown[] }).cells
  return {
    ...graphData,
    cells: [startNode, ...cells],
  }
}
