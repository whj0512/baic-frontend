// internalComposition 模型策略 —— 内部组成 (BDD)

import type { Graph } from '@antv/x6'
import type { ModelStrategy } from './types'

const internalCompositionStrategy: ModelStrategy = {
  exportGraphToJSON: (_graph: Graph, graphId?: string, graphDesc?: string) => {
    // TODO: 实现 internalComposition (BDD) 的导出逻辑
    return {
      id: graphId || '',
      desc: graphDesc || '',
      graph_type: 'request',
      nodes: [],
      transitions: [],
    }
  },

  importGraphFromJSON: (_jsonString: string) => {
    // TODO: 实现 internalComposition (BDD) 的导入逻辑
    return { cells: [] }
  },
}

export default internalCompositionStrategy
