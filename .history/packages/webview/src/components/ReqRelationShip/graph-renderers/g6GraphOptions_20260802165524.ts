import type { Graph, GraphOptions, IPointerEvent, LayoutOptions } from '@antv/g6'

const G6_ZOOM_CANVAS_KEY = 'req-relationship-zoom-canvas'
const G6_LAYOUT_ANIMATION_DURATION = 480
const G6_NODE_SIZE = 44
const G6_NODE_LABEL_FONT_SIZE = 14
const G6_NODE_LABEL_LINE_HEIGHT = 18

export type G6ElementClickHandler = (event: IPointerEvent) => void

const G6_GRAPH_OPTIONS: Omit<GraphOptions, 'container' | 'data' | 'behaviors'> = {
  autoResize: true,
  autoFit: 'view',
  zoomRange: [0.05, 2],
  padding: 56,
  animation: {
    duration: G6_LAYOUT_ANIMATION_DURATION,
    easing: 'ease-in-out',
  },
  node: {
    style: {
      labelFontSize: G6_NODE_LABEL_FONT_SIZE,
      labelLineHeight: G6_NODE_LABEL_LINE_HEIGHT,
    },
  },
  layout: createG6RelationshipLayoutOptions(null),
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

export function createG6RelationshipLayoutOptions(
  focusNode: string | null,
  animation = false,
  nodeCount = 0,
): LayoutOptions {
  const iterationBudget = getRadialIterationBudget(nodeCount)

  return [
    {
      type: 'radial',
      focusNode,
      animation: false,
      linkDistance: 200,
      unitRadius: 200,
      preventOverlap: true,
      nodeSize: G6_NODE_SIZE,
      nodeSpacing: 96,
      strictRadial: false,
      maxIteration: iterationBudget.layout,
      maxPreventOverlapIteration: iterationBudget.preventOverlap,
    },
    {
      type: 'force',
      animation,
      iterations: iterationBudget.repulsion,
      linkDistance: 200,
      nodeStrength: 1800,
      edgeStrength: 40,
      factor: 1.4,
      coulombDisScale: 0.005,
      gravity: 8,
      preventOverlap: true,
      nodeSize: G6_NODE_SIZE,
      nodeSpacing: 0,
      collideStrength: 1,
      damping: 0.9,
      maxSpeed: 120,
      minMovement: 0.5,
    },
  ]
}

function getRadialIterationBudget(nodeCount: number) {
  if (nodeCount <= 40) {
    return { layout: 180, preventOverlap: 40, repulsion: 180 }
  }
  if (nodeCount <= 100) {
    return { layout: 100, preventOverlap: 24, repulsion: 120 }
  }
  return { layout: 60, preventOverlap: 12, repulsion: 80 }
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
      // unselectedState: 'inactive', // 未选中节点状态
      onClick: onElementClick,
    },
  ]
}

function getContainerCenter(container: HTMLElement): [number, number] {
  return [container.clientWidth / 2, container.clientHeight / 2]
}
