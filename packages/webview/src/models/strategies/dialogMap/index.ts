import type { ModelStrategy } from '../types'

const parseGraphData = (data: string) => {
  try {
    return JSON.parse(data)
  } catch {
    return { cells: [] }
  }
}

const dialogMapStrategy: ModelStrategy = {
  exportGraphToJSON: graph => graph.toJSON(),
  importGraphFromJSON: parseGraphData,
}

export default dialogMapStrategy
