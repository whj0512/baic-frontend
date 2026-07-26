import type {
  ConversationMessageView,
  ConversationPart,
  ConversationRole,
} from './types'

const MAX_UNKNOWN_SUMMARY_LENGTH = 1000
const LOCAL_WINDOWS_PATH_PATTERN = /\/?[A-Za-z]:\\[^\r\n"]+/g
const UPLOADED_FILE_PATH_MESSAGE_PATTERN =
  /^用户上传文件，已经下载到\s+\/?[A-Za-z]:\\/u

function redactLocalPaths(value: string): string {
  return value.replace(
    LOCAL_WINDOWS_PATH_PATTERN,
    '[本地路径已隐藏]',
  )
}

function sanitizeText(value: string): string {
  if (UPLOADED_FILE_PATH_MESSAGE_PATTERN.test(value.trim())) {
    return '用户上传文件已就绪。'
  }

  return redactLocalPaths(value)
}

function sanitizeData(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') {
    return redactLocalPaths(value)
  }
  if (!value || typeof value !== 'object') {
    return value
  }
  if (seen.has(value)) {
    return '[循环引用]'
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeData(item, seen))
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sanitizeData(item, seen),
    ]),
  )
}

function isLocalFilePath(value: string): boolean {
  return /^\/?[A-Za-z]:\\/u.test(value)
}

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
    const serialized = JSON.stringify(sanitizeData(value))
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
      data: sanitizeData(value.type === 'data' ? value.data : value),
    }
  }

  switch (value.type) {
    case 'text':
      return typeof value.text === 'string'
        ? { type: 'text', text: sanitizeText(value.text) }
        : { type: 'unknown', summary: safeSummary(value) }
    case 'file': {
      const filename =
        typeof value.filename === 'string'
          ? value.filename
          : typeof value.file_name === 'string'
            ? value.file_name
            : '未命名文件'

      const fileUrl =
        typeof value.file_url === 'string'
          ? value.file_url
          : typeof value.url === 'string'
            ? value.url
            : undefined

      return {
        type: 'file',
        filename,
        fileUrl:
          fileUrl && !isLocalFilePath(fileUrl)
            ? fileUrl
            : undefined,
        size: typeof value.size === 'number' ? value.size : undefined,
      }
    }
    case 'image':
      return typeof value.image_url === 'string'
        ? { type: 'image', imageUrl: value.image_url }
        : { type: 'unknown', summary: safeSummary(value) }
    case 'data':
      return { type: 'data', data: sanitizeData(value.data) }
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

function normalizeMessage(
  value: unknown,
  index: number,
  conversationKey: string,
): ConversationMessageView {
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
    parts = [{ type: 'text', text: sanitizeText(value.content) }]
  } else if (typeof value.text === 'string') {
    parts = [{ type: 'text', text: sanitizeText(value.text) }]
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
}

function appendTurnParts(
  currentParts: ConversationPart[],
  nextParts: ConversationPart[],
): ConversationPart[] {
  const mergedParts = [...currentParts]

  nextParts.forEach((part) => {
    const previousPart = mergedParts[mergedParts.length - 1]
    if (previousPart?.type === 'text' && part.type === 'text') {
      const separator =
        previousPart.text.length > 0 && part.text.length > 0 ? '\n\n' : ''
      mergedParts[mergedParts.length - 1] = {
        type: 'text',
        text: `${previousPart.text}${separator}${part.text}`,
      }
      return
    }

    mergedParts.push(part)
  })

  return mergedParts
}

function groupMessagesByTurn(
  messages: ConversationMessageView[],
): ConversationMessageView[] {
  // QwenPaw persists one assistant turn as multiple message/tool records.
  // The next user message is the stable boundary between two visible turns.
  const groupedMessages: ConversationMessageView[] = []
  let userTurnStarted = false
  let assistantTurn: ConversationMessageView | null = null

  const flushAssistantTurn = () => {
    if (assistantTurn) {
      groupedMessages.push(assistantTurn)
      assistantTurn = null
    }
  }

  messages.forEach((message) => {
    if (message.role === 'user') {
      flushAssistantTurn()
      groupedMessages.push(message)
      userTurnStarted = true
      return
    }

    if (!userTurnStarted) {
      groupedMessages.push(message)
      return
    }

    if (!assistantTurn) {
      assistantTurn = {
        ...message,
        role: 'assistant',
        parts: [...message.parts],
      }
      return
    }

    assistantTurn = {
      ...assistantTurn,
      parts: appendTurnParts(assistantTurn.parts, message.parts),
      createdAt:
        message.role === 'assistant'
          ? message.createdAt ?? assistantTurn.createdAt
          : assistantTurn.createdAt ?? message.createdAt,
      status:
        message.role === 'assistant'
          ? message.status ?? assistantTurn.status
          : assistantTurn.status ?? message.status,
    }
  })

  flushAssistantTurn()
  return groupedMessages
}

export function normalizeMessages(
  messages: unknown[],
  conversationKey: string,
): ConversationMessageView[] {
  return groupMessagesByTurn(
    messages.map((value, index) =>
      normalizeMessage(value, index, conversationKey)),
  )
}
