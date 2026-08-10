import type { RefObject } from 'react'
import {
  DownOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { Spin } from 'antd'
import type {
  ActiveConversationRef,
  ConversationMessageView,
  QwenPawConversationStatus,
  QwenPawHistoryStatus,
} from '../qwenPaw/types'
import ConversationMessageEntry from './ConversationMessageEntry'

interface EmptyStateGuide {
  description: string
  steps: readonly {
    title: string
    detail: string
  }[]
}

const EMPTY_STATE_GUIDES: Readonly<Record<string, EmptyStateGuide>> = {
  tqqRiu: {
    description: '按顺序完成需求文档处理、功能建模与本体入库。',
    steps: [
      {
        title: '文档条目化',
        detail: '上传源需求文档与同版本 MinerU Markdown，解析并确认可建模功能。',
      },
      {
        title: '单功能建模',
        detail: '逐个功能生成上下文、DSL、对齐结果与测试用例。',
      },
      {
        title: '本体关系管理',
        detail: '生成并校验 TTL，在确认授权后写入 GraphDB 并执行推理。',
      },
    ],
  },
  ontology_qa: {
    description: '先选择问答场景，再填写对应参数并查看生成结果。',
    steps: [
      {
        title: '选择问答场景',
        detail: '根据目标选择场景 9 本体关系推理，或场景 10 只读关系查询。',
      },
      {
        title: '场景 9：推理与结果查询',
        detail: '填写 GraphDB 仓库并逐次授权，完成推理后查询已输出的结果。',
      },
      {
        title: '场景 10：关系与结果查询',
        detail: '填写 GraphDB 仓库和功能名执行只读查询，完成后查询功能关系结果。',
      },
    ],
  },
}

interface ConversationTimelineProps {
  canvasRef: RefObject<HTMLElement | null>
  activeConversation: ActiveConversationRef | null
  assistantName: string
  emptyStateName: string
  messages: ConversationMessageView[]
  historyStatus: QwenPawHistoryStatus
  historyError: string | null
  displayedError: string | null
  conversationStatus: QwenPawConversationStatus
  canRetry: boolean
  followingOutput: boolean
  onCanvasScroll: () => void
  onScrollToBottom: () => void
  onRetry: () => Promise<void>
  onHistoryRetry: () => void
}

function ConversationTimeline({
  canvasRef,
  activeConversation,
  assistantName,
  emptyStateName,
  messages,
  historyStatus,
  historyError,
  displayedError,
  conversationStatus,
  canRetry,
  followingOutput,
  onCanvasScroll,
  onScrollToBottom,
  onRetry,
  onHistoryRetry,
}: ConversationTimelineProps) {
  const hasMessages = messages.length > 0
  const showInitialHistoryLoading =
    historyStatus === 'loading'
    && activeConversation?.kind === 'persisted'
    && !hasMessages
  const showBlockingHistoryError = Boolean(historyError) && !hasMessages
  const emptyStateGuide = activeConversation?.channel === 'console'
    ? EMPTY_STATE_GUIDES[activeConversation.agentId]
    : undefined

  return (
    <section
      ref={canvasRef}
      className="conversation-canvas"
      aria-label="对话记录"
      onScroll={onCanvasScroll}
    >
      <div className="conversation-canvas__messages">
        {showInitialHistoryLoading ? (
          <div className="conversation-canvas__state">
            <Spin />
            <strong>正在加载会话记录</strong>
            <span>正在从 QwenPaw 获取消息...</span>
          </div>
        ) : showBlockingHistoryError ? (
          <div className="conversation-canvas__state conversation-canvas__state--error">
            <ExclamationCircleOutlined />
            <strong>会话记录加载失败</strong>
            <span>{historyError}</span>
            <button type="button" onClick={onHistoryRetry}>重新加载</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="conversation-canvas__state conversation-canvas__state--empty">
            <span className="conversation-canvas__state-icon">
              <RobotOutlined />
            </span>
            <strong>{emptyStateName}</strong>
            {emptyStateGuide ? (
              <div
                className="conversation-canvas__empty-guide"
                role="region"
                aria-label={`${emptyStateName}使用流程`}
              >
                <p>{emptyStateGuide.description}</p>
                <ol>
                  {emptyStateGuide.steps.map((step) => (
                    <li key={step.title}>
                      <span className="conversation-canvas__empty-guide-title">
                        {step.title}
                      </span>
                      <span className="conversation-canvas__empty-guide-detail">
                        {step.detail}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <span>
                {activeConversation
                  ? activeConversation.channel === 'console'
                    ? '输入消息，开始新的对话'
                    : `该 ${activeConversation.channel} 渠道会话当前仅支持查看`
                  : '正在准备对话上下文...'}
              </span>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <ConversationMessageEntry
              key={message.id}
              message={message}
              assistantName={assistantName}
              projectId={activeConversation?.projectId}
            />
          ))
        )}

        {historyStatus === 'refreshing' && hasMessages ? (
          <div className="conversation-history-refresh" role="status">
            <LoadingOutlined spin />
            <span>正在同步服务端会话记录...</span>
          </div>
        ) : null}

        {historyError && hasMessages ? (
          <div className="conversation-stream-error" role="alert">
            <ExclamationCircleOutlined />
            <span>{historyError}</span>
            <button type="button" onClick={onHistoryRetry}>
              重新同步
            </button>
          </div>
        ) : null}

        {displayedError ? (
          <div className="conversation-stream-error" role="alert">
            <ExclamationCircleOutlined />
            <span>{displayedError}</span>
            {canRetry ? (
              <button type="button" onClick={() => void onRetry()}>
                重新发送
              </button>
            ) : null}
          </div>
        ) : conversationStatus === 'stopped' && canRetry ? (
          <div className="conversation-stream-error conversation-stream-error--stopped">
            <StopOutlined />
            <span>本次生成已停止</span>
            <button type="button" onClick={() => void onRetry()}>
              重新发送
            </button>
          </div>
        ) : null}
      </div>

      {!followingOutput && messages.length > 0 ? (
        <button
          type="button"
          className="conversation-canvas__to-bottom"
          onClick={onScrollToBottom}
        >
          <DownOutlined />
          <span>回到底部</span>
        </button>
      ) : null}
    </section>
  )
}

export default ConversationTimeline
