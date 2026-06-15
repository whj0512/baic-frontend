import { Stencil } from '@antv/x6'
import type { Graph } from '@antv/x6'
import type { GraphStrategy } from '../strategies/types'

export const createFlowGraphStencil = (
  graph: Graph,
  container: HTMLDivElement,
  strategy: GraphStrategy,
) => {
  const stencil = new Stencil({
    target: graph,
    stencilGraphWidth: strategy.stencilGraphWidth || 160,
    stencilGraphHeight: strategy.stencilGraphHeight || 0,
    stencilGraphPadding: strategy.stencilGraphPadding || 10,
    collapsable: true,
    groups: [
      {
        name: 'default',
        title: '基础组件',
      },
    ],
    layoutOptions: strategy.stencilLayoutOptions || {
      columns: 1,
      columnWidth: 140,
      rowHeight: 120,
    },
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

export const disposeFlowGraphStencil = (stencil: Stencil | null) => {
  if (!stencil) return

  if (stencil.container?.parentNode) {
    stencil.container.parentNode.removeChild(stencil.container)
  }
  stencil.dispose()
}
