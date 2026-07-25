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
  RobotOutlined,
} from '@ant-design/icons'
import { Popover, Spin } from 'antd'
import { AGENTS } from '../agentWorkspaceData'
import './AgentSidebar.css'

export interface AgentProject {
  id: string
  key?: string | null
  name?: string | null
  description?: string | null
}

interface AgentSidebarProps {
  open: boolean
  activeAgentId: string
  projects: AgentProject[]
  selectedProject: AgentProject | null
  projectsLoading: boolean
  projectsError: string | null
  deletingProjectId: string | null
  onClose: () => void
  onAgentChange: (agentId: string) => void
  onProjectSelect: (project: AgentProject) => void
  onProjectCreate: () => void
  onProjectDelete: (project: AgentProject) => void
  onProjectsRetry: () => void
}

function getProjectDisplayName(project: AgentProject): string {
  return project.name?.trim() || project.key?.trim() || '未命名项目'
}

function AgentSidebar({
  open,
  activeAgentId,
  projects,
  selectedProject,
  projectsLoading,
  projectsError,
  deletingProjectId,
  onClose,
  onAgentChange,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
  onProjectsRetry,
}: AgentSidebarProps) {
  const [projectPickerOpen, setProjectPickerOpen] = useState(false)

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
            {AGENTS.map((agent) => {
              const active = agent.id === activeAgentId

              return (
                <button
                  key={agent.id}
                  type="button"
                  className={`agent-list__item agent-list__item--${agent.accent}${
                    active ? ' agent-list__item--active' : ''
                  }`}
                  aria-pressed={active}
                  onClick={() => onAgentChange(agent.id)}
                >
                  <span className="agent-list__icon" aria-hidden="true">
                    <RobotOutlined />
                  </span>
                  <span className="agent-list__copy">
                    <strong>{agent.name}</strong>
                    <small>{agent.description}</small>
                  </span>
                  {active ? <span className="agent-list__current">当前</span> : null}
                </button>
              )
            })}
          </div>
        </section>

        <button
          type="button"
          className="agent-sidebar__new-chat"
          disabled
          title="Agent 服务接入后可用"
        >
          <PlusOutlined />
          <span>新建对话</span>
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
            <span className="agent-sidebar__history-count">1</span>
          </div>
          <article className="agent-sidebar__history-card">
            <strong>智能驾驶需求模型构建</strong>
            <time dateTime="2026-07-23T20:57:00+08:00">07/23 20:57</time>
          </article>
        </section>
      </div>

      <section className="agent-engine" aria-labelledby="agent-engine-title">
        <h2 id="agent-engine-title">
          <ApiOutlined />
          <span>AI 引擎</span>
        </h2>
        <div className="agent-engine__status">
          <div className="agent-engine__status-title">
            <span className="agent-engine__status-dot" aria-hidden="true" />
            <strong>Agent 服务待接入</strong>
          </div>
          <p>尚未接到后端 Agent 服务</p>
        </div>
      </section>
    </aside>
  )
}

export default AgentSidebar
