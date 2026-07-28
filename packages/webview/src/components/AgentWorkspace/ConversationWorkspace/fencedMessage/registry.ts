import type { ConversationRole } from '../../qwenPaw/types'
import { chunksFenceHandler } from './chunks/handler'
import type { RegisteredFenceHandler } from './types'

const FENCE_HANDLERS = new Map<string, RegisteredFenceHandler>([
  [chunksFenceHandler.keyword, chunksFenceHandler],
])

export function getFenceHandler(
  keyword: string,
  role: ConversationRole,
): RegisteredFenceHandler | null {
  const handler = FENCE_HANDLERS.get(keyword)
  return handler?.roles.includes(role) ? handler : null
}
