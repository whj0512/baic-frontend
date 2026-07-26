import {
  CheckCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  LoadingOutlined,
  MenuOutlined,
  MessageOutlined,
  ShareAltOutlined,
  StopOutlined,
} from '@ant-design/icons'
import type {
  ActiveConversationRef,
  QwenPawAgent,
  QwenPawChatSpec,
  QwenPawConversationStatus,
  QwenPawHistoryStatus,
  QwenPawRegistrationState,
} from '../qwenPaw/types'

interface ConversationHeaderProps {
  activeAgent: QwenPawAgent | null
  activeConversation: ActiveConversationRef | null
  activeChat: QwenPawChatSpec | null
  conversationStatus: QwenPawConversationStatus
  historyStatus: QwenPawHistoryStatus
  registrationState: QwenPawRegistrationState
  onOpenSidebar: () => void
}

const WORKSPACE_TABS = [
  { id: 'conversation', label: '对话', icon: MessageOutlined, active: true },
  { id: 'model-editor', label: '模型编辑', icon: EditOutlined },
  { id: 'testcase-overview', label: '测试用例', icon: FileDoneOutlined },
  { id: 'knowledge-graph', label: '知识图谱', icon: ShareAltOutlined },
]

function getHeaderStatus(
  status: QwenPawConversationStatus,
  historyStatus: QwenPawHistoryStatus,
  registrationState: QwenPawRegistrationState,
  activeConversation: ActiveConversationRef | null,
): {
  label: string
  tone: 'success' | 'pending' | 'error'
  icon: typeof CheckCircleOutlined
} {
  if (status === 'loading') {
    return { label: '正在加载会话', tone: 'pending', icon: LoadingOutlined }
  }
  if (status === 'generating') {
    return { label: '智能体处理中', tone: 'pending', icon: LoadingOutlined }
  }
  if (status === 'failed') {
    return { label: '同步未完成', tone: 'error', icon: ExclamationCircleOutlined }
  }
  if (status === 'stopped') {
    return { label: '生成已停止', tone: 'error', icon: StopOutlined }
  }
  if (historyStatus === 'refreshing') {
    return {
      label: '正在同步会话记录',
      tone: 'pending',
      icon: LoadingOutlined,
    }
  }
  if (historyStatus === 'error') {
    return {
      label: '会话记录同步未完成',
      tone: 'error',
      icon: ExclamationCircleOutlined,
    }
  }
  if (registrationState === 'syncing') {
    return { label: '正在同步至 QwenPaw', tone: 'pending', icon: LoadingOutlined }
  }
  if (registrationState === 'pending') {
    return {
      label: '回复已完成，等待会话同步',
      tone: 'pending',
      icon: LoadingOutlined,
    }
  }
  if (activeConversation?.kind === 'draft') {
    return { label: '新对话尚未发送', tone: 'pending', icon: MessageOutlined }
  }
  return {
    label: '已同步至 QwenPaw',
    tone: 'success',
    icon: CheckCircleOutlined,
  }
}

function ConversationHeader({
  activeAgent,
  activeConversation,
  activeChat,
  conversationStatus,
  historyStatus,
  registrationState,
  onOpenSidebar,
}: ConversationHeaderProps) {
  const headerStatus = getHeaderStatus(
    conversationStatus,
    historyStatus,
    registrationState,
    activeConversation,
  )
  const HeaderStatusIcon = headerStatus.icon

  return (
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
            <strong>{activeAgent?.name || 'QwenPaw 智能体'}</strong>
            <span aria-hidden="true">/</span>
            <span>{activeChat?.name.trim() || '新对话'}</span>
          </div>
          <div
            className={`conversation-header__save-status conversation-header__save-status--${headerStatus.tone}`}
          >
            <HeaderStatusIcon spin={HeaderStatusIcon === LoadingOutlined} />
            <span>{headerStatus.label}</span>
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
  )
}

export default ConversationHeader
