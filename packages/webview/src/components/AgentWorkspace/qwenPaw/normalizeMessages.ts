import type {
  ConversationMessageView,
  ConversationPart,
  ConversationRole,
} from './types'

const MAX_UNKNOWN_SUMMARY_LENGTH = 1000
const LOCAL_WINDOWS_PATH_PATTERN = /\/?[A-Za-z]:\\[^\r\n"]+/g
const TOOL_PANEL_SCRIPT_BASENAMES = [
  'query_function_relations.py',
  'query_ontology_qa_results.py',
] as const
const UPLOADED_FILE_PATH_MESSAGE_PATTERN =
  /^用户上传文件，已经下载到\s+\/?[A-Za-z]:\\/u
const ONTOLOGY_WORKFLOW_USER_PREFIXES = [
  '请使用 requirement_itemizer 对系统需求文档进行条目化。',
  '请使用 $query-project-chunks 查询以下项目根目录的 chunks.json。',
  '请使用 requirement_analysis_pipeline 对一个功能进行完整建模。',
  '请使用 $query-requirement-dsl-artifacts 查询以下项目根目录中已生成的需求 DSL 产物。',
  '请将该项目已验证的 DSL 和 requirement_relations.json 转换为 TTL。',
  '我明确授权向 GraphDB 写入本项目 ABox。',
  '我明确授权在 GraphDB 仓库',
  '请使用 $query-project-ontology-instances 加载当前项目的本体实例关系图。',
] as const
const CHUNKS_PROJECT_ROOT_PATTERN =
  /"project_root"\s*:\s*"(?:\\.|[^"\\])*"/g

interface NormalizedMessageRecord extends ConversationMessageView {
  messageType?: string
}

interface MutableAssistantTurn {
  message: ConversationMessageView
  pendingToolIndices: Map<string, number>
}

function redactLocalPaths(value: string): string {
  return value.replace(
    LOCAL_WINDOWS_PATH_PATTERN,
    (localPath) => {
      const normalizedPath = localPath
        .replaceAll('\\', '/')
        .replace(/\/+$/u, '')
        .toLowerCase()
      const scriptBasename = TOOL_PANEL_SCRIPT_BASENAMES.find((basename) =>
        normalizedPath.endsWith(basename))
      return scriptBasename
        ? `[本地路径已隐藏]/${scriptBasename}`
        : '[本地路径已隐藏]'
    },
  )
}

function isOntologyWorkflowUserText(value: string): boolean {
  const trimmed = value.trim()
  return ONTOLOGY_WORKFLOW_USER_PREFIXES.some((prefix) =>
    trimmed.startsWith(prefix))
}

function preserveChunksProjectRoot(value: string): string {
  const protectedValues: string[] = []
  const protectedText = value.replace(CHUNKS_PROJECT_ROOT_PATTERN, (match) => {
    const index = protectedValues.push(match) - 1
    return `__BAIC_CHUNKS_PROJECT_ROOT_${index}__`
  })
  const redacted = redactLocalPaths(protectedText)
  return protectedValues.reduce(
    (text, protectedValue, index) =>
      text.replace(`__BAIC_CHUNKS_PROJECT_ROOT_${index}__`, protectedValue),
    redacted,
  )
}

