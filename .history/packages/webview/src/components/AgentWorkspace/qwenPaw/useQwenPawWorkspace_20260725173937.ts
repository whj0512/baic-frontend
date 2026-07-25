import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  selectActiveAgentId,
  useQwenPawAgents,
} from './useQwenPawAgents'
import { useQwenPawConversation } from './useQwenPawConversation'
import { useQwenPawSessions } from './useQwenPawSessions'

export function useQwenPawWorkspace(projectId: string | null) {
  const agentState = useQwenPawAgents()
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const activeAgent = agentState.agents.find(
    (agent) => agent.id === activeAgentId,
  ) ?? null
  const sessionsState = useQwenPawSessions(
    activeAgent?.enabled ? activeAgent.id : null,
  )
  const conversationState = useQwenPawConversation({
    sessions: sessionsState.sessions,
    selectedChat: sessionsState.selectedChat,
    historyChatId: sessionsState.historyChatId,
    historyMessages: sessionsState.messages,
    historyLoading: sessionsState.historyLoading,
    historyError: sessionsState.historyError,
    adoptChat: sessionsState.adoptChat,
    reloadSessions: sessionsState.reloadSessions,
    retryHistory: sessionsState.retryHistory,
  })

  useEffect(() => {
    setActiveAgentId((currentAgentId) =>
      selectActiveAgentId(agentState.agents, currentAgentId))
  }, [agentState.agents])

  useEffect(() => {
    sessionsState.clearSelection()

    if (activeAgent?.enabled && projectId) {
      conversationState.startDraft(activeAgent.id, projectId)
    } else {
      conversationState.clear()
    }
  }, [
    activeAgent?.enabled,
    activeAgent?.id,
    projectId,
    sessionsState.clearSelection,
    conversationState.startDraft,
    conversationState.clear,
  ])

  const selectAgent = useCallback((agentId: string) => {
    const agent = agentState.agents.find(
      (candidate) => candidate.id === agentId,
    )
    if (!agent?.enabled || agent.id === activeAgentId) {
      return
    }

    conversationState.stop()
    setActiveAgentId(agent.id)
  }, [
    activeAgentId,
    agentState.agents,
    conversationState.stop,
  ])

  const selectChat = useCallback((chatId: string) => {
    if (!activeAgent) {
      return
    }

    const chat = sessionsState.sessions.find(
      (session) => session.id === chatId,
    )
    if (!chat) {
      return
    }

    conversationState.stop()
    sessionsState.selectChat(chat.id)
    conversationState.openPersisted(activeAgent.id, chat)
    sessionsState.retryHistory()
  }, [
    activeAgent,
    conversationState.openPersisted,
    conversationState.stop,
    sessionsState.selectChat,
    sessionsState.retryHistory,
    sessionsState.sessions,
  ])

  const startNewConversation = useCallback(() => {
    if (!activeAgent?.enabled || !projectId) {
      return
    }

    conversationState.stop()
    sessionsState.clearSelection()
    conversationState.startDraft(activeAgent.id, projectId)
  }, [
    activeAgent,
    conversationState.startDraft,
    conversationState.stop,
    projectId,
    sessionsState.clearSelection,
  ])

  return {
    agents: agentState.agents,
    agentsLoading: agentState.loading,
    agentsError: agentState.error,
    connectionState: agentState.connectionState,
    reloadAgents: agentState.reload,
    activeAgentId,
    activeAgent,
    selectAgent,
    ...sessionsState,
    ...conversationState,
    selectChat,
    startNewConversation,
  }
}
