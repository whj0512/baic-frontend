import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { getRuntimeConfig } from '../../../config/runtime'
import { uploadFile } from './qwenPawClient'
import {
  QwenPawError,
  type QwenPawAttachment,
  type QwenPawUploadResponse,
} from './types'

const ALLOWED_FILE_TYPES: Record<string, ReadonlySet<string>> = {
  '.docx': new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  '.pdf': new Set(['application/pdf']),
  '.xlsx': new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
}

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ''
}

function validateFile(file: File): string | null {
  const { qwenPawUploadMaxBytes } = getRuntimeConfig()
  const extension = getFileExtension(file.name)
  const allowedMimeTypes = ALLOWED_FILE_TYPES[extension]

  if (!allowedMimeTypes) {
    return '仅支持 .docx、.pdf 和 .xlsx 文件'
  }
  if (file.type && !allowedMimeTypes.has(file.type)) {
    return `${file.name} 的文件类型与扩展名不匹配`
  }
  if (file.size <= 0) {
    return `${file.name} 是空文件`
  }
  if (file.size > qwenPawUploadMaxBytes) {
    const maxSizeMb = qwenPawUploadMaxBytes / (1024 * 1024)
    return `${file.name} 超过 ${maxSizeMb.toFixed(0)} MB 限制`
  }

  return null
}

function createAttachment(file: File): QwenPawAttachment {
  return {
    id: crypto.randomUUID(),
    file,
    state: 'queued',
  }
}

export function useQwenPawAttachments(
  agentId: string | null,
  conversationKey: string | null,
) {
  const [attachments, setAttachments] = useState<QwenPawAttachment[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const controllersRef = useRef(new Map<string, AbortController>())

  const cancelUploads = useCallback(() => {
    controllersRef.current.forEach((controller) => controller.abort())
    controllersRef.current.clear()
  }, [])

  useEffect(() => {
    cancelUploads()
    setAttachments([])
    setValidationError(null)
  }, [agentId, cancelUploads, conversationKey])

  useEffect(() => () => cancelUploads(), [cancelUploads])

  const addFiles = useCallback((files: File[]) => {
    const validAttachments: QwenPawAttachment[] = []
    const validationMessages: string[] = []

    files.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        validationMessages.push(error)
      } else {
        validAttachments.push(createAttachment(file))
      }
    })

    if (validAttachments.length > 0) {
      setAttachments((current) => [...current, ...validAttachments])
    }
    setValidationError(validationMessages[0] ?? null)
  }, [])

  const removeAttachment = useCallback((attachmentId: string) => {
    controllersRef.current.get(attachmentId)?.abort()
    controllersRef.current.delete(attachmentId)
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId))
  }, [])

  const uploadAttachment = useCallback(async (
    attachment: QwenPawAttachment,
  ): Promise<QwenPawUploadResponse> => {
    if (attachment.uploaded) {
      return attachment.uploaded
    }
    if (!agentId) {
      throw new QwenPawError('protocol', '当前没有可用于上传的 QwenPaw Agent')
    }

    const controller = new AbortController()
    const timeout = globalThis.setTimeout(() => {
      controller.abort(new DOMException('Upload timeout', 'TimeoutError'))
    }, getRuntimeConfig().qwenPawChatTimeoutMs)
    controllersRef.current.set(attachment.id, controller)
    setAttachments((current) => current.map((item) =>
      item.id === attachment.id
        ? { ...item, state: 'uploading', error: undefined }
        : item))

    try {
      const uploaded = await uploadFile(agentId, attachment.file, controller.signal)
      setAttachments((current) => current.map((item) =>
        item.id === attachment.id
          ? { ...item, state: 'uploaded', uploaded, error: undefined }
          : item))

      if (import.meta.env.DEV) {
        console.info('[QwenPaw] 文件上传完成', {
          endpoint: 'upload',
          agentId: agentId.slice(0, 12),
          filename: attachment.file.name,
          size: attachment.file.size,
        })
      }
      return uploaded
    } catch (error) {
      const uploadError =
        error instanceof QwenPawError
          ? error
          : new QwenPawError('network', '文件上传失败', { cause: error })
      setAttachments((current) => current.map((item) =>
        item.id === attachment.id
          ? { ...item, state: 'failed', error: uploadError }
          : item))
      throw uploadError
    } finally {
      globalThis.clearTimeout(timeout)
      controllersRef.current.delete(attachment.id)
    }
  }, [agentId])

  const uploadPending = useCallback(async () => {
    return Promise.all(attachments.map(uploadAttachment))
  }, [attachments, uploadAttachment])

  const retryAttachment = useCallback(async (attachmentId: string) => {
    const attachment = attachments.find((item) => item.id === attachmentId)
    if (!attachment) {
      return
    }

    await uploadAttachment({
      ...attachment,
      uploaded: undefined,
    })
  }, [attachments, uploadAttachment])

  const markSent = useCallback(() => {
    setAttachments((current) =>
      current.map((attachment) => ({ ...attachment, state: 'sent' })))
  }, [])

  const clear = useCallback(() => {
    cancelUploads()
    setAttachments([])
    setValidationError(null)
  }, [cancelUploads])

  return {
    attachments,
    validationError,
    addFiles,
    removeAttachment,
    uploadPending,
    retryAttachment,
    markSent,
    clear,
  }
}
