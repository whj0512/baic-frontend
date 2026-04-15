// environment 模型策略 —— 所处环境 (IBD)
import type { ModelStrategy } from './types'
import { exportGraphTOJSON } from './environment/exportGraph'
import { importGraphFromJSON } from './environment/importGraph'

const environmentStrategy: ModelStrategy = {
  exportGraphToJSON: exportGraphTOJSON,

  importGraphFromJSON: importGraphFromJSON
}

export default environmentStrategy
