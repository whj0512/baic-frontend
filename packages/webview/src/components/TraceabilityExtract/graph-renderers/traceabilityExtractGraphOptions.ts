import type { ElementDatum, Graph, GraphOptions, IElementEvent } from '@antv/g6'

export const TRACEABILITY_EXTRACT_LEGEND_PLUGIN_OPTIONS = {
  type: 'legend',
  key: 'traceability-extract-legend',
  nodeField: 'categoryName',
  layout: 'grid',
  gridRow: 1,
  gridCol: 3,
  width: 420,
  height: 48,
  colPadding: 16,
}

const TRACEABILITY_EXTRACT_ZOOM_CANVAS_KEY = 'traceability-extract-zoom-canvas'

const TRACEABILITY_EXTRACT_GRAPH_OPTIONS: Omit<GraphOptions, 'container' | 'data' | 'behaviors'> = {
  autoResize: true,
  autoFit: 'center',
  padding: 56,
  zoomRange: [0.5, 2],
  animation: true,
  plugins: [
    {
      ...TRACEABILITY_EXTRACT_LEGEND_PLUGIN_OPTIONS,
    },
    {
      type: 'tooltip',
      key: 'traceability-extract-tooltip',
      trigger: 'hover',
      getContent: async (_event: IElementEvent, items: ElementDatum[]) => getTooltipHtml(items[0]),
      onOpenChange: () => undefined,
    },
    {
      type: 'grid-line',
      key: 'traceability-extract-grid-line',
      size: 20,
      stroke: '#0001',
      follow: true,
    },
  ],
}

export function createTraceabilityExtractG6GraphOptions(
  container: HTMLElement,
): Omit<GraphOptions, 'container' | 'data'> {
  return {
    ...TRACEABILITY_EXTRACT_GRAPH_OPTIONS,
    behaviors: createG6Behaviors(container),
  }
}

export function updateTraceabilityExtractZoomOrigin(graph: Graph, container: HTMLElement) {
  if (graph.destroyed) return

  graph.updateBehavior({
    key: TRACEABILITY_EXTRACT_ZOOM_CANVAS_KEY,
    origin: getContainerCenter(container),
  })
}

function createG6Behaviors(container: HTMLElement): GraphOptions['behaviors'] {
  return [
    { type: 'drag-canvas' },
    {
      type: 'zoom-canvas',
      key: TRACEABILITY_EXTRACT_ZOOM_CANVAS_KEY,
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
    },
  ]
}

function getContainerCenter(container: HTMLElement): [number, number] {
  return [container.clientWidth / 2, container.clientHeight / 2]
}

function getTooltipHtml(datum?: ElementDatum) {
  const tooltip = datum?.data?.tooltip
  return typeof tooltip === 'string' ? tooltip : ''
}
