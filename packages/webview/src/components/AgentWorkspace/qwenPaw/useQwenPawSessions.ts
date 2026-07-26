import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchChatHistory,
  fetchChats,
} from './qwenPawClient'
import { normalizeMessages } from './normalizeMessages'
import {
  QwenPawError,
  type ConversationMessageView,
  type QwenPawChatHistory,
  type QwenPawChatSpec,
  type QwenPawHistoryStatus,
} from './types'

const HISTORY_CACHE_LIMIT = 10

function getUpdatedAtValue(value: string): number {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

export function sortQwenPawChats(
  chats: QwenPawChatSpec[],
): QwenPawChatSpec[] {
  return chats
    .map((chat, index) => ({ chat, index }))
    .sort((left, right) => {
      if (left.chat.pinned !== right.chat.pinned) {
        return left.chat.pinned ? -1 : 1
      }

      const updatedAtDifference =
        getUpdatedAtValue(right.chat.updated_at)
        - getUpdatedAtValue(left.chat.updated_at)

      return updatedAtDifference || left.index - right.index
    })
    .map(({ chat }) => chat)
}

export function useQwenPawSessions(activeAgentId: string | null) {
  const [sessionsState, setSessionsState] = useState<{
    agentId: string | null
    items: QwenPawChatSpec[]
  }>({
    agentId: null,
    items: [],
  })
  const [selection, setSelection] = useState<{
    agentId: string
    chat: QwenPawChatSpec
  } | null>(null)
  const [history, setHistory] = useState<QwenPawChatHistory | null>(null)
  const [historyChatId, setHistoryChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessageView[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<QwenPawError | null>(null)
  const [historyStatus, setHistoryStatus] =
    useState<QwenPawHistoryStatus>('idle')
  const [historyError, setHistoryError] = useState<QwenPawError | null>(null)
  const [sessionsReloadVersion, setSessionsReloadVersion] = useState(0)
  const [historyReloadVersion, setHistoryReloadVersion] = useState(0)
  const sessionsRequestIdRef = useRef(0)
  const historyRequestIdRef = useRef(0)
  const historyIdentityRef = useRef<{
    agentId: string
    chatId: string
  } | null>(null)
  const historyCacheRef = useRef(new Map<string, {
    history: QwenPawChatHistory
    messages: ConversationMessageView[]
  }>())
  const forceHistoryRefreshRef = useRef(false)
  const previousAgentIdRef = useRef<string | null>(null)
  const sessions =
    sessionsState.agentId === activeAgentId ? sessionsState.items : []
  const selectedChat =
    selection?.agentId === activeAgentId ? selection.chat : null
  const selectedChatId = selectedChat?.id ?? null

  const reloadSessions = useCallback(() => {
    setSessionsReloadVersion((version) => version + 1)
  }, [])

  const retryHistory = useCallback(() => {
    forceHistoryRefreshRef.current = true
    setHistoryReloadVersion((version) => version + 1)
  }, [])

  const clearSelection = useCallback(() => {
    setSelection(null)
  }, [])

  const adoptChat = useCallback(
    (chat: QwenPawChatSpec) => {
      if (!activeAgentId) {
        return
      }

      setSessionsState((currentState) => {
        const currentSessions =
          currentState.agentId === activeAgentId ? currentState.items : []
        return {
          agentId: activeAgentId,
          items: sortQwenPawChats([
            chat,
            ...currentSessions.filter((session) => session.id !== chat.id),
          ]),
        }
      })
      setSelection({ agentId: activeAgentId, chat })
    },
    [activeAgentId],
  )

  const selectChat = useCallback(
    (chatId: string | null) => {
      if (!chatId || !activeAgentId) {
        setSelection(null)
        return
      }

      const chat = sessions.find((session) => session.id === chatId)
      setSelection(chat ? { agentId: activeAgentId, chat } : null)
    },
    [activeAgentId, sessions],
  )

  useEffect(() => {
    const sessionsController = new AbortController()
    const requestId = sessionsRequestIdRef.current + 1
    sessionsRequestIdRef.current = requestId
    const agentChanged = previousAgentIdRef.current !== activeAgentId
    previousAgentIdRef.current = activeAgentId

    if (agentChanged) {
      historyRequestIdRef.current += 1
      setSessionsState({ agentId: activeAgentId, items: [] })
      setSelection(null)
      setHistory(null)
      setHistoryChatId(null)
      setMessages([])
      setHistoryError(null)
      setHistoryStatus('idle')
      historyIdentityRef.current = null
    }
    setSessionsError(null)

    if (!activeAgentId) {
      setSessionsLoading(false)
      return () => sessionsController.abort()
    }

    setSessionsLoading(true)
    void fetchChats(activeAgentId, undefined, sessionsController.signal)
      .then((nextSessions) => {
        if (
          sessionsController.signal.aborted
          || sessionsRequestIdRef.current !== requestId
        ) {
          return
        }

        const sortedSessions = sortQwenPawChats(nextSessions)
        setSessionsState({
          agentId: activeAgentId,
          items: sortedSessions,
        })
        setSelection((currentSelection) => {
          if (
            !currentSelection
            || currentSelection.agentId !== activeAgentId
          ) {
            return currentSelection
          }

          const refreshedChat = sortedSessions.find(
            (session) => session.id === currentSelection.chat.id,
          )
          return refreshedChat
            ? { agentId: activeAgentId, chat: refreshedChat }
            : null
        })
      })
      .catch((requestError: unknown) => {
        if (
          sessionsController.signal.aborted
          || sessionsRequestIdRef.current !== requestId
        ) {
          return
        }

        setSessionsError(
          requestError instanceof QwenPawError
            ? requestError
            : new QwenPawError('network', '无法加载 QwenPaw 会话', {
                cause: requestError,
              }),
        )
      })
      .finally(() => {
        if (
          !sessionsController.signal.aborted
          && sessionsRequestIdRef.current === requestId
        ) {
          setSessionsLoading(false)
        }
      })

    return () => sessionsController.abort()
  }, [activeAgentId, sessionsReloadVersion])

  useEffect(() => {
    const historyController = new AbortController()
    const requestId = historyRequestIdRef.current + 1
    historyRequestIdRef.current = requestId
    setHistoryError(null)

    if (!activeAgentId || !selectedChatId) {
      historyIdentityRef.current = null
      setHistory(null)
      setHistoryChatId(null)
      setMessages([])
      setHistoryStatus('idle')
      return () => historyController.abort()
    }

    const chatId = selectedChatId
    const cacheKey = `${activeAgentId}:${chatId}`
    const forceRefresh = forceHistoryRefreshRef.current
    forceHistoryRefreshRef.current = false
    const hasCurrentSnapshot =
      historyIdentityRef.current?.agentId === activeAgentId
      && historyIdentityRef.current.chatId === chatId
    const cachedSnapshot = historyCacheRef.current.get(cacheKey)

    if (!hasCurrentSnapshot && cachedSnapshot && !forceRefresh) {
      historyCacheRef.current.delete(cacheKey)
      historyCacheRef.current.set(cacheKey, cachedSnapshot)
      setHistory(cachedSnapshot.history)
      setHistoryChatId(chatId)
      setMessages(cachedSnapshot.messages)
      historyIdentityRef.current = { agentId: activeAgentId, chatId }
      setHistoryStatus('ready')
      return () => historyController.abort()
    }

    if (!hasCurrentSnapshot) {
      historyIdentityRef.current = null
      setHistory(null)
      setHistoryChatId(null)
      setMessages([])
    }
    setHistoryStatus(hasCurrentSnapshot ? 'refreshing' : 'loading')

    void fetchChatHistory(activeAgentId, chatId, historyController.signal)
      .then((nextHistory) => {
        if (
          historyController.signal.aborted
          || historyRequestIdRef.current !== requestId
        ) {
          return
        }

        const nextMessages = normalizeMessages(nextHistory.messages, chatId)
        setHistory(nextHistory)
        setHistoryChatId(chatId)
        setMessages(nextMessages)
        historyIdentityRef.current = { agentId: activeAgentId, chatId }
        historyCacheRef.current.delete(cacheKey)
        historyCacheRef.current.set(cacheKey, {
          history: nextHistory,
          messages: nextMessages,
        })
        while (historyCacheRef.current.size > HISTORY_CACHE_LIMIT) {
          const oldestKey = historyCacheRef.current.keys().next().value
          if (typeof oldestKey !== 'string') {
            break
          }
          historyCacheRef.current.delete(oldestKey)
        }
        setHistoryStatus('ready')
      })
      .catch((requestError: unknown) => {
        if (
          historyController.signal.aborted
          || historyRequestIdRef.current !== requestId
        ) {
          return
        }

        setHistoryError(
          requestError instanceof QwenPawError
            ? requestError
            : new QwenPawError('network', '无法加载 QwenPaw 会话详情', {
                cause: requestError,
              }),
        )
        setHistoryStatus('error')
      })

    return () => historyController.abort()
  }, [activeAgentId, selectedChatId, historyReloadVersion])

  return {
    sessions,
    selectedChat,
    history,
    historyChatId,
    messages,
    sessionsLoading:
      sessionsState.agentId === activeAgentId
        ? sessionsLoading
        : activeAgentId !== null,
    sessionsError:
      sessionsState.agentId === activeAgentId ? sessionsError : null,
    historyStatus,
    historyError,
    selectChat,
    clearSelection,
    adoptChat,
    reloadSessions,
    retryHistory,
  }
}
