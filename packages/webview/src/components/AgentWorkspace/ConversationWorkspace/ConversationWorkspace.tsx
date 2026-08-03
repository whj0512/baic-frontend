import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Modal } from 'antd'
import ConversationComposer from './ConversationComposer'
import ConversationHeader from './ConversationHeader'
import ConversationTimeline from './ConversationTimeline'
import { OntologyQaQuickPrompts } from './ontologyQa'
import OntologyWorkflowPanel, {
  checkpointsEqual,
  clearOntologyWorkflowCheckpoint,
  createOntologyWorkflowCheckpoint,
  deriveOntologyWorkflowEvidence,
  mergeOntologyWorkflowMessages,
  OntologyWorkflowInteractionContext,
  readOntologyWorkflowCheckpoint,
  saveOntologyWorkflowCheckpoint,
} from './ontologyWorkflow'
import type {
  OntologyWorkflowCheckpoint,
  WorkflowFunctionSelection,
} from './ontologyWorkflow'
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
  canSend,
  streamError,
  conversationStatus,
  registrationState,
  workflowMode,
  projectDisplayName,
  onSend,
  onRetry,
  onStop,
  onHistoryRetry,
  onOpenSidebar,
  onWorkspaceNavigate,
}: ConversationWorkspaceProps) {
  const conversationKind = activeConversation?.kind
  const conversationKey = activeConversation
    ? `${activeConversation.agentId}:${activeConversation.sessionId}`
    : null
  const loadedWorkflowCheckpoint = useMemo(
    () => workflowMode === 'ontology-ingestion'
      ? readOntologyWorkflowCheckpoint(conversationKey)
      : null,
    [conversationKey, workflowMode],
  )
  const [workflowRuntime, setWorkflowRuntime] = useState<{
    conversationKey: string | null
    checkpoint: OntologyWorkflowCheckpoint | null
    itemizationConfirmed: boolean
    functionModelingConfirmed: boolean
  }>(() => ({
    conversationKey,
    checkpoint: loadedWorkflowCheckpoint,
    itemizationConfirmed: loadedWorkflowCheckpoint?.itemizationConfirmed ?? false,
    functionModelingConfirmed:
      loadedWorkflowCheckpoint?.functionModelingConfirmed ?? false,
  }))
  const activeWorkflowRuntime = workflowRuntime.conversationKey === conversationKey
    ? workflowRuntime
    : {
        conversationKey,
        checkpoint: loadedWorkflowCheckpoint,
        itemizationConfirmed:
          loadedWorkflowCheckpoint?.itemizationConfirmed ?? false,
        functionModelingConfirmed:
          loadedWorkflowCheckpoint?.functionModelingConfirmed ?? false,
      }
  const [draftText, setDraftText] = useState('')
  const [followingOutput, setFollowingOutput] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const [workflowSelection, setWorkflowSelection] =
    useState<WorkflowFunctionSelection | null>(null)
  const canvasRef = useRef<HTMLElement | null>(null)
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
    && canSend
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
  const workflowMessages = useMemo(
    () => mergeOntologyWorkflowMessages(
      activeWorkflowRuntime.checkpoint,
      messages,
    ),
    [activeWorkflowRuntime.checkpoint, messages],
  )
  const workflowEvidence = useMemo(
    () => deriveOntologyWorkflowEvidence(workflowMessages),
    [workflowMessages],
  )
  const workflowRestoredFromCheckpoint = Boolean(
    activeWorkflowRuntime.checkpoint
    && workflowEvidence.chunksMessageId
    && !messages.some((message) => message.id === workflowEvidence.chunksMessageId),
  )
  const effectiveItemizationConfirmed =
    activeWorkflowRuntime.itemizationConfirmed
    || workflowEvidence.latestModelingMessageIndex !== null
    || workflowEvidence.dslQueryIndex !== null
  const workflowInteraction = useMemo(() => ({
    enabled:
      workflowMode === 'ontology-ingestion'
      && effectiveItemizationConfirmed,
    activeChunksMessageId: workflowEvidence.chunksMessageId,
    selectedChunkId: workflowSelection?.chunkId ?? null,
    modeledChunkIds: workflowEvidence.modeledChunkIds,
    onSelectFunction: setWorkflowSelection,
  }), [
    effectiveItemizationConfirmed,
    workflowEvidence.chunksMessageId,
    workflowEvidence.modeledChunkIds,
    workflowMode,
    workflowSelection?.chunkId,
  ])

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
    setWorkflowRuntime({
      conversationKey,
      checkpoint: loadedWorkflowCheckpoint,
      itemizationConfirmed:
        loadedWorkflowCheckpoint?.itemizationConfirmed ?? false,
      functionModelingConfirmed:
        loadedWorkflowCheckpoint?.functionModelingConfirmed ?? false,
    })
    setWorkflowSelection(null)
  }, [conversationKey, loadedWorkflowCheckpoint])

  useEffect(() => {
    if (
      workflowEvidence.chunksEvidenceKey
      === activeWorkflowRuntime.checkpoint?.chunksEvidenceKey
    ) {
      return
    }
    setWorkflowRuntime((current) => current.conversationKey === conversationKey
      && (current.itemizationConfirmed || current.functionModelingConfirmed)
      ? {
          ...current,
          itemizationConfirmed: false,
          functionModelingConfirmed: false,
        }
      : current)
    setWorkflowSelection(null)
  }, [
    activeWorkflowRuntime.checkpoint?.chunksEvidenceKey,
    conversationKey,
    workflowEvidence.chunksEvidenceKey,
  ])

  useEffect(() => {
    const checkpoint = activeWorkflowRuntime.checkpoint
    const modelingEvidenceUnchanged =
      workflowEvidence.latestModelingEvidenceKey
        === checkpoint?.latestModelingEvidenceKey
    const dslEvidenceUnchanged =
      workflowEvidence.dslEvidenceKey === checkpoint?.dslEvidenceKey
      || Boolean(
        checkpoint?.dslEvidenceKey
        && !checkpoint.dslEvidenceKey.startsWith('dsl:v2:')
        && workflowEvidence.dslEvidenceKey?.startsWith('dsl:v2:'),
      )
    const confirmedDslWasCompacted = Boolean(
      checkpoint?.functionModelingConfirmed
      && modelingEvidenceUnchanged
      && workflowEvidence.dslEvidenceKey === null,
    )
    if (
      modelingEvidenceUnchanged
      && (dslEvidenceUnchanged || confirmedDslWasCompacted)
    ) {
      return
    }
    setWorkflowRuntime((current) => current.conversationKey === conversationKey
      && current.functionModelingConfirmed
      ? { ...current, functionModelingConfirmed: false }
      : current)
  }, [
    activeWorkflowRuntime.checkpoint?.dslEvidenceKey,
    activeWorkflowRuntime.checkpoint?.latestModelingEvidenceKey,
    conversationKey,
    workflowEvidence.dslEvidenceKey,
    workflowEvidence.latestModelingEvidenceKey,
  ])

  useEffect(() => {
    if (workflowMode !== 'ontology-ingestion' || !conversationKey) {
      return
    }
    const nextCheckpoint = createOntologyWorkflowCheckpoint(
      conversationKey,
      workflowMessages,
      workflowEvidence,
      {
        itemizationConfirmed: effectiveItemizationConfirmed,
        functionModelingConfirmed:
          activeWorkflowRuntime.functionModelingConfirmed,
      },
    )
    if (!nextCheckpoint) {
      if (
        activeWorkflowRuntime.checkpoint
        && (
          workflowEvidence.chunksQueryIndex !== null
          || workflowEvidence.sceneOne !== null
        )
      ) {
        clearOntologyWorkflowCheckpoint(conversationKey)
        setWorkflowRuntime((current) => current.conversationKey === conversationKey
          && current.checkpoint
          ? { ...current, checkpoint: null }
          : current)
      }
      return
    }
    if (checkpointsEqual(activeWorkflowRuntime.checkpoint, nextCheckpoint)) {
      return
    }
    saveOntologyWorkflowCheckpoint(nextCheckpoint)
    setWorkflowRuntime((current) => current.conversationKey === conversationKey
      && !checkpointsEqual(current.checkpoint, nextCheckpoint)
      ? { ...current, checkpoint: nextCheckpoint }
      : current)
  }, [
    activeWorkflowRuntime.checkpoint,
    activeWorkflowRuntime.functionModelingConfirmed,
    conversationKey,
    effectiveItemizationConfirmed,
    workflowEvidence,
    workflowMessages,
    workflowMode,
  ])

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

  const applyQuickPrompt = (prompt: string, onApplied?: () => void) => {
    const replaceDraft = () => {
      setDraftText(prompt)
      onApplied?.()
    }

    if (draftText.trim().length === 0) {
      replaceDraft()
      return
    }

    Modal.confirm({
      title: '替换当前草稿？',
      content: '替换后，当前尚未发送的文本将丢失。',
      okText: '确认替换',
      cancelText: '保留草稿',
      onOk: replaceDraft,
    })
  }

  const workflowPanel = workflowMode === 'ontology-ingestion' ? (
    <OntologyWorkflowPanel
      conversationKey={conversationKey}
      evidence={workflowEvidence}
      restoredFromCheckpoint={workflowRestoredFromCheckpoint}
      canSend={canCompose}
      streaming={streaming}
      itemizationConfirmed={effectiveItemizationConfirmed}
      functionModelingConfirmed={activeWorkflowRuntime.functionModelingConfirmed}
      onSendText={(text) => onSend({ text, files: [] })}
      onConfirmItemization={() => setWorkflowRuntime((current) => ({
        ...(current.conversationKey === conversationKey
          ? current
          : activeWorkflowRuntime),
        itemizationConfirmed: true,
      }))}
      onConfirmFunctionModeling={() => setWorkflowRuntime((current) => ({
        ...(current.conversationKey === conversationKey
          ? current
          : activeWorkflowRuntime),
        functionModelingConfirmed: true,
      }))}
    />
  ) : null

  const timeline = (
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
  )

  const workspaceContent = (
    <div className="conversation-workspace__content">
      {timeline}
      {workflowPanel ? (
        <aside
          className="conversation-workspace__workflow-panel"
          aria-label="本体建模工作流"
        >
          {workflowPanel}
        </aside>
      ) : null}
    </div>
  )

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
        onWorkspaceNavigate={onWorkspaceNavigate}
      />

      {workflowMode === 'ontology-ingestion' ? (
        <OntologyWorkflowInteractionContext.Provider value={workflowInteraction}>
          {workspaceContent}
        </OntologyWorkflowInteractionContext.Provider>
      ) : workspaceContent}

      <ConversationComposer
        conversationKind={conversationKind}
        draftText={draftText}
        canCompose={canCompose}
        canSubmit={canSubmit}
        streaming={streaming}
        attachments={attachmentState.attachments}
        attachmentError={attachmentState.validationError}
        quickPrompts={workflowMode === 'ontology-qa' ? (
          <OntologyQaQuickPrompts
            projectDisplayName={projectDisplayName}
            disabled={!canCompose || streaming || attachmentsUploading}
            disabledReason={
              streaming
                ? 'Assistant 正在生成，请停止或等待生成完成后再使用模板'
                : attachmentsUploading
                  ? '附件正在上传，请等待上传完成后再使用模板'
                  : !canCompose
                    ? '当前会话不可写，无法使用快捷模板'
                    : undefined
            }
            onApplyPrompt={applyQuickPrompt}
          />
        ) : undefined}
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
