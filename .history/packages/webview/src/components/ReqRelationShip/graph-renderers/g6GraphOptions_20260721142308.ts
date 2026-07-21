import type { Graph, GraphOptions, IPointerEvent, LayoutOptions } from '@antv/g6'

const G6_ZOOM_CANVAS_KEY = 'req-relationship-zoom-canvas'

export type G6ElementClickHandler = (event: IPointerEvent) => void

const G6_GRAPH_OPTIONS: Omit<GraphOptions, 'container' | 'data' | 'behaviors'> = {
  autoResize: true,
  autoFit: 'view',
  zoomRange: [0.05, 2],
  padding: 56,
  animation: false,
  layout: createG6RadialLayoutOptions(null),
  transforms: [
    {
      type: 'process-parallel-edges',
      mode: 'bundle',
      distance: 28,
    },
  ],
  plugins: [
    {
      type: 'grid-line',
      key: 'req-relationship-grid-line',
      size: 20,
      stroke: '#0001',
      follow: true,
    },
  ],
}

export function createG6RadialLayoutOptions(focusNode: string | null): LayoutOptions {
  return {
    type: 'radial',
    focusNode,
    linkDistance: 200,
    unitRadius: 120,
    preventOverlap: true,
    nodeSize: 48,
    nodeSpacing: 18,
    strictRadial: false,
    maxIteration: 300,
    maxPreventOverlapIteration: 80,
  }
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
