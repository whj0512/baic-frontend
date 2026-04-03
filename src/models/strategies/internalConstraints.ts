// internalConstraints 模型策略 —— 聚合子模块并实现 ModelStrategy 接口

import type { ModelStrategy } from './types'
import { exportGraphToJSON } from './internalConstraints/exportGraph'
import { importGraphFromJSON } from './internalConstraints/importGraph'

const internalConstraintsStrategy: ModelStrategy = {
  exportGraphToJSON,
  importGraphFromJSON,
}

export default internalConstraintsStrategy

// 保持子模块类型导出，方便外部按需引用
export * from './internalConstraints/exportTypes'
export * from './internalConstraints/defaultData'
