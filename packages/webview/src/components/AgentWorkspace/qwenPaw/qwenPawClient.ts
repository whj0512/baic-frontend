import {
  QWENPAW_ENDPOINTS,
  type QwenPawChatFilters,
} from '../../../config/api'
import { readQwenPawSse } from './qwenPawSse'
import {
  QwenPawError,
  type QwenPawAgent,
  type QwenPawAgentsResponse,
  type QwenPawChatHistory,
  type QwenPawChatRequest,
  type QwenPawChatSpec,
  type QwenPawSseEvent,
  type QwenPawUploadResponse,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseAgent(value: unknown, index: number): QwenPawAgent | null {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.id)
    || typeof value.name !== 'string'
    || typeof value.description !== 'string'
    || typeof value.enabled !== 'boolean'
  ) {
    console.warn(`[QwenPaw] 忽略无效 Agent，索引 ${index}`, value)
    return null
  }

  let activeModel: QwenPawAgent['active_model']
  if (value.active_model === null) {
    activeModel = null
  } else if (isRecord(value.active_model)) {
    activeModel = {
      provider_id:
        typeof value.active_model.provider_id === 'string'
          ? value.active_model.provider_id
          : undefined,
      model:
        typeof value.active_model.model === 'string'
          ? value.active_model.model
          : undefined,
    }
  }

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    workspace_dir:
      typeof value.workspace_dir === 'string' ? value.workspace_dir : undefined,
    enabled: value.enabled,
    active_model: activeModel,
  }
}

function parseAgentsResponse(value: unknown): QwenPawAgentsResponse {
  if (!isRecord(value) || !Array.isArray(value.agents)) {
    throw new QwenPawError('protocol', 'QwenPaw Agent 列表响应结构无效', {
      details: value,
    })
  }

  return {
    agents: value.agents.flatMap((agent, index) => {
      const parsedAgent = parseAgent(agent, index)
      return parsedAgent ? [parsedAgent] : []
    }),
  }
}

function parseChatSpec(value: unknown, index: number): QwenPawChatSpec | null {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.id)
    || typeof value.name !== 'string'
    || !isNonEmptyString(value.session_id)
    || !isNonEmptyString(value.user_id)
    || !isNonEmptyString(value.channel)
  ) {
    console.warn(`[QwenPaw] 忽略无效 ChatSpec，索引 ${index}`, value)
    return null
  }

  return {
    id: value.id,
    name: value.name,
    session_id: value.session_id,
    user_id: value.user_id,
    channel: value.channel,
    created_at: typeof value.created_at === 'string' ? value.created_at : '',
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : '',
    meta: isRecord(value.meta) ? value.meta : {},
    status: typeof value.status === 'string' ? value.status : 'idle',
    pinned: value.pinned === true,
    source: typeof value.source === 'string' ? value.source : 'chat',
  }
}

function parseChatsResponse(value: unknown): QwenPawChatSpec[] {
  if (!Array.isArray(value)) {
    throw new QwenPawError('protocol', 'QwenPaw 会话列表响应必须是数组', {
      details: value,
    })
  }

  return value.flatMap((chat, index) => {
    const parsedChat = parseChatSpec(chat, index)
    return parsedChat ? [parsedChat] : []
  })
}

function parseChatHistory(value: unknown): QwenPawChatHistory {
  if (
    !isRecord(value)
    || !Array.isArray(value.messages)
    || typeof value.status !== 'string'
  ) {
    throw new QwenPawError('protocol', 'QwenPaw 会话详情响应结构无效', {
      details: value,
    })
  }

  return {
    messages: value.messages,
    status: value.status,
  }
}

function parseUploadResponse(value: unknown): QwenPawUploadResponse {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.url)
    || !isNonEmptyString(value.file_name)
    || typeof value.size !== 'number'
    || !Number.isFinite(value.size)
    || value.size < 0
  ) {
    throw new QwenPawError('protocol', 'QwenPaw 文件上传响应结构无效', {
      details: value,
    })
  }

  return {
    url: value.url,
    file_name: value.file_name,
    size: value.size,
  }
}

async function createHttpError(response: Response): Promise<QwenPawError> {
  const rawText = await response.text()
  let details: unknown = rawText
  let message = `QwenPaw 请求失败（HTTP ${response.status}）`

  if (rawText) {
    try {
      details = JSON.parse(rawText)
      if (isRecord(details) && typeof details.detail === 'string') {
        message = details.detail
      }
    } catch {
      message = `${message}：${rawText}`
    }
  }

  return new QwenPawError('http', message, {
    status: response.status,
    details,
  })
}

