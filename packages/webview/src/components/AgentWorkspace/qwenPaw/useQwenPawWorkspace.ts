import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  selectActiveAgentId,
  useQwenPawAgents,
} from './useQwenPawAgents'
import { useQwenPawConversation } from './useQwenPawConversation'
import { useQwenPawSessions } from './useQwenPawSessions'

export interface QwenPawWorkspaceOptions {
  allowedAgentIds?: readonly string[]
}

export function useQwenPawWorkspace(
  projectId: string | null,
  options?: QwenPawWorkspaceOptions,
) {
  const agentState = useQwenPawAgents()
  const allowedAgentIds = options?.allowedAgentIds
  const eligibleAgents = useMemo(() => {
    if (!allowedAgentIds) {
      return agentState.agents
    }

    const allowedAgentIdSet = new Set(allowedAgentIds)
    return agentState.agents.filter((agent) => allowedAgentIdSet.has(agent.id))
  }, [agentState.agents, allowedAgentIds])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const selectedAgent = eligibleAgents.find(
    (agent) => agent.id === activeAgentId,
  ) ?? null
  const activeAgent = selectedAgent?.enabled ? selectedAgent : null
  const sessionsState = useQwenPawSessions(
    activeAgent?.enabled ? activeAgent.id : null,
  )
  const conversationState = useQwenPawConversation({
    sessions: sessionsState.sessions,
    selectedChat: sessionsState.selectedChat,
    historyChatId: sessionsState.historyChatId,
    historyMessages: sessionsState.messages,
    historyStatus: sessionsState.historyStatus,
    historyError: sessionsState.historyError,
    adoptChat: sessionsState.adoptChat,
    reconcileHistory: sessionsState.reconcileHistory,
    reloadSessions: sessionsState.reloadSessions,
  })
  const { clearSelection } = sessionsState
  const {
    clear: clearConversation,
    startDraft,
  } = conversationState

  useEffect(() => {
    setActiveAgentId((currentAgentId) =>
      selectActiveAgentId(eligibleAgents, currentAgentId))
  }, [eligibleAgents])

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
    const agent = eligibleAgents.find(
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
    if (
      sessionsState.selectedChat?.id === chat.id
      && conversationState.activeConversation?.kind === 'persisted'
    ) {
      return
    }

    conversationState.stop()
    sessionsState.selectChat(chat.id)
    conversationState.openPersisted(activeAgent.id, chat, projectId ?? undefined)
  }

  const startNewConversation = () => {
    if (!activeAgent?.enabled || !projectId) {
      return
    }

    conversationState.stop()
    sessionsState.clearSelection()
    conversationState.startDraft(activeAgent.id, projectId)
  }

  const conversationMatchesContext =
    conversationState.activeConversation?.projectId === projectId
    && conversationState.activeConversation?.agentId === activeAgent?.id
  const visibleConversation = conversationMatchesContext
    ? conversationState.activeConversation
    : null

  return {
    agents: eligibleAgents,
    agentsLoading: agentState.loading,
    agentsError: agentState.error,
    connectionState: agentState.connectionState,
    reloadAgents: agentState.reload,
    activeAgentId: activeAgent?.id ?? null,
    activeAgent,
    selectAgent,
    ...sessionsState,
    ...conversationState,
    activeConversation: visibleConversation,
    messages: conversationMatchesContext ? conversationState.messages : [],
    status:
      conversationMatchesContext
        ? conversationState.status
        : projectId && activeAgent
          ? 'loading'
          : 'idle',
    registrationState:
      conversationMatchesContext
        ? conversationState.registrationState
        : 'idle',
    error: conversationMatchesContext ? conversationState.error : null,
    streaming:
      conversationMatchesContext && conversationState.streaming,
    canSend:
      conversationMatchesContext && conversationState.canSend,
    selectChat,
    startNewConversation,
  }
}
