import { useEffect, useState } from 'react'
import {
  AGENTS,
  DEFAULT_AGENT_ID,
} from '../components/AgentWorkspace/agentWorkspaceData'
import './AgentStore.css'
import AgentSidebar from '../components/AgentWorkspace/AgentSidebar'

function AgentStore() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState(DEFAULT_AGENT_ID)
  const activeAgent = AGENTS.find((agent) => agent.id === activeAgentId) ?? AGENTS[0]

  useEffect(() => {
    if (!sidebarOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  const handleAgentChange = (agentId: string) => {
    setActiveAgentId(agentId)
    setSidebarOpen(false)
  }

  return (
    <div className="agent-store-page">
      <AgentSidebar
        open={sidebarOpen}
        activeAgentId={activeAgentId}
        onClose={() => setSidebarOpen(false)}
        onAgentChange={handleAgentChange}
      />
      {sidebarOpen ? (
        <button
          type="button"
          className="agent-store-page__overlay"
          aria-label="关闭工作区导航"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <ConversationWorkspace
        activeAgent={activeAgent}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </div>
  )
}

export default AgentStore