function sanitizeText(
  value: string,
  role?: ConversationRole,
  messageType?: string,
): string {
  if (UPLOADED_FILE_PATH_MESSAGE_PATTERN.test(value.trim())) {
    return '用户上传文件已就绪。'
  }

  if (
    role === 'user'
    && messageType !== 'reasoning'
    && isOntologyWorkflowUserText(value)
  ) {
    return value
  }

  if (
    role === 'assistant'
    && messageType !== 'reasoning'
    && value.includes('```chunks')
  ) {
    return preserveChunksProjectRoot(value)
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

function normalizeToolPart(
  value: unknown,
  eventType: string,
): ConversationPart {
  const rawData =
    isRecord(value) && value.type === 'data' ? value.data : value
  const data = sanitizeData(rawData)
  const toolData = isRecord(data) ? data : null
  const input =
    eventType === 'plugin_call'
      ? toolData?.arguments ?? toolData?.input
      : undefined
  const output =
    eventType === 'plugin_call_output'
      ? toolData?.output ?? toolData?.result
      : undefined

  return {
    type: 'tool',
    eventType,
    callId:
      typeof toolData?.call_id === 'string' ? toolData.call_id : undefined,
    name: typeof toolData?.name === 'string' ? toolData.name : undefined,
    input,
    output,
    data,
  }
}

function normalizePart(
  value: unknown,
  messageType?: string,
  role?: ConversationRole,
): ConversationPart {
  if (
    messageType === 'plugin_call'
    || messageType === 'plugin_call_output'
  ) {
    return normalizeToolPart(value, messageType)
  }

  if (!isRecord(value)) {
    return { type: 'unknown', summary: safeSummary(value) }
  }

  switch (value.type) {
    case 'text':
      if (typeof value.text !== 'string') {
        return { type: 'unknown', summary: safeSummary(value) }
      }
      return messageType === 'reasoning'
        ? { type: 'reasoning', text: sanitizeText(value.text, role, messageType) }
        : { type: 'text', text: sanitizeText(value.text, role, messageType) }
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

export function normalizeStreamingToolPart(
  value: unknown,
): Extract<ConversationPart, { type: 'tool' }> | null {
  if (
    !isRecord(value)
    || (value.type !== 'plugin_call' && value.type !== 'plugin_call_output')
  ) {
    return null
  }

  const candidates = Array.isArray(value.content)
    ? value.content
    : value.data === undefined
      ? []
      : [{ type: 'data', data: value.data }]

  for (const candidate of candidates) {
    const part = normalizePart(candidate, value.type)
    if (part.type === 'tool') {
      return part
    }
  }

  return null
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

function getOriginalId(message: Record<string, unknown>): string | undefined {
  if (
    isRecord(message.metadata)
    && typeof message.metadata.original_id === 'string'
    && message.metadata.original_id.length > 0
  ) {
    return message.metadata.original_id
  }

  return undefined
}

function createStableMessageId(
  message: Record<string, unknown>,
  role: ConversationRole,
  messageType: string | undefined,
  index: number,
  conversationKey: string,
  idOccurrences: Map<string, number>,
): string {
  const sourceId =
    getOriginalId(message)
    ?? getCreatedAt(message)
    ?? `${role}:${index}`
  const occurrenceKey = `${sourceId}:${role}:${messageType ?? 'unknown'}`
  const occurrence = idOccurrences.get(occurrenceKey) ?? 0
  idOccurrences.set(occurrenceKey, occurrence + 1)

  return `${conversationKey}:${occurrenceKey}:${occurrence}`
}

function normalizeMessage(
  value: unknown,
  index: number,
  conversationKey: string,
  idOccurrences: Map<string, number>,
): NormalizedMessageRecord {
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
    parts = value.content.map((part) => normalizePart(part, messageType, role))
  } else if (typeof value.content === 'string') {
    const text = sanitizeText(value.content, role, messageType)
    parts = [
      messageType === 'reasoning'
        ? { type: 'reasoning', text }
        : { type: 'text', text },
    ]
  } else if (typeof value.text === 'string') {
    const text = sanitizeText(value.text, role, messageType)
    parts = [
      messageType === 'reasoning'
        ? { type: 'reasoning', text }
        : { type: 'text', text },
    ]
  } else {
    parts = [{ type: 'unknown', summary: safeSummary(value.content ?? value) }]
  }

  return {
    id: createStableMessageId(
      value,
      role,
      messageType,
      index,
      conversationKey,
      idOccurrences,
    ),
    role,
    parts,
    messageType,
    createdAt: getCreatedAt(value),
    status: typeof value.status === 'string' ? value.status : undefined,
  }
}

function mergeToolParts(
  callPart: Extract<ConversationPart, { type: 'tool' }>,
  outputPart: Extract<ConversationPart, { type: 'tool' }>,
): ConversationPart {
  return {
    type: 'tool',
    eventType: 'plugin_call_and_output',
    callId: callPart.callId ?? outputPart.callId,
    name: callPart.name ?? outputPart.name,
    input: callPart.input,
    output: outputPart.output ?? outputPart.data,
    data: {
      call: callPart.data,
      output: outputPart.data,
    },
  }
}

function appendPart(
  turn: MutableAssistantTurn,
  part: ConversationPart,
): void {
  const parts = turn.message.parts

  if (part.type === 'tool' && part.callId) {
    if (part.eventType === 'plugin_call') {
      turn.pendingToolIndices.set(part.callId, parts.length)
      parts.push(part)
      return
    }

    if (part.eventType === 'plugin_call_output') {
      const callIndex = turn.pendingToolIndices.get(part.callId)
      const callPart =
        typeof callIndex === 'number' ? parts[callIndex] : undefined
      if (callPart?.type === 'tool') {
        parts[callIndex] = mergeToolParts(callPart, part)
        turn.pendingToolIndices.delete(part.callId)
        return
      }
    }
  }

  const previousPart = parts[parts.length - 1]
  if (previousPart?.type === 'text' && part.type === 'text') {
    const separator =
      previousPart.text.length > 0 && part.text.length > 0 ? '\n\n' : ''
    previousPart.text = `${previousPart.text}${separator}${part.text}`
    return
  }

  if (previousPart?.type === 'reasoning' && part.type === 'reasoning') {
    const separator =
      previousPart.text.length > 0 && part.text.length > 0 ? '\n\n' : ''
    previousPart.text = `${previousPart.text}${separator}${part.text}`
    return
  }

  parts.push(part)
}

function toMessageView(
  message: NormalizedMessageRecord,
): ConversationMessageView {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts,
    createdAt: message.createdAt,
    status: message.status,
    transient: message.transient,
  }
}

function groupMessagesByTurn(
  messages: NormalizedMessageRecord[],
  conversationKey: string,
): ConversationMessageView[] {
  // QwenPaw persists one visible turn as reasoning, message, and tool records.
  // Preserve those semantics while using the next user message as the boundary.
  const groupedMessages: ConversationMessageView[] = []
  let userTurnStarted = false
  let currentUserId: string | null = null
  let assistantTurn: MutableAssistantTurn | null = null

  const flushAssistantTurn = () => {
    if (assistantTurn) {
      groupedMessages.push(assistantTurn.message)
      assistantTurn = null
    }
  }

  messages.forEach((message) => {
    if (message.role === 'user') {
      flushAssistantTurn()
      groupedMessages.push(toMessageView(message))
      userTurnStarted = true
      currentUserId = message.id
      return
    }

    if (!userTurnStarted) {
      groupedMessages.push(toMessageView(message))
      return
    }

    if (!assistantTurn) {
      assistantTurn = {
        message: {
          id: `${currentUserId ?? message.id}:assistant`,
          role: 'assistant',
          parts: [],
          createdAt: message.createdAt,
          status: message.status,
        },
        pendingToolIndices: new Map(),
      }
    }

    const currentTurn = assistantTurn
    message.parts.forEach((part) => appendPart(currentTurn, part))

    if (message.role === 'assistant' && message.messageType === 'message') {
      currentTurn.message.createdAt =
        message.createdAt ?? currentTurn.message.createdAt
      currentTurn.message.status =
        message.status ?? currentTurn.message.status
    }
  })

  flushAssistantTurn()
  return groupedMessages
}

export function normalizeMessages(
  messages: unknown[],
  conversationKey: string,
): ConversationMessageView[] {
  const idOccurrences = new Map<string, number>()
  const normalizedMessages = messages.map((value, index) =>
    normalizeMessage(
      value,
      index,
      conversationKey,
      idOccurrences,
    ))

  return groupMessagesByTurn(normalizedMessages, conversationKey)
}
