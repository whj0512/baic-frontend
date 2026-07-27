export interface QwenPawAgent {
  id: string
  name: string
  description: string
  workspace_dir?: string
  enabled: boolean
  active_model?: {
    provider_id?: string
    model?: string
  } | null
}

export interface QwenPawAgentsResponse {
  agents: QwenPawAgent[]
}

export interface QwenPawChatSpec {
  id: string
  name: string
  session_id: string
  user_id: string
  channel: string
  created_at: string
  updated_at: string
  meta: Record<string, unknown>
  status: 'idle' | 'running' | string
  pinned: boolean
  source: 'chat' | 'cron' | string
}

export interface QwenPawChatHistory {
  messages: unknown[]
  status: 'idle' | 'running' | string
}

export interface QwenPawUploadResponse {
  url: string
  file_name: string
  size: number
}

export type QwenPawContent =
  | { type: 'text'; text: string }
  | { type: 'image'; image_url: string }
  | { type: 'data'; data: Record<string, unknown> }
  | { type: 'file'; filename: string; file_url: string; size?: number }

export type QwenPawAttachmentState =
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'sent'

export interface QwenPawAttachment {
  id: string
  file: File
  state: QwenPawAttachmentState
  uploaded?: QwenPawUploadResponse
  error?: QwenPawError
}

export interface QwenPawInputMessage {
  role: 'user'
  content: QwenPawContent[]
}

export interface QwenPawChatRequest {
  agentId: string
  input: QwenPawInputMessage[]
  stream: true
  session_id: string
  user_id: string
  channel: string
}

export interface QwenPawSseEvent {
  [key: string]: unknown
  sequence_number?: number | null
  object?: string
  status?: string | null
  error?: unknown
  type?: string
  index?: number | null
  delta?: boolean | null
  msg_id?: string | null
  text?: string
  data?: unknown
}

export type QwenPawErrorKind =
  | 'abort'
  | 'timeout'
  | 'network'
  | 'http'
  | 'protocol'
  | 'remote'

export class QwenPawError extends Error {
  readonly kind: QwenPawErrorKind
  readonly status?: number
  readonly details?: unknown

  constructor(
    kind: QwenPawErrorKind,
    message: string,
    options?: {
      status?: number
      details?: unknown
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'QwenPawError'
    this.kind = kind
    this.status = options?.status
    this.details = options?.details
  }
}

export type QwenPawConnectionState = 'idle' | 'checking' | 'online' | 'offline'

export type ConversationRole =
  | 'user'
  | 'assistant'
  | 'system'
  | 'tool'
  | 'unknown'

export type ConversationPart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | {
      type: 'file'
      filename: string
      fileUrl?: string
      size?: number
    }
  | { type: 'image'; imageUrl: string }
  | { type: 'data'; data: unknown }
  | {
      type: 'tool'
      eventType: 'plugin_call' | 'plugin_call_output' | string
      callId?: string
      name?: string
      input?: unknown
      output?: unknown
      data?: unknown
    }
  | { type: 'unknown'; summary: string }

export interface ConversationMessageView {
  id: string
  role: ConversationRole
  parts: ConversationPart[]
  createdAt?: string
  status?: string
  transient?: boolean
}

export interface ActiveConversationRef {
  kind: 'persisted' | 'draft'
  agentId: string
  projectId?: string
  chatId: string | null
  sessionId: string
  userId: string
  channel: string
}

export type QwenPawConversationStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'stopped'

export type QwenPawHistoryStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'error'

export type QwenPawRegistrationState =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'pending'
