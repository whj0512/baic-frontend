import { Graph } from '@antv/x6'
import type { Edge } from '@antv/x6'
import {
  isConnectionHotPortId,
  isSequenceEdgeMode,
  validateNodeConnection,
} from '../edgeConnection'
import type { GraphStrategy } from '../strategies/types'

type GraphEventTarget = {
  target: EventTarget | null
}

const getEventPortId = (event: GraphEventTarget) => {
  const target = event.target
  if (!(target instanceof Element)) return null

  return target.getAttribute('port') || target.closest('[port]')?.getAttribute('port') || null
}

export const createFlowGraphOptions = (
  container: HTMLElement,
  strategy: GraphStrategy,
  readOnly: boolean,
): ConstructorParameters<typeof Graph>[0] => {
  const sequenceEdgeMode = isSequenceEdgeMode(strategy)

  return {
    container,
    autoResize: true,
    grid: { size: 10, visible: true },
    panning: true,
    mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
    guard(event, view) {
      const cell = view?.cell
      if (!cell?.isNode?.()) return false

      if (event.type === 'mouseout' || event.type === 'mouseleave') return false

      const portId = getEventPortId(event)
      if (isConnectionHotPortId(portId)) return false

      if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number') return false

      const localPoint = view.graph.clientToLocal(event.clientX, event.clientY)
      return !cell.getBBox().containsPoint(localPoint)
    },
    interacting: !readOnly ? {
      nodeMovable: true,
      edgeMovable: (cellView: any) => {
        const edge = cellView.cell
        const src = edge.getSource()
        return !!src?.cell
      },
      edgeLabelMovable: true,
    } : false,
    background: { color: '#f8f9fa' },
    connecting: {
      allowBlank: sequenceEdgeMode,
      allowMulti: true,
      allowNode: true,
      allowEdge: false,
      allowLoop: sequenceEdgeMode,
      highlight: true,
      snap: {
        radius: 30,
      },
      createEdge(this: Graph) {
        return this.createEdge({
          shape: 'edge',
          attrs: {
            line: {
              stroke: '#1890ff',
              strokeWidth: 2,
              sourceMarker: strategy.defaultSourceMarker !== undefined ? strategy.defaultSourceMarker : undefined,
              targetMarker: strategy.defaultEdgeMarker !== undefined ? strategy.defaultEdgeMarker : {
                name: 'block',
                width: 12,
                height: 8,
              },
            },
          },
          router: {
            name: 'manhattan',
          },
          connector: {
            name: 'rounded',
            args: { radius: 8 },
          },
        })
      },
      validateConnection(args: any) {
        return validateNodeConnection(args, strategy)
      },
      validateEdge({ edge }: { edge: Edge }) {
        const sourceCellId = edge.getSourceCellId()
        const targetCellId = edge.getTargetCellId()
        if (sourceCellId && targetCellId) return true

        return sequenceEdgeMode && !sourceCellId && !targetCellId
      },
    },
  }
}
