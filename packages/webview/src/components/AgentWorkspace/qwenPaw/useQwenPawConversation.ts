import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import { getRuntimeConfig } from '../../../config/runtime'
import {
  INITIAL_QWENPAW_CONVERSATION_STATE,
  getConversationKey,
  qwenPawConversationReducer,
} from './conversationReducer'
import {
  fetchChats,
  streamChat,
} from './qwenPawClient'
import type {
  ActiveConversationRef,
  ConversationMessageView,
  QwenPawChatSpec,
  QwenPawContent,
  QwenPawHistoryStatus,
} from './types'
import { QwenPawError } from './types'

const REGISTRATION_DELAYS_MS = [0, 250, 500, 1000]

interface LastSendRequest {
  contents: QwenPawContent[]
  userMessageId: string
  assistantMessageId: string
}

function toRequestContents(contents: QwenPawContent[]): QwenPawContent[] {
  return contents.map((content) =>
    content.type === 'file'
      ? {
          type: 'file',
          filename: content.filename,
          file_url: content.file_url,
        }
      : content)
}

export function createDraftConversation(
  agentId: string,
  projectId: string,
  createId: () => string = () => crypto.randomUUID(),
): ActiveConversationRef {
  return {
    kind: 'draft',
    agentId,
    projectId,
    chatId: null,
    sessionId: `baic-${createId()}`,
    userId: `baic-project:${projectId}`,
    channel: 'console',
  }
}

export function createPersistedConversation(
  agentId: string,
  chat: QwenPawChatSpec,
  projectId?: string,
): ActiveConversationRef {
  return {
    kind: 'persisted',
    agentId,
    projectId,
    chatId: chat.id,
    sessionId: chat.session_id,
    userId: chat.user_id,
    channel: chat.channel,
  }
}

export function matchRegisteredChat(
  chats: QwenPawChatSpec[],
  conversation: ActiveConversationRef,
): QwenPawChatSpec | null {
  return chats.find((chat) =>
    chat.session_id === conversation.sessionId
    && chat.user_id === conversation.userId
    && chat.channel === conversation.channel) ?? null
}

function abortableDelay(
  delayMs: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(signal.reason)
  }
  if (delayMs === 0) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const handleAbort = () => {
      globalThis.clearTimeout(timeout)
      reject(signal.reason)
    }
    const timeout = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, delayMs)
    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

interface UseQwenPawConversationOptions {
  sessions: QwenPawChatSpec[]
  selectedChat: QwenPawChatSpec | null
  historyChatId: string | null
  historyMessages: ConversationMessageView[]
  historyStatus: QwenPawHistoryStatus
  historyError: QwenPawError | null
  adoptChat: (chat: QwenPawChatSpec) => void
  reloadSessions: () => void
  retryHistory: () => void
}

