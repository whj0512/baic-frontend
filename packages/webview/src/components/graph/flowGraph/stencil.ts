import { Stencil } from '@antv/x6'
import type { Graph, Node } from '@antv/x6'
import type { GraphStrategy } from '../strategies/types'
import {
  beginPreConnection,
  cancelPreConnection,
  registerPreConnectionDocumentEvents,
  transferPreConnectionTarget,
} from './preConnection'

export const createFlowGraphStencil = (
  graph: Graph,
  container: HTMLDivElement,
  strategy: GraphStrategy,
) => {
  const preConnectionOptions = strategy.preConnectionRules ? {
    getDragNode: (sourceNode: Node) => {
      const draggingNode = sourceNode.clone()
      if (beginPreConnection(graph, strategy, draggingNode, { stencil: true })) {
        registerPreConnectionDocumentEvents(graph, strategy)
      }
      return draggingNode
    },
    getDropNode: (draggingNode: Node) => {
      const droppingNode = draggingNode.clone()
      transferPreConnectionTarget(graph, draggingNode, droppingNode)
      return droppingNode
    },
  } : {}

  const stencil = new Stencil({
    title: '',
    target: graph,
    stencilGraphWidth: strategy.stencilGraphWidth || 160,
    stencilGraphHeight: strategy.stencilGraphHeight || 0,
    stencilGraphPadding: strategy.stencilGraphPadding || 10,
    collapsable: false,
    groups: [
      {
        name: 'default',
        title: '',
        collapsable: false,
      },
    ],
    layoutOptions: strategy.stencilLayoutOptions || {
      columns: 1,
      columnWidth: 140,
      rowHeight: 120,
    },
    ...preConnectionOptions,
  })

  container.appendChild(stencil.container)

  const nodes = strategy.sidebarItems.map((item) => {
    const { data: defaultData, ...otherAttrs } = item.defaultAttrs || {}
    return graph.createNode({
      shape: item.shape,
      ...otherAttrs,
      data: {
        nodeName: item.label,
        ...(defaultData || {}),
      },
    })
  })

  stencil.load(nodes, 'default')

  return stencil
}

export const disposeFlowGraphStencil = (stencil: Stencil | null, graph?: Graph) => {
  if (graph) {
    cancelPreConnection(graph)
  }
  if (!stencil) return

  if (stencil.container?.parentNode) {
    stencil.container.parentNode.removeChild(stencil.container)
  }
  stencil.dispose()
}