function classifyRequestError(
  error: unknown,
  signal?: AbortSignal,
): QwenPawError {
  if (error instanceof QwenPawError) {
    return error
  }

  if (signal?.aborted) {
    const reason = signal.reason
    const timedOut =
      reason instanceof DOMException && reason.name === 'TimeoutError'

    return new QwenPawError(
      timedOut ? 'timeout' : 'abort',
      timedOut ? 'QwenPaw 请求超时' : 'QwenPaw 请求已取消',
      { cause: error },
    )
  }

  return new QwenPawError('network', '无法连接 QwenPaw 服务', {
    cause: error,
  })
}

async function fetchJson(
  input: RequestInfo | URL,
  signal?: AbortSignal,
): Promise<unknown> {
  try {
    const response = await fetch(input, {
      headers: { Accept: 'application/json' },
      signal,
    })

    if (!response.ok) {
      throw await createHttpError(response)
    }

    try {
      return await response.json()
    } catch (error) {
      throw new QwenPawError('protocol', 'QwenPaw 返回了无效 JSON', {
        cause: error,
      })
    }
  } catch (error) {
    throw classifyRequestError(error, signal)
  }
}

export async function fetchAgents(
  signal?: AbortSignal,
): Promise<QwenPawAgent[]> {
  const response = parseAgentsResponse(
    await fetchJson(QWENPAW_ENDPOINTS.agents, signal),
  )
  return response.agents
}

export async function fetchChats(
  agentId: string,
  filters?: QwenPawChatFilters,
  signal?: AbortSignal,
): Promise<QwenPawChatSpec[]> {
  return parseChatsResponse(
    await fetchJson(QWENPAW_ENDPOINTS.agentChats(agentId, filters), signal),
  )
}

export async function fetchChatHistory(
  agentId: string,
  chatId: string,
  signal?: AbortSignal,
): Promise<QwenPawChatHistory> {
  return parseChatHistory(
    await fetchJson(QWENPAW_ENDPOINTS.agentChat(agentId, chatId), signal),
  )
}

export async function uploadFile(
  agentId: string,
  file: File,
  signal?: AbortSignal,
): Promise<QwenPawUploadResponse> {
  const body = new FormData()
  body.append('file', file, file.name)

  try {
    const response = await fetch(QWENPAW_ENDPOINTS.upload, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-Agent-Id': agentId,
      },
      body,
      signal,
    })

    if (!response.ok) {
      throw await createHttpError(response)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      throw new QwenPawError('protocol', 'QwenPaw 返回了无效上传 JSON', {
        cause: error,
      })
    }

    return parseUploadResponse(payload)
  } catch (error) {
    throw classifyRequestError(error, signal)
  }
}

export async function* streamChat(
  request: QwenPawChatRequest,
  signal: AbortSignal,
  onActivity?: () => void,
): AsyncGenerator<QwenPawSseEvent> {
  const { agentId, ...payload } = request
  let terminalStatus: 'completed' | 'failed' | null = null
  let remoteError: unknown

  try {
    const response = await fetch(QWENPAW_ENDPOINTS.chat, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        'X-Agent-Id': agentId,
      },
      body: JSON.stringify(payload),
      signal,
    })

    if (!response.ok) {
      throw await createHttpError(response)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('text/event-stream')) {
      throw new QwenPawError(
        'protocol',
        `QwenPaw 聊天响应类型无效：${contentType || '缺失'}`,
      )
    }
    if (!response.body) {
      throw new QwenPawError('protocol', 'QwenPaw 聊天响应没有可读数据流')
    }

    for await (
      const event of readQwenPawSse(response.body, signal, onActivity)
    ) {
      if (
        event.object === 'response'
        && (event.status === 'completed' || event.status === 'failed')
      ) {
        terminalStatus = event.status
        remoteError = event.error
      }

      yield event
    }

    if (signal.aborted) {
      throw classifyRequestError(signal.reason, signal)
    }
    if (!terminalStatus) {
      throw new QwenPawError(
        'protocol',
        'QwenPaw SSE 在没有 response 终态时结束',
      )
    }
    if (terminalStatus === 'failed') {
      throw new QwenPawError('remote', 'QwenPaw 智能体执行失败', {
        details: remoteError,
      })
    }
  } catch (error) {
    throw classifyRequestError(error, signal)
  }
}
