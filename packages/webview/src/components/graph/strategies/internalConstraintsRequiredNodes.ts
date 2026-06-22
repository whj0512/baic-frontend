import type { Graph } from '@antv/x6'

const START_NODE_SIZE = 30
const START_NODE_POSITION = { x: 80, y: 80 }

export const ensureInternalConstraintsRequiredNodes = (graph: Graph) => {
  const nodes = graph.getNodes()
  if (nodes.length > 0) {
    return
  }

  graph.addNode({
    shape: 'start-node',
    ...START_NODE_POSITION,
    width: START_NODE_SIZE,
    height: START_NODE_SIZE,
    data: {
      nodeName: 'start',
      stroke: '#333',
      fill: '#686666',
    },
  })
}
