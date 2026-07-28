import type {
  ConversationMessageView,
  ConversationPart,
  ConversationRole,
} from '../../qwenPaw/types'
import { getFenceHandler } from './registry'
import type {
  ExtractedFenceBlock,
  FencedMessagePresentation,
  RegisteredFenceHandler,
} from './types'

interface SourceLine {
  start: number
  content: string
  end: number
}

interface TextExtraction {
  text: string
  blocks: ExtractedFenceBlock[]
}

export type FenceHandlerResolver = (
  keyword: string,
  role: ConversationRole,
) => RegisteredFenceHandler | null

const OPENING_FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})([^`~]*)$/

function readLine(source: string, start: number): SourceLine {
  const lineFeedIndex = source.indexOf('\n', start)
  const end = lineFeedIndex === -1 ? source.length : lineFeedIndex + 1
  let contentEnd = lineFeedIndex === -1 ? source.length : lineFeedIndex
  if (contentEnd > start && source[contentEnd - 1] === '\r') {
    contentEnd -= 1
  }

  return {
    start,
    content: source.slice(start, contentEnd),
    end,
  }
}

function isClosingFence(line: string, marker: string): boolean {
  const character = marker[0]
  const match = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/)
  return Boolean(
    match
    && match[1][0] === character
    && match[1].length >= marker.length,
  )
}

function stripTrailingLineBreak(value: string): string {
  return value.replace(/\r?\n$/, '')
}

function extractFromText(
  text: string,
  role: ConversationRole,
  partIndex: number,
  initialBlockIndex: number,
  resolveHandler: FenceHandlerResolver,
): TextExtraction {
  const blocks: ExtractedFenceBlock[] = []
  const retained: string[] = []
  let cursor = 0
  let retainedStart = 0

  while (cursor < text.length) {
    const openingLine = readLine(text, cursor)
    const openingMatch = openingLine.content.match(OPENING_FENCE_PATTERN)
    if (!openingMatch) {
      cursor = openingLine.end
      continue
    }

    const marker = openingMatch[1]
    const keyword = openingMatch[2].trim()
    let closingLine: SourceLine | null = null
    let searchCursor = openingLine.end

    while (searchCursor < text.length) {
      const candidate = readLine(text, searchCursor)
      if (isClosingFence(candidate.content, marker)) {
        closingLine = candidate
        break
      }
      searchCursor = candidate.end
    }

    if (!closingLine) {
      break
    }

    const handler =
      marker[0] === '`' ? resolveHandler(keyword, role) : null
    if (handler) {
      const rawBody = stripTrailingLineBreak(
        text.slice(openingLine.end, closingLine.start),
      )
      const parsed = handler.parse(rawBody)
      if (parsed.ok) {
        retained.push(text.slice(retainedStart, openingLine.start))
        blocks.push({
          keyword,
          partIndex,
          blockIndex: initialBlockIndex + blocks.length,
          rawBody,
          payload: parsed.payload,
          handler,
        })
        retainedStart = closingLine.end
      }
    }

    cursor = closingLine.end
  }

  if (blocks.length === 0) {
    return { text, blocks }
  }

  retained.push(text.slice(retainedStart))
  return {
    text: retained.join(''),
    blocks,
  }
}

function hasRenderableParts(parts: ConversationPart[]): boolean {
  return parts.some((part) => (
    part.type !== 'text' || part.text.trim().length > 0
  ))
}

export function extractFencedMessageWithResolver(
  message: ConversationMessageView,
  resolveHandler: FenceHandlerResolver,
): FencedMessagePresentation {
  const blocks: ExtractedFenceBlock[] = []
  const parts: ConversationPart[] = []

  message.parts.forEach((part, partIndex) => {
    if (part.type !== 'text') {
      parts.push(part)
      return
    }

    const extracted = extractFromText(
      part.text,
      message.role,
      partIndex,
      blocks.length,
      resolveHandler,
    )
    blocks.push(...extracted.blocks)
    if (extracted.text.trim().length > 0) {
      parts.push({ ...part, text: extracted.text })
    }
  })

  if (blocks.length === 0) {
    return {
      displayMessage: message,
      blocks,
    }
  }

  return {
    displayMessage: hasRenderableParts(parts)
      ? { ...message, parts }
      : null,
    blocks,
  }
}

export function extractFencedMessage(
  message: ConversationMessageView,
): FencedMessagePresentation {
  return extractFencedMessageWithResolver(message, getFenceHandler)
}
