import type { ConversationPart } from '../../qwenPaw/types'
import { functionRelationsToolPanelHandler } from './functionRelations/handler'
import { ontologyInstancesToolPanelHandler } from './ontologyInstances/handler'
import { ontologyQaResultsToolPanelHandler } from './ontologyQaResults/handler'
import { requirementDslArtifactsToolPanelHandler } from './requirementDslArtifacts/handler'
import type { RegisteredToolPanelHandler } from './types'

const TOOL_PANEL_HANDLERS = [
  functionRelationsToolPanelHandler,
  ontologyInstancesToolPanelHandler,
  ontologyQaResultsToolPanelHandler,
  requirementDslArtifactsToolPanelHandler,
] satisfies RegisteredToolPanelHandler[]

export function getToolPanelHandler(
  part: Extract<ConversationPart, { type: 'tool' }>,
): RegisteredToolPanelHandler | null {
  return TOOL_PANEL_HANDLERS.find((handler) => handler.matches(part)) ?? null
}
