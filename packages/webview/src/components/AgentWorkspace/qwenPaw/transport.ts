import type { QwenPawChatFilters } from '../../../config/api'
import type {
  QwenPawAgent,
  QwenPawChatHistory,
  QwenPawChatRequest,
  QwenPawChatSpec,
  QwenPawSseEvent,
  QwenPawUploadResponse,
} from './types'

export interface QwenPawTransport {
  fetchAgents: (signal?: AbortSignal) => Promise<QwenPawAgent[]>
  fetchChats: (
    agentId: string,
    filters?: QwenPawChatFilters,
    signal?: AbortSignal,
  ) => Promise<QwenPawChatSpec[]>
  fetchChatHistory: (
    agentId: string,
    chatId: string,
    signal?: AbortSignal,
  ) => Promise<QwenPawChatHistory>
  uploadFile: (
    agentId: string,
    file: File,
    signal?: AbortSignal,
  ) => Promise<QwenPawUploadResponse>
  streamChat: (
    request: QwenPawChatRequest,
    signal: AbortSignal,
    onActivity?: () => void,
  ) => AsyncGenerator<QwenPawSseEvent>
}
