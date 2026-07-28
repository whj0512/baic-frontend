import type { ConversationPart } from '../../qwenPaw/types'
import { requirementDslArtifactsToolPanelHandler } from './requirementDslArtifacts/handler'
import type { RegisteredToolPanelHandler } from './types'

const TOOL_PANEL_HANDLERS = [
  requirementDslArtifactsToolPanelHandler,
] satisfies RegisteredToolPanelHandler[]

export function getToolPanelHandler(
  part: Extract<ConversationPart, { type: 'tool' }>,
): RegisteredToolPanelHandler | null {
  return TOOL_PANEL_HANDLERS.find((handler) => handler.matches(part)) ?? null
}
