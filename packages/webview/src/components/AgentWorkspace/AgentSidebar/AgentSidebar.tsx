import { useEffect, useState } from 'react'
import {
  ApiOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  FolderOutlined,
  PlusOutlined,
  PushpinFilled,
  RobotOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { Popover, Select, Spin } from 'antd'
import type {
  QwenPawAgent,
  QwenPawChatSpec,
  QwenPawConnectionState,
} from '../qwenPaw/types'
import './AgentSidebar.css'

export interface AgentProject {
  id: string
  key?: string | null
  name?: string | null
  description?: string | null
}

interface AgentSidebarProps {
  open: boolean
  agents: QwenPawAgent[]
  agentsLoading: boolean
  agentsError: string | null
  expectedAgentId?: string
  activeAgentId: string | null
  sessions: QwenPawChatSpec[]
  sessionsLoading: boolean
  sessionsError: string | null
  activeChatId: string | null
  creatingDraft: boolean
  connectionState: QwenPawConnectionState
  projects: AgentProject[]
  selectedProject: AgentProject | null
  projectsLoading: boolean
  projectsError: string | null
  deletingProjectId: string | null
  onClose: () => void
  onAgentChange: (agentId: string) => void
  onSessionChange: (chatId: string) => void
  onNewChat: () => void
  onAgentsRetry: () => void
  onSessionsRetry: () => void
  onProjectSelect: (project: AgentProject) => void
  onProjectCreate: () => void
  onProjectDelete: (project: AgentProject) => void
  onProjectsRetry: () => void
}

function getProjectDisplayName(project: AgentProject): string {
  return project.name?.trim() || project.key?.trim() || '未命名项目'
}

function getProjectConversationUserId(project: AgentProject): string {
  return `baic-project:${project.id}`
}

function formatSessionTime(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    return '时间未知'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function AgentSidebar({
  open,
  agents,
  agentsLoading,
  agentsError,
  expectedAgentId,
  activeAgentId,
  sessions,
  sessionsLoading,
  sessionsError,
  activeChatId,
  creatingDraft,
  connectionState,
  projects,
  selectedProject,
  projectsLoading,
  projectsError,
  deletingProjectId,
  onClose,
  onAgentChange,
  onSessionChange,
  onNewChat,
  onAgentsRetry,
  onSessionsRetry,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
  onProjectsRetry,
}: AgentSidebarProps) {
  const [projectPickerOpen, setProjectPickerOpen] = useState(false)
  const activeAgent =
    agents.find((agent) => agent.id === activeAgentId) ?? null
  const displayedAgent = activeAgent ?? (agents.length === 1 ? agents[0] : null)
  const currentModel = displayedAgent?.active_model?.model?.trim()
  const canStartChat =
    Boolean(selectedProject)
    && Boolean(activeAgent?.enabled)
    && connectionState === 'online'
  const projectSessions = selectedProject
    ? sessions.filter((session) => (
        session.user_id === getProjectConversationUserId(selectedProject)
      ))
    : []

  useEffect(() => {
    if (!open) {
      setProjectPickerOpen(false)
    }
  }, [open])

  const handleProjectSelect = (project: AgentProject) => {
    setProjectPickerOpen(false)
    onProjectSelect(project)
  }

  const handleProjectCreate = () => {
    setProjectPickerOpen(false)
    onProjectCreate()
  }

  const handleProjectDelete = (project: AgentProject) => {
    setProjectPickerOpen(false)
    onProjectDelete(project)
  }

  const projectPickerContent = (
    <div className="agent-project-picker" aria-label="选择项目工作区">
      <div className="agent-project-picker__header">
        <div>
          <strong>项目工作区</strong>
          <span>选择要进入的项目</span>
        </div>
        <button
          type="button"
          className="agent-project-picker__create"
          onClick={handleProjectCreate}
        >
          <PlusOutlined />
          <span>新建</span>
        </button>
      </div>

      <div className="agent-project-picker__body">
        {projectsLoading ? (
          <div className="agent-project-picker__state">
            <Spin size="small" />
            <span>正在加载项目...</span>
          </div>
        ) : projectsError ? (
          <div className="agent-project-picker__state agent-project-picker__state--error">
            <span>{projectsError}</span>
            <button type="button" onClick={onProjectsRetry}>
              重新加载
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="agent-project-picker__state">
            <span>暂无项目，请先新建项目</span>
          </div>
        ) : (
          <div className="agent-project-picker__list">
            {projects.map((project) => {
              const selected = project.id === selectedProject?.id
              const deleting = deletingProjectId === project.id
              const displayName = getProjectDisplayName(project)

              return (
                <div
                  key={project.id}
                  className={`agent-project-picker__item${
                    selected ? ' agent-project-picker__item--selected' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="agent-project-picker__option"
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => handleProjectSelect(project)}
                  >
                    <span className="agent-project-picker__dot" aria-hidden="true" />
                    <span className="agent-project-picker__copy">
                      <strong title={displayName}>{displayName}</strong>
                      {project.description ? (
                        <small title={project.description}>{project.description}</small>
                      ) : null}
                    </span>
                    {selected ? <CheckOutlined className="agent-project-picker__check" /> : null}
                  </button>
                  <button
                    type="button"
                    className="agent-project-picker__delete"
                    aria-label={`删除项目 ${displayName}`}
                    title="删除项目"
                    disabled={deleting}
                    onClick={() => handleProjectDelete(project)}
                  >
                    {deleting ? <Spin size="small" /> : <DeleteOutlined />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <aside
      id="agent-workspace-sidebar"
      className={`agent-sidebar${open ? ' agent-sidebar--open' : ''}`}
      aria-label="智能体工作区导航"
    >
      <div className="agent-sidebar__heading">
        <h1>需求智能体平台</h1>
        <button
          type="button"
          className="agent-sidebar__close"
          aria-label="关闭工作区导航"
          onClick={onClose}
        >
          <CloseOutlined />
        </button>
      </div>

      <div className="agent-sidebar__scroll">
        <section className="agent-sidebar__section" aria-labelledby="agent-list-title">
          <h2 id="agent-list-title" className="agent-sidebar__section-title">
            智能体
          </h2>
          <div className="agent-list">
            {agentsLoading ? (
              <div className="agent-sidebar__list-state">
                <Spin size="small" />
                <span>正在加载智能体...</span>
              </div>
            ) : agentsError ? (
              <div className="agent-sidebar__list-state agent-sidebar__list-state--error">
                <span>{agentsError}</span>
                <button type="button" onClick={onAgentsRetry}>重试</button>
              </div>
            ) : agents.length === 0 ? (
              <div className="agent-sidebar__list-state">
                <span>
                  {expectedAgentId
                    ? `未找到本体建模智能体 ${expectedAgentId}`
                    : 'QwenPaw 暂无已配置智能体'}
                </span>
                {expectedAgentId ? (
                  <button type="button" onClick={onAgentsRetry}>刷新智能体</button>
                ) : null}
              </div>
            ) : agents.length === 1 ? (
              <div
                className={`agent-list__identity${
                  displayedAgent?.enabled ? '' : ' agent-list__identity--disabled'
                }`}
              >
                <span className="agent-list__icon" aria-hidden="true">
                  <RobotOutlined />
                </span>
                <span className="agent-list__copy">
                  <strong>{displayedAgent?.name || displayedAgent?.id}</strong>
                  <small>
                    {displayedAgent?.description || currentModel || '暂无描述'}
                  </small>
                  {displayedAgent?.description && currentModel ? (
                    <small>{currentModel}</small>
                  ) : null}
                </span>
                {!displayedAgent?.enabled ? (
                  <span className="agent-list__disabled-label">已禁用</span>
                ) : null}
              </div>
            ) : (
              <Select
                className="agent-list__select"
                classNames={{ popup: { root: 'agent-list__dropdown' } }}
                value={activeAgentId ?? undefined}
                placeholder="请选择智能体"
                aria-label="选择智能体"
                options={agents.map((agent) => ({
                  value: agent.id,
                  label: agent.name || agent.id,
                  disabled: !agent.enabled,
                }))}
                optionRender={(option) => {
                  const agent = agents.find((item) => item.id === option.value)
                  if (!agent) {
                    return option.label
                  }

                  const modelName = agent.active_model?.model?.trim()
                  return (
                    <div className="agent-list__option">
                      <span className="agent-list__icon" aria-hidden="true">
                        <RobotOutlined />
                      </span>
                      <span className="agent-list__copy">
                        <strong>{agent.name || agent.id}</strong>
                        <small>{agent.description || modelName || '暂无描述'}</small>
                      </span>
                      {!agent.enabled ? (
                        <span className="agent-list__disabled-label">已禁用</span>
                      ) : null}
                    </div>
                  )
                }}
                onChange={onAgentChange}
              />
            )}
          </div>
        </section>

        <button
          type="button"
          className="agent-sidebar__new-chat"
          disabled={!canStartChat}
          aria-current={creatingDraft ? 'page' : undefined}
          title={
            canStartChat
              ? '创建新的 QwenPaw 对话'
              : '请选择项目和可用智能体，并确认 QwenPaw 已连接'
          }
          onClick={onNewChat}
        >
          <PlusOutlined />
          <span>{creatingDraft ? '当前为新对话' : '新建对话'}</span>
        </button>

        <section className="agent-sidebar__section agent-sidebar__section--navigation">
          <div className="agent-sidebar__section-heading">
            <h2 className="agent-sidebar__section-title">
              <FolderOutlined />
              <span>当前项目</span>
            </h2>
            <button
              type="button"
              className="agent-sidebar__section-action"
              aria-label="新建项目"
              title="新建项目"
              onClick={handleProjectCreate}
            >
              <PlusOutlined />
            </button>
          </div>
          <Popover
            content={projectPickerContent}
            open={projectPickerOpen}
            onOpenChange={setProjectPickerOpen}
            placement="bottomLeft"
            trigger="click"
            arrow={false}
            rootClassName="agent-project-popover"
          >
            <button
              type="button"
              className={`agent-sidebar__project${
                selectedProject ? '' : ' agent-sidebar__project--empty'
              }`}
              aria-current={selectedProject ? 'page' : undefined}
              aria-expanded={projectPickerOpen}
              aria-haspopup="dialog"
            >
              <span className="agent-sidebar__project-dot" aria-hidden="true" />
              <span>
                {selectedProject
                  ? getProjectDisplayName(selectedProject)
                  : '请选择项目工作区'}
              </span>
              <DownOutlined className="agent-sidebar__project-chevron" />
            </button>
          </Popover>
        </section>

        <section className="agent-sidebar__section agent-sidebar__section--history">
          <div className="agent-sidebar__section-heading">
            <h2 className="agent-sidebar__section-title">
              <ClockCircleOutlined />
              <span>历史对话</span>
            </h2>
            <span className="agent-sidebar__history-count">{projectSessions.length}</span>
          </div>
          <div className="agent-sidebar__history-list">
            {sessionsLoading ? (
              <div className="agent-sidebar__list-state">
                <Spin size="small" />
                <span>正在加载会话...</span>
              </div>
            ) : sessionsError ? (
              <div className="agent-sidebar__list-state agent-sidebar__list-state--error">
                <span>{sessionsError}</span>
                <button type="button" onClick={onSessionsRetry}>重试</button>
              </div>
            ) : !activeAgentId ? (
              <div className="agent-sidebar__list-state">请先选择可用智能体</div>
            ) : !selectedProject ? (
              <div className="agent-sidebar__list-state">请先选择项目工作区</div>
            ) : projectSessions.length === 0 ? (
              <div className="agent-sidebar__list-state">当前项目暂无历史对话</div>
            ) : (
              projectSessions.map((session) => {
                const active = session.id === activeChatId
                return (
                  <button
                    key={session.id}
                    type="button"
                    className={`agent-sidebar__history-card${
                      active ? ' agent-sidebar__history-card--active' : ''
                    }`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onSessionChange(session.id)}
                  >
                    <span className="agent-sidebar__history-title">
                      <strong>{session.name.trim() || '未命名对话'}</strong>
                      <span className="agent-sidebar__history-badges">
                        {session.pinned ? (
                          <span title="已置顶"><PushpinFilled /></span>
                        ) : null}
                        {session.status === 'running' ? (
                          <span title="运行中"><SyncOutlined spin /></span>
                        ) : null}
                        {session.source === 'cron' ? <span>定时</span> : null}
                      </span>
                    </span>
                    <time dateTime={session.updated_at || undefined}>
                      {formatSessionTime(session.updated_at)}
                    </time>
                  </button>
                )
              })
            )}
          </div>
        </section>
      </div>

      <section className="agent-engine" aria-labelledby="agent-engine-title">
        <h2 id="agent-engine-title">
          <ApiOutlined />
          <span>AI 引擎</span>
        </h2>
        <div className={`agent-engine__status agent-engine__status--${connectionState}`}>
          <div className="agent-engine__status-title">
            <span className="agent-engine__status-dot" aria-hidden="true" />
            <strong>
              {connectionState === 'online'
                ? 'QwenPaw 已连接'
                : connectionState === 'offline'
                  ? 'QwenPaw 连接失败'
                  : '正在连接 QwenPaw'}
            </strong>
          </div>
          <p>
            {connectionState === 'online'
              ? currentModel || '当前智能体未报告模型'
              : connectionState === 'offline'
                ? '请检查服务地址或运行状态'
                : '正在读取智能体配置'}
          </p>
          {connectionState === 'offline' ? (
            <button type="button" onClick={onAgentsRetry}>重新连接</button>
          ) : null}
        </div>
      </section>
    </aside>
  )
}

export default AgentSidebar
