import {
  useEffect,
  useRef,
  useState,
} from 'react'
import ConversationComposer from './ConversationComposer'
import ConversationHeader from './ConversationHeader'
import ConversationTimeline from './ConversationTimeline'
import { QwenPawError } from '../qwenPaw/types'
import { useQwenPawAttachments } from '../qwenPaw/useQwenPawAttachments'
import type { ConversationWorkspaceProps } from './types'
import './ConversationWorkspace.css'

function ConversationWorkspace({
  activeAgent,
  activeConversation,
  activeChat,
  connectionState,
  messages,
  historyStatus,
  historyError,
  streaming,
  streamError,
  conversationStatus,
  registrationState,
  onSend,
  onRetry,
  onStop,
  onHistoryRetry,
  onOpenSidebar,
}: ConversationWorkspaceProps) {
  const [draftText, setDraftText] = useState('')
  const [followingOutput, setFollowingOutput] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLElement | null>(null)
  const conversationKind = activeConversation?.kind
  const conversationKey = activeConversation
    ? `${activeConversation.agentId}:${activeConversation.sessionId}`
    : null
  const attachmentState = useQwenPawAttachments(
    activeAgent?.id ?? null,
    conversationKey,
  )
  const attachmentsUploading = attachmentState.attachments.some(
    (attachment) => attachment.state === 'uploading',
  )
  const assistantName = activeAgent?.name || '智能体'
  const emptyStateName = activeAgent?.name || 'QwenPaw 智能体'
  const canCompose =
    connectionState === 'online'
    && Boolean(activeAgent?.enabled)
    && Boolean(activeConversation)
    && activeConversation?.channel === 'console'
    && registrationState !== 'syncing'
  const hasDraftContent =
    draftText.trim().length > 0 || attachmentState.attachments.length > 0
  const canSubmit =
    canCompose && !streaming && !attachmentsUploading && hasDraftContent
  const hasRetryableAssistant = messages.some(
    (message) =>
      message.role === 'assistant'
      && (message.status === 'failed' || message.status === 'stopped'),
  )
  const canRetry =
    !streaming
    && hasRetryableAssistant
    && (conversationStatus === 'failed' || conversationStatus === 'stopped')
  const displayedError = localError || streamError

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.scrollTop = canvas.scrollHeight
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [conversationKind])

  useEffect(() => {
    if (!followingOutput) {
      return
    }

    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.scrollTop = canvas.scrollHeight
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [followingOutput, messages, streaming])

  const handleCanvasScroll = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const distanceToBottom =
      canvas.scrollHeight - canvas.scrollTop - canvas.clientHeight
    setFollowingOutput(distanceToBottom <= 96)
  }

  const scrollToBottom = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    setFollowingOutput(true)
    canvas.scrollTo({ top: canvas.scrollHeight, behavior: 'smooth' })
  }

  const submitDraft = async () => {
    const trimmedText = draftText.trim()
    if (!hasDraftContent || !canCompose || streaming || attachmentsUploading) {
      return
    }

    setLocalError(null)
    setFollowingOutput(true)
    try {
      const files = await attachmentState.uploadPending()
      await onSend({
        text: trimmedText || '请读取并处理所附文件。',
        files,
      })
      attachmentState.markSent()
      attachmentState.clear()
      setDraftText('')
    } catch (error) {
      if (error instanceof QwenPawError && error.kind === 'abort') {
        return
      }
      setLocalError(
        error instanceof Error && error.message
          ? error.message
          : '消息发送失败',
      )
    }
  }

  const retryLastSend = async () => {
    setLocalError(null)
    setFollowingOutput(true)
    try {
      await onRetry()
      attachmentState.markSent()
      attachmentState.clear()
      setDraftText('')
    } catch (error) {
      if (error instanceof QwenPawError && error.kind === 'abort') {
        return
      }
      setLocalError(
        error instanceof Error && error.message
          ? error.message
          : '消息重新发送失败',
      )
    }
  }

  return (
    <main className="conversation-workspace">
      <ConversationHeader
        activeAgent={activeAgent}
        activeConversation={activeConversation}
        activeChat={activeChat}
        conversationStatus={conversationStatus}
        historyStatus={historyStatus}
        registrationState={registrationState}
        onOpenSidebar={onOpenSidebar}
      />

      <ConversationTimeline
        canvasRef={canvasRef}
        activeConversation={activeConversation}
        assistantName={assistantName}
        emptyStateName={emptyStateName}
        messages={messages}
        historyStatus={historyStatus}
        historyError={historyError}
        displayedError={displayedError}
        conversationStatus={conversationStatus}
        canRetry={canRetry}
        followingOutput={followingOutput}
        onCanvasScroll={handleCanvasScroll}
        onScrollToBottom={scrollToBottom}
        onRetry={retryLastSend}
        onHistoryRetry={onHistoryRetry}
      />

      <ConversationComposer
        conversationKind={conversationKind}
        draftText={draftText}
        canCompose={canCompose}
        canSubmit={canSubmit}
        streaming={streaming}
        attachments={attachmentState.attachments}
        attachmentError={attachmentState.validationError}
        onDraftChange={setDraftText}
        onFilesSelected={attachmentState.addFiles}
        onAttachmentRemove={attachmentState.removeAttachment}
        onAttachmentRetry={(attachmentId) => {
          void attachmentState.retryAttachment(attachmentId).catch(() => {
            // The attachment row renders the classified upload error.
          })
        }}
        onSubmit={() => void submitDraft()}
        onStop={onStop}
      />
    </main>
  )
}

export default ConversationWorkspace
