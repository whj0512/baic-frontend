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
import { shouldReconcileConversationHistory } from './conversationReconciliation'
import { normalizeStreamingToolPart } from './normalizeMessages'
import type {
  ActiveConversationRef,
  ConversationMessageView,
  QwenPawChatSpec,
  QwenPawContent,
  QwenPawHistoryStatus,
} from './types'
import { QwenPawError } from './types'

const REGISTRATION_DELAYS_MS = [500, 1000, 2000, 3000]
const HISTORY_RECONCILE_INTERVAL_MS = 2000
const RECONCILED_ABORT_NAME = 'QwenPawHistoryReconciled'

interface LastSendRequest {
  contents: QwenPawContent[]
  userMessageId: string
  assistantMessageId: string
  baselineHistoryCount: number
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
  reconcileHistory: (
    agentId: string,
    chatId: string,
    signal: AbortSignal,
    surfaceStatus?: boolean,
  ) => Promise<{
    history: { status: string }
    messages: ConversationMessageView[]
  }>
  reloadSessions: () => void
}

export function useQwenPawConversation({
  sessions,
  selectedChat,
  historyChatId,
  historyMessages,
  historyStatus,
  historyError,
  adoptChat,
  reconcileHistory,
  reloadSessions,
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
    partType: 'text' | 'reasoning'
    segmentKey: string
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
    partType: 'text' | 'reasoning',
    segmentKey: string,
    text: string,
    mode: 'append' | 'replace',
  ) => {
    let pendingStream = pendingStreamRef.current
    if (
      pendingStream
      && (
        pendingStream.assistantMessageId !== assistantMessageId
        || pendingStream.partType !== partType
        || pendingStream.segmentKey !== segmentKey
      )
    ) {
      flushStreamText()
      pendingStream = null
    }

    if (
      !pendingStream
      || mode === 'replace'
    ) {
      pendingStreamRef.current = {
        assistantMessageId,
        partType,
        segmentKey,
        text,
        mode,
      }
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

  const executeSend = useCallback(async (
    conversation: ActiveConversationRef,
    contents: QwenPawContent[],
    userMessageId: string,
    assistantMessageId: string,
    baselineHistoryCount: number,
  ): Promise<void> => {
    const controller = new AbortController()
    const requestId = streamRequestIdRef.current + 1
    streamRequestIdRef.current = requestId
    streamControllerRef.current = controller
    const idleTimeoutMs = getRuntimeConfig().qwenPawChatTimeoutMs
    let idleTimeout: ReturnType<typeof globalThis.setTimeout> | null = null
    let terminalStatus: 'completed' | 'failed' | null = null
    let reconciliationDone = false
    const streamPartTypes = new Map<string, 'text' | 'reasoning'>()
    const clearIdleTimeout = () => {
      if (idleTimeout !== null) {
        globalThis.clearTimeout(idleTimeout)
        idleTimeout = null
      }
    }
    const resetIdleTimeout = () => {
      clearIdleTimeout()
      idleTimeout = globalThis.setTimeout(() => {
        controller.abort(
          new DOMException('Chat stream idle timeout', 'TimeoutError'),
        )
      }, idleTimeoutMs)
    }
    resetIdleTimeout()

    const markFinalizing = () => {
      dispatch({
        type: 'send_finalizing',
        userMessageId,
        assistantMessageId,
      })
    }
    const reconcileConversation = async () => {
      let currentConversation = conversation
      let observedRunning = false
      let registrationAttempt = 0

      try {
        while (!controller.signal.aborted) {
          if (!currentConversation.chatId) {
            const delayMs = REGISTRATION_DELAYS_MS[
              Math.min(registrationAttempt, REGISTRATION_DELAYS_MS.length - 1)
            ]
            await abortableDelay(delayMs, controller.signal)

            try {
              const chats = await fetchChats(currentConversation.agentId, {
                userId: currentConversation.userId,
                channel: currentConversation.channel,
              }, controller.signal)
              const registeredChat = matchRegisteredChat(
                chats,
                currentConversation,
              )
              if (registeredChat) {
                const persisted = createPersistedConversation(
                  currentConversation.agentId,
                  registeredChat,
                  currentConversation.projectId,
                )
                currentConversation = persisted
                activeConversationRef.current = persisted
                adoptChat(registeredChat)
                dispatch({ type: 'registered', conversation: persisted })
              } else {
                registrationAttempt += 1
                if (registrationAttempt >= REGISTRATION_DELAYS_MS.length) {
                  dispatch({ type: 'registration_pending' })
                }
                continue
              }
            } catch {
              if (controller.signal.aborted) {
                return
              }
              registrationAttempt += 1
              continue
            }
          } else {
            await abortableDelay(
              HISTORY_RECONCILE_INTERVAL_MS,
              controller.signal,
            )
          }

          if (!currentConversation.chatId || controller.signal.aborted) {
            continue
          }

          try {
            const snapshot = await reconcileHistory(
              currentConversation.agentId,
              currentConversation.chatId,
              controller.signal,
              terminalStatus === 'completed',
            )
            if (snapshot.history.status === 'running') {
              observedRunning = true
              continue
            }
            if (!shouldReconcileConversationHistory({
              historyStatus: snapshot.history.status,
              historyMessageCount: snapshot.messages.length,
              baselineHistoryCount,
              observedRunning,
              terminalStatus,
            })) {
              continue
            }

            markFinalizing()
            reconciliationDone = true
            dispatch({
              type: 'history_reconciled',
              messages: snapshot.messages,
            })
            reloadSessions()
            controller.abort(new DOMException(
              'QwenPaw history reconciled',
              RECONCILED_ABORT_NAME,
            ))
            return
          } catch {
            if (controller.signal.aborted) {
              return
            }
            // A transient detail failure must not turn a healthy SSE into a
            // failed send. The next polling interval retries reconciliation.
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          throw error
        }
      }
    }
    const reconciliationPromise = reconcileConversation()

    try {
      for await (const event of streamChat({
        agentId: conversation.agentId,
        input: [{ role: 'user', content: toRequestContents(contents) }],
        stream: true,
        session_id: conversation.sessionId,
        user_id: conversation.userId,
        channel: conversation.channel,
      }, controller.signal, resetIdleTimeout)) {
        if (
          controller.signal.aborted
          || streamRequestIdRef.current !== requestId
        ) {
          return
        }

        if (
          event.object === 'message'
          && typeof event.id === 'string'
          && (event.type === 'message' || event.type === 'reasoning')
        ) {
          streamPartTypes.set(
            event.id,
            event.type === 'reasoning' ? 'reasoning' : 'text',
          )
        } else if (
          event.object === 'content'
          && event.type === 'text'
          && typeof event.text === 'string'
        ) {
          const partType =
            typeof event.msg_id === 'string'
              ? streamPartTypes.get(event.msg_id) ?? 'text'
              : 'text'
          queueStreamText(
            assistantMessageId,
            partType,
            `${event.msg_id ?? 'unknown'}:${event.index ?? 0}`,
            event.text,
            event.status === 'completed' || event.delta !== true
              ? 'replace'
              : 'append',
          )
        } else if (
          event.object === 'message'
          && (
            event.type === 'plugin_call'
            || event.type === 'plugin_call_output'
          )
        ) {
          const part = normalizeStreamingToolPart(event)
          if (part) {
            flushStreamText()
            dispatch({
              type: 'stream_tool',
              assistantMessageId,
              part,
            })
          }
        } else if (
          event.object === 'response'
          && (event.status === 'completed' || event.status === 'failed')
        ) {
          terminalStatus = event.status
          if (terminalStatus === 'completed') {
            flushStreamText()
            markFinalizing()
          }
        }
      }

      if (
        controller.signal.aborted
        || streamRequestIdRef.current !== requestId
      ) {
        return
      }

      clearIdleTimeout()
      flushStreamText()
      markFinalizing()
      await reconciliationPromise
    } catch (error) {
      if (streamRequestIdRef.current !== requestId) {
        return
      }

      const internallyReconciled =
        reconciliationDone
        && controller.signal.reason instanceof DOMException
        && controller.signal.reason.name === RECONCILED_ABORT_NAME
      if (internallyReconciled) {
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
      if (!controller.signal.aborted) {
        controller.abort(sendError)
      }
      throw sendError
    } finally {
      clearIdleTimeout()
      if (streamRequestIdRef.current === requestId) {
        streamControllerRef.current = null
      }
    }
  }, [
    adoptChat,
    flushStreamText,
    queueStreamText,
    reconcileHistory,
    reloadSessions,
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
      baselineHistoryCount: historyMessages.length,
    }
    dispatch({ type: 'send_started', userMessage, assistantMessage })
    await executeSend(
      conversation,
      contents,
      userMessageId,
      assistantMessageId,
      historyMessages.length,
    )
  }, [executeSend, historyMessages.length])

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
      lastSend.baselineHistoryCount,
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
      && state.status !== 'generating'
      && state.status !== 'finalizing',
    startDraft,
    openPersisted,
    send,
    retry,
    stop,
    clear,
  }
}
