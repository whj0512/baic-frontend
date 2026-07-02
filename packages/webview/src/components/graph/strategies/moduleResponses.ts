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

const moduleResponsesStrategy: GraphStrategy = {
  stencilLayoutOptions: sequenceStencilLayoutOptions,
  stencilGraphWidth: sequenceStencilGraphWidth,
  stencilGraphHeight: sequenceStencilGraphHeight,
  stencilGraphPadding: sequenceStencilGraphPadding,
  sidebarItems: sequenceSidebarItems,
  registerNodes: registerSequenceNodes,
  edgeMode: 'sequence',
  sequenceConnection: {
    participantShapes: ['seq-object-node', 'seq-actor-node'],
  },
  formConfig: sequenceFormConfig,
}

export default moduleResponsesStrategy
