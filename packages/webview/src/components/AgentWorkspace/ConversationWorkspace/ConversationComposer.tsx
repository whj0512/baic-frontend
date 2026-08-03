import {
  useEffect,
  useRef,
} from 'react'
import type {
  FormEvent,
  KeyboardEvent,
  ReactNode,
} from 'react'
import {
  CloseOutlined,
  FileOutlined,
  LoadingOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons'
import type {
  ActiveConversationRef,
  QwenPawAttachment,
} from '../qwenPaw/types'
import { formatFileSize } from './conversationUtils'

interface ConversationComposerProps {
  conversationKind?: ActiveConversationRef['kind']
  draftText: string
  canCompose: boolean
  canSubmit: boolean
  streaming: boolean
  attachments: QwenPawAttachment[]
  attachmentError: string | null
  quickPrompts?: ReactNode
  onDraftChange: (value: string) => void
  onFilesSelected: (files: File[]) => void
  onAttachmentRemove: (attachmentId: string) => void
  onAttachmentRetry: (attachmentId: string) => void
  onSubmit: () => void
  onStop: () => void
}

function ConversationComposer({
  conversationKind,
  draftText,
  canCompose,
  canSubmit,
  streaming,
  attachments,
  attachmentError,
  quickPrompts,
  onDraftChange,
  onFilesSelected,
  onAttachmentRemove,
  onAttachmentRetry,
  onSubmit,
  onStop,
}: ConversationComposerProps) {
  const composingRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (conversationKind !== 'draft') {
      return
    }

    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [conversationKind])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter'
      || event.shiftKey
      || composingRef.current
      || event.nativeEvent.isComposing
    ) {
      return
    }

    event.preventDefault()
    if (canSubmit) {
      onSubmit()
    }
  }

  return (
    <form
      className="conversation-composer"
      aria-labelledby="conversation-composer-status"
      onSubmit={handleSubmit}
    >
      <div className="conversation-composer__shell">
        {quickPrompts}
        <div
          className="conversation-composer__upload-hint"
          onDragOver={(event) => {
            if (canCompose && !streaming) {
              event.preventDefault()
            }
          }}
          onDrop={(event) => {
            if (!canCompose || streaming) {
              return
            }
            event.preventDefault()
            onFilesSelected(Array.from(event.dataTransfer.files))
          }}
        >
          <PaperClipOutlined />
          <span>支持拖入 .docx、.pdf、.xlsx 文件</span>
        </div>
        {attachments.length > 0 ? (
          <div className="conversation-composer__attachments">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className={`conversation-composer__attachment conversation-composer__attachment--${attachment.state}`}
              >
                {attachment.state === 'uploading'
                  ? <LoadingOutlined spin />
                  : <FileOutlined />}
                <span className="conversation-composer__attachment-name">
                  {attachment.file.name}
                </span>
                <span className="conversation-composer__attachment-meta">
                  {attachment.state === 'queued'
                    ? formatFileSize(attachment.file.size)
                    : attachment.state === 'uploading'
                      ? '上传中'
                      : attachment.state === 'uploaded'
                        ? '已上传'
                        : attachment.state === 'failed'
                          ? attachment.error?.message || '上传失败'
                          : '已发送'}
                </span>
                {attachment.state === 'failed' ? (
                  <button
                    type="button"
                    aria-label={`重试上传 ${attachment.file.name}`}
                    title="重试上传"
                    onClick={() => onAttachmentRetry(attachment.id)}
                  >
                    <ReloadOutlined />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`移除 ${attachment.file.name}`}
                  title={
                    attachment.state === 'uploading'
                      ? '取消上传并移除附件'
                      : '移除附件'
                  }
                  onClick={() => onAttachmentRemove(attachment.id)}
                >
                  <CloseOutlined />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {attachmentError ? (
          <div className="conversation-composer__attachment-error" role="alert">
            {attachmentError}
          </div>
        ) : null}
        <div className="conversation-composer__input-row">
          <textarea
            ref={textareaRef}
            value={draftText}
            aria-label="对话内容"
            aria-describedby="conversation-composer-status"
            placeholder={
              canCompose
                ? '输入消息，Enter 发送，Shift+Enter 换行…'
                : '当前会话仅支持查看'
            }
            disabled={!canCompose || streaming}
            onChange={(event) => onDraftChange(event.target.value)}
            onCompositionStart={() => {
              composingRef.current = true
            }}
            onCompositionEnd={() => {
              composingRef.current = false
            }}
            onKeyDown={handleKeyDown}
          />
          <input
            ref={fileInputRef}
            className="conversation-sr-only"
            type="file"
            accept=".docx,.pdf,.xlsx"
            multiple
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              onFilesSelected(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
          />
          <div className="conversation-composer__actions">
            <button
              type="button"
              aria-label="添加附件"
              disabled={!canCompose || streaming}
              title="添加 .docx、.pdf 或 .xlsx 附件"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperClipOutlined />
            </button>
            {streaming ? (
              <button
                type="button"
                className="conversation-composer__send conversation-composer__send--stop"
                aria-label="停止生成"
                title="停止生成"
                onClick={onStop}
              >
                <StopOutlined />
              </button>
            ) : (
              <button
                type="submit"
                className="conversation-composer__send"
                aria-label="发送消息"
                disabled={!canSubmit}
                title={canSubmit ? '发送消息' : '请输入消息'}
              >
                <SendOutlined />
              </button>
            )}
          </div>
        </div>
      </div>
      <p id="conversation-composer-status">
        {canCompose
          ? streaming
            ? 'QwenPaw 正在生成回复，可随时停止'
            : '消息将发送至 QwenPaw；请勿在输入中包含敏感信息'
          : '当前会话不可发送消息'}
      </p>
    </form>
  )
}

export default ConversationComposer
