// interaction 模型策略 —— 与环境交互 (ESD)

import type { Graph } from '@antv/x6'
import type { ModelStrategy } from './types'

const interactionStrategy: ModelStrategy = {
  exportGraphToJSON: (_graph: Graph, graphId?: string, graphDesc?: string) => {
    // TODO: 实现 interaction (ESD) 的导出逻辑
    return {
      id: graphId || '',
      desc: graphDesc || '',
      graph_type: 'request',
      nodes: [],
      transitions: [],
    }
  },

  importGraphFromJSON: (_jsonString: string) => {
    // TODO: 实现 interaction (ESD) 的导入逻辑
    return { cells: [] }
  },
}

export default interactionStrategy
