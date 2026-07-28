import type { ComponentType } from 'react'
import type {
  ConversationMessageView,
  ConversationPart,
} from '../../qwenPaw/types'

export interface ToolPanelContext {
  message: ConversationMessageView
  assistantName: string
}

export interface ToolPanelProps<T> {
  payload: T
  context: ToolPanelContext
}

export interface ToolPanelHandlerDefinition<T> {
  id: string
  matches: (
    part: Extract<ConversationPart, { type: 'tool' }>,
  ) => boolean
  parse: (
    part: Extract<ConversationPart, { type: 'tool' }>,
  ) => T
  Component: ComponentType<ToolPanelProps<T>>
}

export interface RegisteredToolPanelHandler {
  id: string
  matches: (
    part: Extract<ConversationPart, { type: 'tool' }>,
  ) => boolean
  parse: (
    part: Extract<ConversationPart, { type: 'tool' }>,
  ) => unknown
  Component: ComponentType<ToolPanelProps<unknown>>
}

export interface ExtractedToolPanel {
  partIndex: number
  callId: string
  payload: unknown
  handler: RegisteredToolPanelHandler
}
