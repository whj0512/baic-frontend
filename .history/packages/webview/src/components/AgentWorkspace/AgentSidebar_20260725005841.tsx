import {
  ApiOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  FolderOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { AGENTS } from './agentWorkspaceData'

interface AgentSidebarProps {
  open: boolean
  onClose: () => void
}

function AgentSidebar({ open, onClose }: AgentSidebarProps) {
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
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className={`agent-list__item agent-list__item--${agent.accent}${
                  agent.active ? ' agent-list__item--active' : ''
                }`}
                aria-current={agent.active ? 'true' : undefined}
              >
                <span className="agent-list__icon" aria-hidden="true">
                  <RobotOutlined />
                </span>
                <span className="agent-list__copy">
                  <strong>{agent.name}</strong>
                  <small>{agent.description}</small>
                </span>
                {agent.active ? <span className="agent-list__current">当前</span> : null}
              </div>
            ))}
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
            <span className="agent-sidebar__section-action" aria-hidden="true">
              <PlusOutlined />
            </span>
          </div>
          <div className="agent-sidebar__project" aria-current="page">
            <span className="agent-sidebar__project-dot" aria-hidden="true" />
            <span>智能驾驶需求建模项目</span>
          </div>
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

