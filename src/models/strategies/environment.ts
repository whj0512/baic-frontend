// environment 模型策略 —— 所处环境 (IBD)
import type { ModelStrategy } from './types'
import { exportGraphTOJSON } from './environment/exportGraph'

const environmentStrategy: ModelStrategy = {
  exportGraphToJSON: exportGraphTOJSON,

  importGraphFromJSON: (_jsonString: string) => {
    // TODO: 实现 environment (IBD) 的导入逻辑
    return { cells: [] }
  },
}

export default environmentStrategy
