// moduleResponses 模型策略 —— 组成模块间的响应 (ISD)

import type { Graph } from '@antv/x6'
import type { ModelStrategy } from './types'

const moduleResponsesStrategy: ModelStrategy = {
  exportGraphToJSON: (_graph: Graph, graphId?: string, graphDesc?: string) => {
    // TODO: 实现 moduleResponses (ISD) 的导出逻辑
    return {
      id: graphId || '',
      desc: graphDesc || '',
      graph_type: 'request',
      nodes: [],
      transitions: [],
    }
  },

  importGraphFromJSON: (_jsonString: string) => {
    // TODO: 实现 moduleResponses (ISD) 的导入逻辑
    return { cells: [] }
  },
}

export default moduleResponsesStrategy
