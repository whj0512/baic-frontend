import type { Graph, GraphOptions, IPointerEvent, IKeyboardEvent } from '@antv/g6'
import { Renderer } from '@antv/g-canvas'

const ZOOM_KEY = 'req-relationship-zoom-canvas'

/** Coordinates are supplied by our Worker; G6 must never start a second layout. */
export function createG6GraphOptions(container: HTMLElement): Omit<GraphOptions, 'container' | 'data'> {
  return {
    autoResize: false,
    autoFit: undefined,
    animation: false,
    renderer: () => new Renderer({ enableAutoRendering: false }),
    zoomRange: [0.0001, 2],
    padding: 56,
    node: {
      style: { size: 44, labelFontSize: 14, labelLineHeight: 18 },
      state: { active: { lineWidth: 3, stroke: '#1677ff', label: true }, neighborActive: { lineWidth: 2 } },
    },
    // Edge drag events drive canvas panning; drag-element only handles nodes.
    edge: { style: { draggable: true }, state: { active: { lineWidth: 3 }, neighborActive: { lineWidth: 2 } } },
    behaviors: [
      { type: 'drag-canvas', animation: false,
        enable: (event: IPointerEvent | IKeyboardEvent) => !('targetType' in event) || event.targetType === 'canvas' || event.targetType === 'edge',
      },
      { type: 'zoom-canvas', key: ZOOM_KEY, origin: [container.clientWidth / 2, container.clientHeight / 2], animation: false },
      { type: 'drag-element', animation: false },
    ],
  }
}

export function updateZoomCanvasOrigin(graph: Graph, container: HTMLElement) {
  graph.updateBehavior({ key: ZOOM_KEY, origin: [container.clientWidth / 2, container.clientHeight / 2] })
}
