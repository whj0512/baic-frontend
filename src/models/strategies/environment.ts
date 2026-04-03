// environment 模型策略 —— 所处环境 (IBD)

import type { Graph } from '@antv/x6'
import type { ModelStrategy } from './types'

const environmentStrategy: ModelStrategy = {
  exportGraphToJSON: (_graph: Graph, graphId?: string, graphDesc?: string) => {
    // TODO: 实现 environment (IBD) 的导出逻辑
    return {
      id: graphId || '',
      desc: graphDesc || '',
      graph_type: 'request',
      nodes: [],
      transitions: [],
    }
  },

  importGraphFromJSON: (_jsonString: string) => {
    // TODO: 实现 environment (IBD) 的导入逻辑
    return { cells: [] }
  },
}

export default environmentStrategy