export function useQwenPawConversation({
  sessions,
  selectedChat,
  historyChatId,
  historyMessages,
  historyStatus,
  historyError,
  adoptChat,
  reloadSessions,
  retryHistory,
}: UseQwenPawConversationOptions) {
  const [state, dispatch] = useReducer(
    qwenPawConversationReducer,
    INITIAL_QWENPAW_CONVERSATION_STATE,
  )
  const streamControllerRef = useRef<AbortController | null>(null)
  const streamRequestIdRef = useRef(0)
  const activeConversationRef =
    useRef<ActiveConversationRef | null>(null)
  const lastSendRef = useRef<LastSendRequest | null>(null)
  const streamFrameRef = useRef<number | null>(null)
  const pendingStreamRef = useRef<{
    assistantMessageId: string
    text: string
    mode: 'append' | 'replace'
  } | null>(null)

  const flushStreamText = useCallback(() => {
    if (streamFrameRef.current !== null) {
      cancelAnimationFrame(streamFrameRef.current)
      streamFrameRef.current = null
    }

    const pendingStream = pendingStreamRef.current
    pendingStreamRef.current = null
    if (pendingStream) {
      dispatch({
        type: 'stream_text',
        ...pendingStream,
      })
    }
  }, [])

  const queueStreamText = useCallback((
    assistantMessageId: string,
    text: string,
    mode: 'append' | 'replace',
  ) => {
    const pendingStream = pendingStreamRef.current
    if (
      !pendingStream
      || pendingStream.assistantMessageId !== assistantMessageId
      || mode === 'replace'
    ) {
      pendingStreamRef.current = { assistantMessageId, text, mode }
    } else {
      pendingStreamRef.current = {
        ...pendingStream,
        text: `${pendingStream.text}${text}`,
      }
    }

    if (streamFrameRef.current === null) {
      streamFrameRef.current = requestAnimationFrame(flushStreamText)
    }
  }, [flushStreamText])

  const activate = useCallback((
    conversation: ActiveConversationRef | null,
    messages: ConversationMessageView[] = [],
  ) => {
    activeConversationRef.current = conversation
    lastSendRef.current = null
    dispatch({
      type: 'activate',
      conversation,
      messages,
      status: conversation?.kind === 'persisted' ? 'loading' : undefined,
    })
  }, [])

  const stop = useCallback(() => {
    if (!streamControllerRef.current) {
      return
    }

    flushStreamText()
    streamControllerRef.current.abort(
      new DOMException('User stopped', 'AbortError'),
    )
    dispatch({ type: 'send_stopped' })
  }, [flushStreamText])

  const startDraft = useCallback((agentId: string, projectId: string) => {
    stop()
    const draft = createDraftConversation(agentId, projectId)
    activate(draft)
    return draft
  }, [activate, stop])

  const openPersisted = useCallback((
    agentId: string,
    chat: QwenPawChatSpec,
    projectId?: string,
  ) => {
    stop()
    const conversation = createPersistedConversation(agentId, chat, projectId)
    activate(conversation)
    return conversation
  }, [activate, stop])

  // Load history messages when the active conversation is a persisted one and the history is loaded
  useEffect(() => {
    const conversation = activeConversationRef.current
    if (
      historyStatus !== 'ready'
      || !conversation
      || conversation.kind !== 'persisted'
      || selectedChat?.id !== conversation.chatId
      || historyChatId !== conversation.chatId
    ) {
      return
    }

    const conversationKey = getConversationKey(conversation)
    if (conversationKey) {
      dispatch({
        type: 'history_loaded',
        conversationKey,
        messages: historyMessages,
      })
    }
  }, [
    historyChatId,
    historyMessages,
    historyStatus,
    selectedChat?.id,
  ])

  // Handle history loading errors for the active persisted conversation
  useEffect(() => {
    const conversation = activeConversationRef.current
    if (
      !historyError
      || !conversation
      || conversation.kind !== 'persisted'
      || selectedChat?.id !== conversation.chatId
      || state.messages.length > 0
    ) {
      return
    }

    const conversationKey = getConversationKey(conversation)
    if (conversationKey) {
      dispatch({
        type: 'history_failed',
        conversationKey,
        error: historyError,
      })
    }
  }, [historyError, selectedChat?.id, state.messages.length])

  // When the active conversation is a draft, check if it has been registered as a persisted chat and update the state accordingly
  useEffect(() => {
    const conversation = activeConversationRef.current
    if (!conversation || conversation.kind !== 'draft') {
      return
    }

    const registeredChat = matchRegisteredChat(sessions, conversation)
    if (!registeredChat) {
      return
    }

    const persisted = createPersistedConversation(
      conversation.agentId,
      registeredChat,
      conversation.projectId,
    )
    activeConversationRef.current = persisted
    adoptChat(registeredChat)
    dispatch({ type: 'registered', conversation: persisted })
  }, [adoptChat, sessions])

  useEffect(() => () => {
    streamRequestIdRef.current += 1
    streamControllerRef.current?.abort()
    streamControllerRef.current = null
    if (streamFrameRef.current !== null) {
      cancelAnimationFrame(streamFrameRef.current)
    }
    streamFrameRef.current = null
    pendingStreamRef.current = null
  }, [])

  const findRegistration = useCallback(async (
    conversation: ActiveConversationRef,
    signal: AbortSignal,
  ): Promise<QwenPawChatSpec | null> => {
    for (const delayMs of REGISTRATION_DELAYS_MS) {
      await abortableDelay(delayMs, signal)
      const chats = await fetchChats(conversation.agentId, {
        userId: conversation.userId,
        channel: conversation.channel,
      }, signal)
      const match = matchRegisteredChat(chats, conversation)
      if (match) {
        return match
      }
    }

    return null
  }, [])

  const executeSend = useCallback(async (
    conversation: ActiveConversationRef,
    contents: QwenPawContent[],
    userMessageId: string,
    assistantMessageId: string,
  ): Promise<void> => {
    const controller = new AbortController()
    const requestId = streamRequestIdRef.current + 1
    streamRequestIdRef.current = requestId
    streamControllerRef.current = controller
    const timeout = globalThis.setTimeout(() => {
      controller.abort(new DOMException('Chat timeout', 'TimeoutError'))
    }, getRuntimeConfig().qwenPawChatTimeoutMs)

    try {
      for await (const event of streamChat({
        agentId: conversation.agentId,
        input: [{ role: 'user', content: toRequestContents(contents) }],
        stream: true,
        session_id: conversation.sessionId,
        user_id: conversation.userId,
        channel: conversation.channel,
      }, controller.signal)) {
        if (
          controller.signal.aborted
          || streamRequestIdRef.current !== requestId
        ) {
          return
        }

        if (
          event.object === 'content'
          && event.type === 'text'
          && typeof event.text === 'string'
        ) {
          queueStreamText(
            assistantMessageId,
            event.text,
            event.status === 'completed' || event.delta !== true
              ? 'replace'
              : 'append',
          )
        }
      }

      if (
        controller.signal.aborted
        || streamRequestIdRef.current !== requestId
      ) {
        return
      }

      globalThis.clearTimeout(timeout)
      flushStreamText()
      dispatch({
        type: 'send_completed',
        userMessageId,
        assistantMessageId,
      })

      if (conversation.kind === 'draft') {
        dispatch({ type: 'registration_syncing' })
        const registeredChat = await findRegistration(
          conversation,
          controller.signal,
        )

        if (
          controller.signal.aborted
          || streamRequestIdRef.current !== requestId
        ) {
          return
        }

        if (registeredChat) {
          const persisted = createPersistedConversation(
            conversation.agentId,
            registeredChat,
            conversation.projectId,
          )
          activeConversationRef.current = persisted
          adoptChat(registeredChat)
          dispatch({ type: 'registered', conversation: persisted })
        } else {
          dispatch({ type: 'registration_pending' })
          reloadSessions()
        }
      } else {
        reloadSessions()
        retryHistory()
      }
    } catch (error) {
      if (streamRequestIdRef.current !== requestId) {
        return
      }

      flushStreamText()
      const sendError =
        error instanceof QwenPawError
          ? error
          : new QwenPawError('network', 'QwenPaw 发送失败', {
              cause: error,
            })
      if (sendError.kind === 'abort') {
        dispatch({ type: 'send_stopped' })
      } else {
        dispatch({
          type: 'send_failed',
          error: sendError,
        })
      }
      if (import.meta.env.DEV) {
        console.error('[QwenPaw] 聊天请求失败', {
          endpoint: 'chat',
          agentId: conversation.agentId.slice(0, 12),
          sessionId: conversation.sessionId.slice(0, 12),
          kind: sendError.kind,
          status: sendError.status,
        })
      }
      throw sendError
    } finally {
      globalThis.clearTimeout(timeout)
      if (streamRequestIdRef.current === requestId) {
        streamControllerRef.current = null
      }
    }
  }, [
    adoptChat,
    findRegistration,
    flushStreamText,
    queueStreamText,
    reloadSessions,
    retryHistory,
  ])

  const send = useCallback(async (
    contents: QwenPawContent[],
  ): Promise<void> => {
    const conversation = activeConversationRef.current
    if (!conversation) {
      throw new QwenPawError('protocol', '当前没有可发送的 QwenPaw 会话')
    }
    if (conversation.channel !== 'console') {
      throw new QwenPawError('protocol', '该渠道会话当前仅支持查看')
    }
    if (streamControllerRef.current) {
      throw new QwenPawError('protocol', '当前会话正在生成回复')
    }
    if (contents.length === 0) {
      throw new QwenPawError('protocol', '发送内容不能为空')
    }

    const userMessageId =
      `local:${conversation.sessionId}:user:${crypto.randomUUID()}`
    const assistantMessageId =
      `local:${conversation.sessionId}:assistant:${crypto.randomUUID()}`
    const userMessage: ConversationMessageView = {
      id: userMessageId,
      role: 'user',
      parts: contents.map((content) => {
        switch (content.type) {
          case 'text':
            return { type: 'text' as const, text: content.text }
          case 'file':
            return {
              type: 'file' as const,
              filename: content.filename,
              fileUrl: content.file_url,
              size: content.size,
            }
          case 'image':
            return { type: 'image' as const, imageUrl: content.image_url }
          case 'data':
            return { type: 'data' as const, data: content.data }
        }
      }),
      transient: true,
      status: 'sending',
    }
    const assistantMessage: ConversationMessageView = {
      id: assistantMessageId,
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
      transient: true,
      status: 'generating',
    }
    lastSendRef.current = {
      contents,
      userMessageId,
      assistantMessageId,
    }
    dispatch({ type: 'send_started', userMessage, assistantMessage })
    await executeSend(
      conversation,
      contents,
      userMessageId,
      assistantMessageId,
    )
  }, [executeSend])

  const retry = useCallback(async (): Promise<void> => {
    const conversation = activeConversationRef.current
    const lastSend = lastSendRef.current
    if (!conversation || !lastSend) {
      throw new QwenPawError('protocol', '没有可重试的发送请求')
    }
    if (streamControllerRef.current) {
      throw new QwenPawError('protocol', '当前会话正在生成回复')
    }

    dispatch({
      type: 'retry_started',
      assistantMessageId: lastSend.assistantMessageId,
    })
    await executeSend(
      conversation,
      lastSend.contents,
      lastSend.userMessageId,
      lastSend.assistantMessageId,
    )
  }, [executeSend])

  const clear = useCallback(() => {
    stop()
    activate(null)
  }, [activate, stop])

  return {
    ...state,
    streaming: state.status === 'generating',
    canSend:
      state.activeConversation !== null
      && state.activeConversation.channel === 'console'
      && state.status !== 'generating',
    startDraft,
    openPersisted,
    send,
    retry,
    stop,
    clear,
  }
}
