// internalComposition 模型策略 —— 内部组成 (BDD)
import { exportGraphTOJSON } from './internalComposition/exportGraph'
import type { ModelStrategy } from './types'

const internalCompositionStrategy: ModelStrategy = {
  exportGraphToJSON: exportGraphTOJSON,

  importGraphFromJSON: (_jsonString: string) => {
    // TODO: 实现 internalComposition (BDD) 的导入逻辑
    return { cells: [] }
  },
}

export default internalCompositionStrategy
