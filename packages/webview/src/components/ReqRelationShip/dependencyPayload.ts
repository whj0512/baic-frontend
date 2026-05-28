import { Graph } from '@antv/x6'
import { exportGraphToRBG } from '../../models/strategies/internalConstraints/exportGraph'
import type { Requirement } from '../../models/Requirement'
import '../graph/FlowGraph'
import internalConstraintsStrategy from '../graph/strategies/internalConstraints'

export function buildDependencyRequestBody(requirements: Requirement[], idsToProcess: string[]) {
  if (internalConstraintsStrategy.registerNodes) {
    internalConstraintsStrategy.registerNodes()
  }

  const selectedIds = new Set(idsToProcess)
  const dummyContainer = document.createElement('div')
  const headlessGraph = new Graph({ container: dummyContainer })

  try {
    return requirements
      .filter(req => selectedIds.has(req.id))
      .map((req) => {
        let graphData = req.graph_SC
        if (typeof graphData === 'string') {
          try {
            graphData = JSON.parse(graphData)
          } catch {
            graphData = { cells: [] }
          }
        }

        if (!graphData || typeof graphData !== 'object') {
          return null
        }

        if (!('cells' in graphData)) {
          return graphData
        }

        if (Array.isArray(graphData.cells) && graphData.cells.length === 0) {
          return null
        }

        headlessGraph.clearCells()
        try {
          ;(headlessGraph as any).canvasData = graphData
          headlessGraph.fromJSON(graphData)
          return exportGraphToRBG(headlessGraph, req.id, req.nl_text)
        } catch (err) {
          console.error(`解析需求 ${req.id} 时 X6 fromJSON 返回异常:`, err)
          return null
        }
      })
      .filter(Boolean)
  } finally {
    headlessGraph.dispose()
  }
}
