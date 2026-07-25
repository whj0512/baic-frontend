import type {
  ConversationMessageView,
  ConversationPart,
  ConversationRole,
} from './types'

const MAX_UNKNOWN_SUMMARY_LENGTH = 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRole(value: unknown): ConversationRole {
  switch (value) {
    case 'user':
    case 'assistant':
    case 'system':
    case 'tool':
      return value
    default:
      return 'unknown'
  }
}

function safeSummary(value: unknown): string {
  try {
    const serialized = JSON.stringify(value)
    if (typeof serialized !== 'string') {
      return String(value)
    }

    return serialized.length > MAX_UNKNOWN_SUMMARY_LENGTH
      ? `${serialized.slice(0, MAX_UNKNOWN_SUMMARY_LENGTH)}…`
      : serialized
  } catch {
    return '[无法序列化的内容]'
  }
}

function normalizePart(
  value: unknown,
  messageType?: string,
): ConversationPart {
  if (!isRecord(value)) {
    return { type: 'unknown', summary: safeSummary(value) }
  }

  if (
    messageType === 'plugin_call'
    || messageType === 'plugin_call_output'
  ) {
    return {
      type: 'tool',
      eventType: messageType,
      data: value.type === 'data' ? value.data : value,
    }
  }

  switch (value.type) {
    case 'text':
      return typeof value.text === 'string'
        ? { type: 'text', text: value.text }
        : { type: 'unknown', summary: safeSummary(value) }
    case 'file': {
      const filename =
        typeof value.filename === 'string'
          ? value.filename
          : typeof value.file_name === 'string'
            ? value.file_name
            : '未命名文件'

      return {
        type: 'file',
        filename,
        fileUrl:
          typeof value.file_url === 'string'
            ? value.file_url
            : typeof value.url === 'string'
              ? value.url
              : undefined,
        size: typeof value.size === 'number' ? value.size : undefined,
      }
    }
    case 'image':
      return typeof value.image_url === 'string'
        ? { type: 'image', imageUrl: value.image_url }
        : { type: 'unknown', summary: safeSummary(value) }
    case 'data':
      return { type: 'data', data: value.data }
    default:
      return { type: 'unknown', summary: safeSummary(value) }
  }
}

function getCreatedAt(message: Record<string, unknown>): string | undefined {
  if (typeof message.created_at === 'string') {
    return message.created_at
  }

  if (
    isRecord(message.metadata)
    && typeof message.metadata.timestamp === 'string'
  ) {
    return message.metadata.timestamp
  }

  return undefined
}

export function normalizeMessages(
  messages: unknown[],
  conversationKey: string,
): ConversationMessageView[] {
  return messages.map((value, index) => {
    if (!isRecord(value)) {
      return {
        id: `${conversationKey}:${index}:unknown`,
        role: 'unknown',
        parts: [{ type: 'unknown', summary: safeSummary(value) }],
      }
    }

    const role = normalizeRole(value.role)
    const messageType =
      typeof value.type === 'string' ? value.type : undefined
    let parts: ConversationPart[]

    if (Array.isArray(value.content)) {
      parts = value.content.map((part) => normalizePart(part, messageType))
    } else if (typeof value.content === 'string') {
      parts = [{ type: 'text', text: value.content }]
    } else if (typeof value.text === 'string') {
      parts = [{ type: 'text', text: value.text }]
    } else {
      parts = [{ type: 'unknown', summary: safeSummary(value.content ?? value) }]
    }

    return {
      id:
        typeof value.id === 'string' && value.id.length > 0
          ? value.id
          : `${conversationKey}:${index}:${role}`,
      role,
      parts,
      createdAt: getCreatedAt(value),
      status: typeof value.status === 'string' ? value.status : undefined,
    }
  })
}
