import type {
  ConversationMessageView,
  ConversationPart,
} from '../../qwenPaw/types'
import { getToolPanelHandler } from './registry'
import type {
  ExtractedToolPanel,
  RegisteredToolPanelHandler,
} from './types'

type ToolPart = Extract<ConversationPart, { type: 'tool' }>

interface CachedToolPanel {
  handler: RegisteredToolPanelHandler
  payload: unknown
}

const TOOL_PANEL_CACHE = new WeakMap<ToolPart, CachedToolPanel | null>()

function getCachedToolPanel(part: ToolPart): CachedToolPanel | null {
  const cached = TOOL_PANEL_CACHE.get(part)
  if (cached !== undefined) {
    return cached
  }

  const handler = getToolPanelHandler(part)
  const result = handler
    ? { handler, payload: handler.parse(part) }
    : null
  TOOL_PANEL_CACHE.set(part, result)
  return result
}

export function extractToolPanels(
  message: ConversationMessageView,
): ExtractedToolPanel[] {
  return message.parts.flatMap((part, partIndex) => {
    if (part.type !== 'tool') {
      return []
    }

    const cached = getCachedToolPanel(part)
    if (!cached) {
      return []
    }

    return [{
      partIndex,
      callId: part.callId ?? `${cached.handler.id}:${partIndex}`,
      payload: cached.payload,
      handler: cached.handler,
    }]
  })
}
