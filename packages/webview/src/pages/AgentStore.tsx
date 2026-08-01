import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MenuOutlined } from '@ant-design/icons'
import { Input, Modal, message } from 'antd'
import AgentSidebar from '../components/AgentWorkspace/AgentSidebar'
import type { AgentProject } from '../components/AgentWorkspace/AgentSidebar'
import ConversationWorkspace from '../components/AgentWorkspace/ConversationWorkspace'
import type {
  ConversationDraft,
  WorkspaceNavigationTarget,
} from '../components/AgentWorkspace/ConversationWorkspace'
import { useQwenPawWorkspace } from '../components/AgentWorkspace/qwenPaw/useQwenPawWorkspace'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './AgentStore.css'

interface NewProjectForm {
  name: string
  description: string
}

const EMPTY_PROJECT_FORM: NewProjectForm = {
  name: '',
  description: '',
}

const EXPOSED_AGENT_IDS = ['tqqRiu'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeProject(value: unknown): AgentProject | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) {
    return null
  }

  return {
    id: value.id,
    key: typeof value.key === 'string' ? value.key : null,
    name: typeof value.name === 'string' ? value.name : null,
    description: typeof value.description === 'string' ? value.description : null,
  }
}

function parseProjects(value: unknown): AgentProject[] {
  const projectValues = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.projects)
      ? value.projects
      : []
  const projects: AgentProject[] = []

  projectValues.forEach((projectValue) => {
    const project = normalizeProject(projectValue)
    if (project) {
      projects.push(project)
    }
  })

  return projects
}

