import type { GraphStrategy } from './types'
import {
  registerSequenceNodes,
  sequenceSidebarItems,
  sequenceFormConfig,
  sequenceStencilLayoutOptions,
  sequenceStencilGraphWidth,
  sequenceStencilGraphHeight,
  sequenceStencilGraphPadding,
} from './sequenceDiagramShared'

const interactionStrategy: GraphStrategy = {
  stencilLayoutOptions: sequenceStencilLayoutOptions,
  stencilGraphWidth: sequenceStencilGraphWidth,
  stencilGraphHeight: sequenceStencilGraphHeight,
  stencilGraphPadding: sequenceStencilGraphPadding,
  sidebarItems: sequenceSidebarItems,
  registerNodes: registerSequenceNodes,
  // 时序图不使用 port 连线，edge 直接按坐标连接（锚点在生命线虚线上）
  // 使用 'sequence' 模式：支持 offsetY 防重叠、自连线回环、自动 label 等时序图专用逻辑
  edgeMode: 'sequence',
  formConfig: sequenceFormConfig,
}

export default interactionStrategy
