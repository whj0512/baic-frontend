// interaction 模型策略 —— 与环境交互 (ESD)
import type { ModelStrategy } from './types'
import { exportGraphTOJSON } from './interaction/exportGraph'

const interactionStrategy: ModelStrategy = {
  exportGraphToJSON: exportGraphTOJSON,

  importGraphFromJSON: (_jsonString: string) => {
    // TODO: 实现 interaction (ESD) 的导入逻辑
    return { cells: [] }
  },
}

export default interactionStrategy
