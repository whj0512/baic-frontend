import {
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
  const { clearSelection } = sessionsState
  const {
    clear: clearConversation,
    startDraft,
  } = conversationState

  useEffect(() => {
    setActiveAgentId((currentAgentId) =>
      selectActiveAgentId(agentState.agents, currentAgentId))
  }, [agentState.agents])

  useEffect(() => {
    clearSelection()

    if (activeAgent?.enabled && projectId) {
      startDraft(activeAgent.id, projectId)
    } else {
      clearConversation()
    }
  }, [
    activeAgent?.enabled,
    activeAgent?.id,
    projectId,
    clearSelection,
    startDraft,
    clearConversation,
  ])

  const selectAgent = (agentId: string) => {
    const agent = agentState.agents.find(
      (candidate) => candidate.id === agentId,
    )
    if (!agent?.enabled || agent.id === activeAgentId) {
      return
    }

    conversationState.stop()
    setActiveAgentId(agent.id)
  }

  const selectChat = (chatId: string) => {
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
  }

  const startNewConversation = () => {
    if (!activeAgent?.enabled || !projectId) {
      return
    }

    conversationState.stop()
    sessionsState.clearSelection()
    conversationState.startDraft(activeAgent.id, projectId)
  }

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