function getProjectDisplayName(project: AgentProject): string {
  return project.name?.trim() || project.key?.trim() || '未命名项目'
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

interface AgentWelcomeProps {
  onOpenSidebar: () => void
  onCreateProject: () => void
}

function AgentWelcome({
  onOpenSidebar,
  onCreateProject,
}: AgentWelcomeProps) {
  return (
    <main className="agent-welcome">
      <button
        type="button"
        className="agent-welcome__menu"
        aria-label="打开工作区导航"
        aria-controls="agent-workspace-sidebar"
        onClick={onOpenSidebar}
      >
        <MenuOutlined />
      </button>
      <div className="agent-welcome__content">
        <h2>欢迎使用需求智能体平台</h2>
        <p>
          请选择项目工作区或
          <button type="button" onClick={onCreateProject}>
            新建项目
          </button>
        </p>
      </div>
    </main>
  )
}

function AgentStore() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [projects, setProjects] = useState<AgentProject[]>([])
  const [selectedProject, setSelectedProject] = useState<AgentProject | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [newProjectForm, setNewProjectForm] = useState<NewProjectForm>(EMPTY_PROJECT_FORM)
  const qwenPawWorkspace = useQwenPawWorkspace(
    selectedProject?.id ?? null,
    { allowedAgentIds: EXPOSED_AGENT_IDS },
  )

  const fetchProjects = useCallback(async (signal?: AbortSignal) => {
    setProjectsLoading(true)
    setProjectsError(null)

    try {
      const response = await authFetch(API_ENDPOINTS.projects, { signal })
      if (!response.ok) {
        throw new Error('获取项目列表失败')
      }

      const payload: unknown = await response.json()
      setProjects(parseProjects(payload))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      console.error('Fetch agent projects error:', error)
      const errorMessage = getErrorMessage(error, '获取项目列表失败')
      setProjectsError(errorMessage)
      message.error(errorMessage)
    } finally {
      if (!signal?.aborted) {
        setProjectsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchProjects(controller.signal)
    return () => controller.abort()
  }, [fetchProjects])

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

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    console.debug('[QwenPaw workspace state]', {
      projectId: selectedProject?.id ?? null,
      agentId: qwenPawWorkspace.activeAgentId,
      conversation: qwenPawWorkspace.activeConversation,
      status: qwenPawWorkspace.status,
      registrationState: qwenPawWorkspace.registrationState,
    })
  }, [
    qwenPawWorkspace.activeAgentId,
    qwenPawWorkspace.activeConversation,
    qwenPawWorkspace.registrationState,
    qwenPawWorkspace.status,
    selectedProject?.id,
  ])

  const handleAgentChange = (agentId: string) => {
    qwenPawWorkspace.selectAgent(agentId)
    setSidebarOpen(false)
  }

  const handleSessionChange = (chatId: string) => {
    qwenPawWorkspace.selectChat(chatId)
    setSidebarOpen(false)
  }

  const handleNewChat = () => {
    qwenPawWorkspace.startNewConversation()
    setSidebarOpen(false)
  }

  const handleConversationSend = async ({
    text,
    files,
  }: ConversationDraft) => {
    await qwenPawWorkspace.send([
      { type: 'text', text },
      ...files.map((file) => ({
        type: 'file' as const,
        filename: file.file_name,
        file_url: file.url,
        size: file.size,
      })),
    ])
  }

  const handleWorkspaceNavigate = (target: WorkspaceNavigationTarget) => {
    if (!selectedProject) {
      return
    }

    navigate(
      `/workspace/${encodeURIComponent(selectedProject.id)}?view=${target}`,
    )
  }

  const handleProjectSelect = (project: AgentProject) => {
    if (project.id !== selectedProject?.id) {
      qwenPawWorkspace.stop()
    }
    setSelectedProject(project)
    setSidebarOpen(false)
  }

  const handleOpenCreateProject = () => {
    setNewProjectForm(EMPTY_PROJECT_FORM)
    setCreateProjectOpen(true)
  }

  const handleCloseCreateProject = () => {
    if (creatingProject) {
      return
    }

    setCreateProjectOpen(false)
    setNewProjectForm(EMPTY_PROJECT_FORM)
  }

  const handleCreateProject = async () => {
    if (creatingProject) {
      return
    }

    const name = newProjectForm.name.trim()
    const description = newProjectForm.description.trim()

    if (!name) {
      message.warning('请输入项目名称')
      return
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    const baseKey = cleanName || 'proj'
    const randomSuffix = Math.random().toString(36).substring(2, 8)

    setCreatingProject(true)
    try {
      const response = await authFetch(API_ENDPOINTS.projects, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: `${baseKey}-${randomSuffix}`,
          name,
          description: description || null,
        }),
      })

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => null)
        const detail = isRecord(errorData) && typeof errorData.detail === 'string'
          ? errorData.detail
          : '创建失败'
        throw new Error(detail)
      }

      const createdProject = normalizeProject(await response.json())
      if (!createdProject) {
        throw new Error('创建项目成功，但返回的数据无效')
      }

      setProjects((currentProjects) => {
        const existingProjectIndex = currentProjects.findIndex(
          (project) => project.id === createdProject.id,
        )

        if (existingProjectIndex < 0) {
          return [createdProject, ...currentProjects]
        }

        return currentProjects.map((project) =>
          project.id === createdProject.id ? createdProject : project,
        )
      })
      qwenPawWorkspace.stop()
      setSelectedProject(createdProject)
      setCreateProjectOpen(false)
      setNewProjectForm(EMPTY_PROJECT_FORM)
      setSidebarOpen(false)
      message.success('项目创建成功')
    } catch (error) {
      console.error('Create agent project error:', error)
      message.error(getErrorMessage(error, '创建项目失败，请稍后重试'))
    } finally {
      setCreatingProject(false)
    }
  }

  const handleProjectDelete = (project: AgentProject) => {
    const displayName = getProjectDisplayName(project)

    Modal.confirm({
      title: '确认删除项目',
      content: `您确定要删除项目“${displayName}”吗？此操作会将项目移至回收站。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        setDeletingProjectId(project.id)
        try {
          const response = await authFetch(API_ENDPOINTS.projectById(project.id), {
            method: 'DELETE',
          })

          if (!response.ok) {
            const errorData: unknown = await response.json().catch(() => null)
            const detail = isRecord(errorData) && typeof errorData.detail === 'string'
              ? errorData.detail
              : '删除失败'
            throw new Error(detail)
          }

          setProjects((currentProjects) =>
            currentProjects.filter((currentProject) => currentProject.id !== project.id),
          )
          if (selectedProject?.id === project.id) {
            qwenPawWorkspace.stop()
          }
          setSelectedProject((currentProject) =>
            currentProject?.id === project.id ? null : currentProject,
          )
          message.success(`项目“${displayName}”已删除`)
        } catch (error) {
          console.error('Delete agent project error:', error)
          message.error(getErrorMessage(error, '删除项目失败，请稍后重试'))
          void fetchProjects()
          throw error
        } finally {
          setDeletingProjectId(null)
        }
      },
    })
  }

  return (
    <div
      className="agent-store-page"
      data-qwenpaw-connection={qwenPawWorkspace.connectionState}
      data-qwenpaw-agent-id={qwenPawWorkspace.activeAgentId ?? undefined}
      data-qwenpaw-conversation-kind={
        qwenPawWorkspace.activeConversation?.kind ?? undefined
      }
      data-qwenpaw-status={qwenPawWorkspace.status}
      data-qwenpaw-registration={qwenPawWorkspace.registrationState}
    >
      <AgentSidebar
        open={sidebarOpen}
        agents={qwenPawWorkspace.agents}
        agentsLoading={qwenPawWorkspace.agentsLoading}
        agentsError={qwenPawWorkspace.agentsError?.message ?? null}
        expectedAgentId={EXPOSED_AGENT_IDS[0]}
        activeAgentId={qwenPawWorkspace.activeAgentId}
        sessions={qwenPawWorkspace.sessions}
        sessionsLoading={qwenPawWorkspace.sessionsLoading}
        sessionsError={qwenPawWorkspace.sessionsError?.message ?? null}
        activeChatId={qwenPawWorkspace.selectedChat?.id ?? null}
        creatingDraft={qwenPawWorkspace.activeConversation?.kind === 'draft'}
        connectionState={qwenPawWorkspace.connectionState}
        projects={projects}
        selectedProject={selectedProject}
        projectsLoading={projectsLoading}
        projectsError={projectsError}
        deletingProjectId={deletingProjectId}
        onClose={() => setSidebarOpen(false)}
        onAgentChange={handleAgentChange}
        onSessionChange={handleSessionChange}
        onNewChat={handleNewChat}
        onAgentsRetry={qwenPawWorkspace.reloadAgents}
        onSessionsRetry={qwenPawWorkspace.reloadSessions}
        onProjectSelect={handleProjectSelect}
        onProjectCreate={handleOpenCreateProject}
        onProjectDelete={handleProjectDelete}
        onProjectsRetry={() => void fetchProjects()}
      />
      {sidebarOpen ? (
        <button
          type="button"
          className="agent-store-page__overlay"
          aria-label="关闭工作区导航"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      {selectedProject ? (
        <ConversationWorkspace
          key={`${selectedProject.id}:${
            qwenPawWorkspace.activeConversation?.sessionId ?? 'loading'
          }`}
          activeAgent={qwenPawWorkspace.activeAgent}
          activeConversation={qwenPawWorkspace.activeConversation}
          activeChat={qwenPawWorkspace.selectedChat}
          connectionState={qwenPawWorkspace.connectionState}
          messages={qwenPawWorkspace.messages}
          historyStatus={qwenPawWorkspace.historyStatus}
          historyError={qwenPawWorkspace.historyError?.message ?? null}
          streaming={qwenPawWorkspace.streaming}
          streamError={qwenPawWorkspace.error?.message ?? null}
          conversationStatus={qwenPawWorkspace.status}
          registrationState={qwenPawWorkspace.registrationState}
          workflowMode={
            qwenPawWorkspace.activeAgentId === EXPOSED_AGENT_IDS[0]
              ? 'ontology-ingestion'
              : undefined
          }
          onSend={handleConversationSend}
          onRetry={qwenPawWorkspace.retry}
          onStop={qwenPawWorkspace.stop}
          onHistoryRetry={qwenPawWorkspace.retryHistory}
          onOpenSidebar={() => setSidebarOpen(true)}
          onWorkspaceNavigate={handleWorkspaceNavigate}
        />
      ) : (
        <AgentWelcome
          onOpenSidebar={() => setSidebarOpen(true)}
          onCreateProject={handleOpenCreateProject}
        />
      )}

      <Modal
        className="agent-create-project-modal"
        open={createProjectOpen}
        title="新建项目"
        okText="创建"
        cancelText="取消"
        confirmLoading={creatingProject}
        closable={!creatingProject}
        mask={{ closable: !creatingProject }}
        cancelButtonProps={{ disabled: creatingProject }}
        onCancel={handleCloseCreateProject}
        onOk={() => void handleCreateProject()}
      >
        <p className="agent-create-project-modal__intro">
          为项目设置名称和简要说明，创建后将直接进入项目工作区。
        </p>
        <div className="agent-create-project-modal__field">
          <label htmlFor="agent-project-name">
            项目名称
            <span aria-hidden="true">*</span>
          </label>
          <Input
            id="agent-project-name"
            value={newProjectForm.name}
            placeholder="请输入项目名称"
            maxLength={100}
            autoFocus
            onChange={(event) =>
              setNewProjectForm((currentForm) => ({
                ...currentForm,
                name: event.target.value,
              }))
            }
            onPressEnter={() => void handleCreateProject()}
          />
        </div>
        <div className="agent-create-project-modal__field">
          <label htmlFor="agent-project-description">项目描述</label>
          <Input.TextArea
            id="agent-project-description"
            value={newProjectForm.description}
            placeholder="请输入项目描述（选填）"
            rows={4}
            maxLength={500}
            showCount
            onChange={(event) =>
              setNewProjectForm((currentForm) => ({
                ...currentForm,
                description: event.target.value,
              }))
            }
          />
        </div>
      </Modal>
    </div>
  )
}

export default AgentStore
