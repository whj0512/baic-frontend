import type { Graph } from '@antv/x6'
import {
  ensureGraphConnectionPorts,
  scheduleGraphConnectionViewRefresh,
} from '../edgeConnection'
import type { GraphStrategy } from '../strategies/types'
import type { GraphChangeScheduler } from './changeScheduler'
import { syncInitialEdgeLabels } from './edgeLabels'

interface LoadFlowGraphDataOptions {
  data?: any
  graph: Graph
  scheduler: GraphChangeScheduler
  strategy: GraphStrategy
}

export const loadFlowGraphData = ({
  data,
  graph,
  scheduler,
  strategy,
}: LoadFlowGraphDataOptions) => {
  const history = graph.getPlugin('history') as { isEnabled?: () => boolean } | undefined
  const historyWasEnabled = history?.isEnabled?.() === true

  scheduler.suspend()
  if (historyWasEnabled) graph.disableHistory()
  scheduleGraphConnectionViewRefresh(graph, strategy)

  try {
    graph.batchUpdate('flow-graph-load', () => {
      graph.fromJSON(data && typeof data === 'object' ? data : { cells: [] })

      const canvasData = data?.canvasData && typeof data.canvasData === 'object'
        ? data.canvasData
        : undefined
      ;(graph as any).canvasData = canvasData
      if (canvasData) {
        graph.trigger('canvas:change:data', { data: canvasData, initial: true })
      }

      ensureGraphConnectionPorts(graph, strategy)
      syncInitialEdgeLabels(graph)
      strategy.ensureRequiredNodes?.(graph)
    })
  } finally {
    graph.cleanHistory?.()
    if (historyWasEnabled) graph.enableHistory()
    scheduler.resume({ reset: true })
    scheduler.flush(false)
  }
}
