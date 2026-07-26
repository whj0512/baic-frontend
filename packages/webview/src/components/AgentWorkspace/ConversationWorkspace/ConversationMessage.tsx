import {
  CodeOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { ConversationMessageView } from '../qwenPaw/types'
import { formatMessageTime } from './conversationUtils'
import MessagePartView from './MessagePartView'

interface ConversationMessageProps {
  message: ConversationMessageView
  assistantName: string
}

function getRoleLabel(role: ConversationMessageView['role']): string {
  switch (role) {
    case 'user':
      return '我'
    case 'assistant':
      return '智能体'
    case 'system':
      return '系统'
    case 'tool':
      return '工具'
    default:
      return '消息'
  }
}

function getStatusLabel(status?: string): string | null {
  switch (status) {
    case 'generating':
      return '正在生成'
    case 'failed':
      return '生成失败'
    case 'stopped':
      return '已停止'
    case 'sending':
      return '发送中'
    case 'sent':
      return '已发送'
    default:
      return null
  }
}

function ConversationMessage({
  message,
  assistantName,
}: ConversationMessageProps) {
  const time = formatMessageTime(message.createdAt)
  const statusLabel = getStatusLabel(message.status)
  const sender =
    message.role === 'assistant' ? assistantName : getRoleLabel(message.role)
  const neutral = message.role !== 'assistant' && message.role !== 'user'

  return (
    <article
      className={`conversation-message conversation-message--${message.role}${
        neutral ? ' conversation-message--neutral' : ''
      }`}
    >
      <div className="conversation-message__row">
        {message.role !== 'user' ? (
          <span className="conversation-message__avatar" aria-hidden="true">
            {message.role === 'assistant' ? <RobotOutlined /> : <CodeOutlined />}
          </span>
        ) : null}

        <div className="conversation-message__content">
          <div className="conversation-message__bubble">
            {message.parts.map((part, index) => (
              <MessagePartView
                key={`${message.id}:${part.type}:${index}`}
                part={part}
                renderMarkdown={message.role !== 'user'}
              />
            ))}
            {message.status === 'generating' ? (
              <span className="conversation-message__generating">
                <i />
                <i />
                <i />
                <span className="conversation-sr-only">正在生成回复</span>
              </span>
            ) : null}
          </div>
          <div className="conversation-message__meta">
            {time ? <time dateTime={message.createdAt}>{time}</time> : null}
            <span>{sender}</span>
            {statusLabel ? (
              <span className={`conversation-message__status conversation-message__status--${message.status}`}>
                {statusLabel}
              </span>
            ) : null}
          </div>
        </div>

        {message.role === 'user' ? (
          <span
            className="conversation-message__avatar conversation-message__avatar--user"
            aria-hidden="true"
          >
            <UserOutlined />
          </span>
        ) : null}
      </div>
    </article>
  )
}

export default ConversationMessage
