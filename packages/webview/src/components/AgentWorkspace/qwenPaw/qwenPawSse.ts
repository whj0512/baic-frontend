import {
  QwenPawError,
  type QwenPawSseEvent,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSsePayload(payload: string): QwenPawSseEvent {
  let value: unknown

  try {
    value = JSON.parse(payload)
  } catch (error) {
    throw new QwenPawError('protocol', 'QwenPaw 返回了无法解析的 SSE JSON', {
      details: payload,
      cause: error,
    })
  }

  if (!isRecord(value)) {
    throw new QwenPawError('protocol', 'QwenPaw SSE data 必须是 JSON 对象', {
      details: value,
    })
  }

  return value
}

function getAbortError(signal: AbortSignal): QwenPawError {
  const reason = signal.reason
  const timedOut =
    reason instanceof DOMException && reason.name === 'TimeoutError'

  return new QwenPawError(
    timedOut ? 'timeout' : 'abort',
    timedOut ? 'QwenPaw 请求超时' : 'QwenPaw 请求已取消',
    { cause: reason },
  )
}

export async function* readQwenPawSse(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onActivity?: () => void,
): AsyncGenerator<QwenPawSseEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let dataLines: string[] = []

  const handleLine = (rawLine: string): QwenPawSseEvent | null => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine

    if (line === '') {
      if (dataLines.length === 0) {
        return null
      }

      const payload = dataLines.join('\n')
      dataLines = []
      return parseSsePayload(payload)
    }

    if (line.startsWith(':')) {
      return null
    }

    const colonIndex = line.indexOf(':')
    const field = colonIndex < 0 ? line : line.slice(0, colonIndex)
    let value = colonIndex < 0 ? '' : line.slice(colonIndex + 1)

    if (value.startsWith(' ')) {
      value = value.slice(1)
    }
    if (field === 'data') {
      dataLines.push(value)
    }

    return null
  }

  try {
    while (true) {
      if (signal.aborted) {
        throw getAbortError(signal)
      }

      const { done, value } = await reader.read()
      if (value && value.byteLength > 0) {
        onActivity?.()
      }
      buffer += decoder.decode(value, { stream: !done })

      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex >= 0) {
        const event = handleLine(buffer.slice(0, newlineIndex))
        buffer = buffer.slice(newlineIndex + 1)

        if (event) {
          yield event
        }

        newlineIndex = buffer.indexOf('\n')
      }

      if (done) {
        break
      }
    }

    if (buffer.length > 0) {
      const event = handleLine(buffer)
      if (event) {
        yield event
      }
    }

    if (dataLines.length > 0) {
      yield parseSsePayload(dataLines.join('\n'))
    }
  } finally {
    reader.releaseLock()
  }
}
