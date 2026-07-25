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
} from './types'

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
  const [sessions, setSessions] = useState<QwenPawChatSpec[]>([])
  const [selection, setSelection] = useState<{
    agentId: string
    chat: QwenPawChatSpec
  } | null>(null)
  const [history, setHistory] = useState<QwenPawChatHistory | null>(null)
  const [historyChatId, setHistoryChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessageView[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<QwenPawError | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<QwenPawError | null>(null)
  const [sessionsReloadVersion, setSessionsReloadVersion] = useState(0)
  const [historyReloadVersion, setHistoryReloadVersion] = useState(0)
  const sessionsRequestIdRef = useRef(0)
  const historyRequestIdRef = useRef(0)
  const previousAgentIdRef = useRef<string | null>(null)
  const selectedChat =
    selection?.agentId === activeAgentId ? selection.chat : null
  const selectedChatId = selectedChat?.id ?? null

  const reloadSessions = useCallback(() => {
    setSessionsReloadVersion((version) => version + 1)
  }, [])

  const retryHistory = useCallback(() => {
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

      setSessions((currentSessions) => sortQwenPawChats([
        chat,
        ...currentSessions.filter((session) => session.id !== chat.id),
      ]))
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
      setSessions([])
      setSelection(null)
      setHistory(null)
      setHistoryChatId(null)
      setMessages([])
      setHistoryError(null)
      setHistoryLoading(false)
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
        setSessions(sortedSessions)
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
    setHistory(null)
    setHistoryChatId(null)
    setMessages([])
    setHistoryError(null)

    if (!activeAgentId || !selectedChatId) {
      setHistoryLoading(false)
      return () => historyController.abort()
    }

    const chatId = selectedChatId
    setHistoryLoading(true)
    void fetchChatHistory(activeAgentId, chatId, historyController.signal)
      .then((nextHistory) => {
        if (
          historyController.signal.aborted
          || historyRequestIdRef.current !== requestId
        ) {
          return
        }

        setHistory(nextHistory)
        setHistoryChatId(chatId)
        setMessages(normalizeMessages(nextHistory.messages, chatId))
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
      })
      .finally(() => {
        if (
          !historyController.signal.aborted
          && historyRequestIdRef.current === requestId
        ) {
          setHistoryLoading(false)
        }
      })

    return () => historyController.abort()
  }, [activeAgentId, selectedChatId, historyReloadVersion])

  return {
    sessions,
    selectedChat,
    history,
    historyChatId,
    messages,
    sessionsLoading,
    sessionsError,
    historyLoading,
    historyError,
    selectChat,
    clearSelection,
    adoptChat,
    reloadSessions,
    retryHistory,
  }
}
