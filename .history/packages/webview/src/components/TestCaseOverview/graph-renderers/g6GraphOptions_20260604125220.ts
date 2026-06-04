import type { ElementDatum, Graph, GraphOptions, IElementEvent } from '@antv/g6'

export const TEST_CASE_OVERVIEW_LEGEND_PLUGIN_OPTIONS = {
  type: 'legend',
  key: 'test-case-overview-legend',
  nodeField: 'categoryName',
  gridCol: 5,
}

const TEST_CASE_OVERVIEW_ZOOM_CANVAS_KEY = 'test-case-overview-zoom-canvas'

const TEST_CASE_OVERVIEW_GRAPH_OPTIONS: Omit<GraphOptions, 'container' | 'data' | 'behaviors'> = {
  autoResize: true,
  autoFit: 'center',
  padding: 56,
  zoomRange: [0.5, 2],
  animation: true,
  plugins: [
    {
      ...TEST_CASE_OVERVIEW_LEGEND_PLUGIN_OPTIONS,
    },
    {
      type: 'tooltip',
      key: 'test-case-overview-tooltip',
      trigger: 'hover',
      getContent: async (_event: IElementEvent, items: ElementDatum[]) => getTooltipHtml(items[0]),
      onOpenChange: () => undefined,
    },
  ],
}

export function createTestCaseOverviewG6GraphOptions(
  container: HTMLElement,
): Omit<GraphOptions, 'container' | 'data'> {
  return {
    ...TEST_CASE_OVERVIEW_GRAPH_OPTIONS,
    behaviors: createG6Behaviors(container),
  }
}

export function updateTestCaseOverviewZoomOrigin(graph: Graph, container: HTMLElement) {
  if (graph.destroyed) return

  graph.updateBehavior({
    key: TEST_CASE_OVERVIEW_ZOOM_CANVAS_KEY,
    origin: getContainerCenter(container),
  })
}

function createG6Behaviors(container: HTMLElement): GraphOptions['behaviors'] {
  return [
    { type: 'drag-canvas' },
    {
      type: 'zoom-canvas',
      key: TEST_CASE_OVERVIEW_ZOOM_CANVAS_KEY,
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
