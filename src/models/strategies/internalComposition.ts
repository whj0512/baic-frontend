// internalComposition 模型策略 —— 内部组成 (BDD)
import { exportGraphTOJSON } from './internalComposition/exportGraph'
import { importGraphFromJSON } from './internalComposition/importGraph'
import type { ModelStrategy } from './types'

const internalCompositionStrategy: ModelStrategy = {
  exportGraphToJSON: exportGraphTOJSON,

  importGraphFromJSON: importGraphFromJSON,
}

export default internalCompositionStrategy
