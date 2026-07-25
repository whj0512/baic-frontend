import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  EditOutlined,
  FileWordOutlined,
  MenuOutlined,
  MessageOutlined,
  PaperClipOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { CONVERSATION_MESSAGES } from './agentWorkspaceData'
import type { AgentDefinition, ConversationMessage } from './agentWorkspaceData'

interface ConversationWorkspaceProps {
  activeAgent: AgentDefinition
  onOpenSidebar: () => void
}

const WORKSPACE_TABS = [
  { id: 'conversation', label: '对话', icon: MessageOutlined, active: true },
  { id: 'model-editor', label: '模型编辑', icon: EditOutlined },
  { id: 'instance-extraction', label: '实例抽取', icon: DatabaseOutlined },
  { id: 'ontology-schema', label: '本体 Schema', icon: ApartmentOutlined },
]

function MessageContent({ message }: { message: ConversationMessage }) {
  return (
    <article className={`conversation-message conversation-message--${message.role}`}>
      <div className="conversation-message__row">
        {message.role === 'assistant' ? (
          <span className="conversation-message__avatar" aria-hidden="true">
            <RobotOutlined />
          </span>
        ) : null}

        <div className="conversation-message__content">
          <div className="conversation-message__bubble">
            {message.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {message.attachment ? (
              <div className="conversation-attachment">
                <FileWordOutlined aria-hidden="true" />
                <span className="conversation-attachment__name">{message.attachment.name}</span>
                <span className="conversation-attachment__size">{message.attachment.size}</span>
              </div>
            ) : null}
          </div>
          <div className="conversation-message__meta">
            <time>{message.time}</time>
            <span>{message.sender}</span>
            <span>发送</span>
          </div>
        </div>

        {message.role === 'user' ? (
          <span className="conversation-message__avatar conversation-message__avatar--user" aria-hidden="true">
            <UserOutlined />
          </span>
        ) : null}
      </div>
    </article>
  )
}

function ConversationWorkspace({
  activeAgent,
  onOpenSidebar,
}: ConversationWorkspaceProps) {
  return (
    <main className="conversation-workspace">
      <header className="conversation-header">
        <div className="conversation-header__context">
          <button
            type="button"
            className="conversation-header__menu"
            aria-label="打开工作区导航"
            aria-controls="agent-workspace-sidebar"
            onClick={onOpenSidebar}
          >
            <MenuOutlined />
          </button>
          <div>
            <div className="conversation-header__title">
              <strong>{activeAgent.name}</strong>
              <span aria-hidden="true">/</span>
              <span>对话</span>
            </div>
            <div className="conversation-header__save-status">
              <CheckCircleOutlined />
              <span>已保存至本地工作区</span>
            </div>
          </div>
        </div>

        <nav className="conversation-tabs" aria-label="智能体工作区功能">
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                className={`conversation-tabs__item${
                  tab.active ? ' conversation-tabs__item--active' : ''
                }`}
                aria-current={tab.active ? 'page' : undefined}
                disabled={!tab.active}
                title={tab.active ? undefined : '该功能将在后续版本开放'}
              >
                <Icon />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </header>

      <section className="conversation-canvas" aria-label="对话记录">
        <div className="conversation-canvas__messages">
          {CONVERSATION_MESSAGES.map((message) => (
            <MessageContent key={message.id} message={message} />
          ))}
        </div>
      </section>

      <section className="conversation-composer" aria-labelledby="conversation-composer-status">
        <div className="conversation-composer__shell">
          <div className="conversation-composer__upload-hint">
            <PaperClipOutlined />
            <span>可拖拽文档至此，或点击上传（支持 .docx / .pdf / .xlsx）</span>
          </div>
          <div className="conversation-composer__input-row">
            <textarea
              aria-label="对话内容"
              aria-describedby="conversation-composer-status"
              placeholder="描述你的需求，或添加需求文档…"
              disabled
            />
            <div className="conversation-composer__actions">
              <button type="button" aria-label="添加附件" disabled title="Agent 服务接入后可用">
                <PaperClipOutlined />
              </button>
              <button
                type="button"
                className="conversation-composer__send"
                aria-label="发送消息"
                disabled
                title="Agent 服务接入后可用"
              >
                <SendOutlined />
              </button>
            </div>
          </div>
        </div>
        <p id="conversation-composer-status">Agent 服务待接入，当前对话区域仅作界面展示</p>
      </section>
    </main>
  )
}

export default ConversationWorkspace
