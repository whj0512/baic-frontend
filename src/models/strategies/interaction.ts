// interaction 模型策略 —— 与环境交互 (ESD)
import type { ModelStrategy } from './types'
import { exportGraphTOJSON } from './interaction/exportGraph'
import { importGraphFromJSON } from './interaction/importGraph'

const interactionStrategy: ModelStrategy = {
  exportGraphToJSON: exportGraphTOJSON,

  importGraphFromJSON: importGraphFromJSON,
}

export default interactionStrategy
