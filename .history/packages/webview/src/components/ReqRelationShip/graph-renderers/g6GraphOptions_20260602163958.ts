import type { Graph, GraphOptions, IPointerEvent } from '@antv/g6'

export const G6_LEGEND_PLUGIN_OPTIONS = {
  type: 'legend',
  key: 'req-relationship-legend',
  nodeField: 'type',
  edgeField: 'relationType',
  position: 'bottom-left',
}

const G6_ZOOM_CANVAS_KEY = 'req-relationship-zoom-canvas'

export type G6ElementClickHandler = (event: IPointerEvent) => void

const G6_GRAPH_OPTIONS: Omit<GraphOptions, 'container' | 'data' | 'behaviors'> = {
  autoResize: true,
  autoFit: 'center',
  zoomRange: [0.5, 2],
  padding: 48,
  animation: true,
  layout: {
    type: 'd3-force',
    preventOverlap: true,
    nodeSize: 64,
    linkDistance: 180,
  },
  transforms: [
    {
      type: 'process-parallel-edges',
      mode: 'bundle',
      distance: 28,
    },
  ],
  plugins: [
    {
      ...G6_LEGEND_PLUGIN_OPTIONS,
    },
  ],
}

export function createG6GraphOptions(
  container: HTMLElement,
  onElementClick?: G6ElementClickHandler,
): Omit<GraphOptions, 'container' | 'data'> {
  return {
    ...G6_GRAPH_OPTIONS,
    behaviors: createG6Behaviors(container, onElementClick),
  }
}

export function updateZoomCanvasOrigin(graph: Graph, container: HTMLElement) {
  if (graph.destroyed) return

  graph.updateBehavior({
    key: G6_ZOOM_CANVAS_KEY,
    origin: getContainerCenter(container),
  })
}

function createG6Behaviors(
  container: HTMLElement,
  onElementClick?: G6ElementClickHandler,
): GraphOptions['behaviors'] {
  return [
    { type: 'drag-canvas' },
    {
      type: 'zoom-canvas',
      key: G6_ZOOM_CANVAS_KEY,
      origin: getContainerCenter(container),
    },
    { type: 'drag-element' },
    {
      type: 'focus-element',
      enable: (event) => event.target.type === 'node',
    },
    {
      type: 'click-select',
      degree: 1,
      state: 'active',
      neighborState: 'neighborActive',
      unselectedState: 'inactive',
      onClick: onElementClick,
    },
  ]
}

function getContainerCenter(container: HTMLElement): [number, number] {
  return [container.clientWidth / 2, container.clientHeight / 2]
}
