import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react'
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
} from './types'
import { QwenPawError } from './types'

const REGISTRATION_DELAYS_MS = [0, 250, 500, 1000]

export function createDraftConversation(
  agentId: string,
  projectId: string,
  createId: () => string = () => crypto.randomUUID(),
): ActiveConversationRef {
  return {
    kind: 'draft',
    agentId,
    chatId: null,
    sessionId: `baic-${createId()}`,
    userId: `baic-project:${projectId}`,
    channel: 'console',
  }
}

export function createPersistedConversation(
  agentId: string,
  chat: QwenPawChatSpec,
): ActiveConversationRef {
  return {
    kind: 'persisted',
    agentId,
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
  historyLoading: boolean
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
  historyLoading,
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

  const activate = useCallback((
    conversation: ActiveConversationRef | null,
    messages: ConversationMessageView[] = [],
  ) => {
    activeConversationRef.current = conversation
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

    streamRequestIdRef.current += 1
    streamControllerRef.current.abort()
    streamControllerRef.current = null
    dispatch({ type: 'send_stopped' })
  }, [])

  const startDraft = useCallback((agentId: string, projectId: string) => {
    stop()
    const draft = createDraftConversation(agentId, projectId)
    activate(draft)
    return draft
  }, [activate, stop])

  const openPersisted = useCallback((
    agentId: string,
    chat: QwenPawChatSpec,
  ) => {
    stop()
    const conversation = createPersistedConversation(agentId, chat)
    activate(conversation)
    return conversation
  }, [activate, stop])

  useEffect(() => {
    const conversation = activeConversationRef.current
    if (
      historyLoading
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
    historyLoading,
    historyMessages,
    selectedChat?.id,
  ])

  useEffect(() => {
    const conversation = activeConversationRef.current
    if (
      !historyError
      || !conversation
      || conversation.kind !== 'persisted'
      || selectedChat?.id !== conversation.chatId
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
  }, [historyError, selectedChat?.id])

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
    )
    activeConversationRef.current = persisted
    adoptChat(registeredChat)
    dispatch({ type: 'registered', conversation: persisted })
  }, [adoptChat, sessions])

  useEffect(() => () => {
    streamRequestIdRef.current += 1
    streamControllerRef.current?.abort()
    streamControllerRef.current = null
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

  const send = useCallback(async (
    contents: QwenPawContent[],
  ): Promise<void> => {
    const conversation = activeConversationRef.current
    if (!conversation) {
      throw new QwenPawError('protocol', '当前没有可发送的 QwenPaw 会话')
    }
    if (conversation.channel !== 'console') {
      throw new QwenPawError(
        'protocol',
        '该渠道会话当前仅支持查看',
      )
    }
    if (streamControllerRef.current) {
      throw new QwenPawError('protocol', '当前会话正在生成回复')
    }
    if (contents.length === 0) {
      throw new QwenPawError('protocol', '发送内容不能为空')
    }

    const controller = new AbortController()
    const requestId = streamRequestIdRef.current + 1
    streamRequestIdRef.current = requestId
    streamControllerRef.current = controller

    const userMessage: ConversationMessageView = {
      id: `local:${conversation.sessionId}:user:${crypto.randomUUID()}`,
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
            }
          case 'image':
            return {
              type: 'image' as const,
              imageUrl: content.image_url,
            }
          case 'data':
            return { type: 'data' as const, data: content.data }
        }
      }),
      transient: true,
      status: 'sending',
    }
    const assistantMessageId =
      `local:${conversation.sessionId}:assistant:${crypto.randomUUID()}`
    const assistantMessage: ConversationMessageView = {
      id: assistantMessageId,
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
      transient: true,
      status: 'generating',
    }
    dispatch({
      type: 'send_started',
      userMessage,
      assistantMessage,
    })

    try {
      for await (const event of streamChat({
        agentId: conversation.agentId,
        input: [{ role: 'user', content: contents }],
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
          dispatch({
            type: 'stream_text',
            assistantMessageId,
            text: event.text,
            mode:
              event.status === 'completed' || event.delta !== true
                ? 'replace'
                : 'append',
          })
        }
      }

      if (
        controller.signal.aborted
        || streamRequestIdRef.current !== requestId
      ) {
        return
      }

      dispatch({
        type: 'send_completed',
        userMessageId: userMessage.id,
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
          )
          activeConversationRef.current = persisted
          adoptChat(registeredChat)
          dispatch({ type: 'registered', conversation: persisted })
          retryHistory()
        } else {
          dispatch({ type: 'registration_pending' })
          reloadSessions()
        }
      } else {
        reloadSessions()
        retryHistory()
      }
    } catch (error) {
      if (
        controller.signal.aborted
        || streamRequestIdRef.current !== requestId
      ) {
        return
      }

      dispatch({
        type: 'send_failed',
        error:
          error instanceof QwenPawError
            ? error
            : new QwenPawError('network', 'QwenPaw 发送失败', {
                cause: error,
              }),
      })
    } finally {
      if (streamRequestIdRef.current === requestId) {
        streamControllerRef.current = null
      }
    }
  }, [
    adoptChat,
    findRegistration,
    reloadSessions,
    retryHistory,
  ])

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
    stop,
    clear,
  }
}
