// models/strategies 共享类型定义

import type { Graph } from '@antv/x6'

/**
 * 模型策略接口 —— 每个 sectionKey 对应一种导出/导入实现
 */
export interface ModelStrategy {
  /** 将 X6 Graph 导出为后端 JSON */
  exportGraphToJSON: (graph: Graph, graphId?: string, graphDesc?: string) => object
  /** 将后端 JSON 字符串导入为 X6 图数据 */
  importGraphFromJSON: (jsonString: string) => object
}
