import type { ComponentType } from 'react'
import type {
  ConversationMessageView,
  ConversationRole,
} from '../../qwenPaw/types'

export type FenceParseFailureReason =
  | 'incomplete'
  | 'invalid-json'
  | 'invalid-schema'
  | 'unsupported'

export type FenceParseResult<T> =
  | { ok: true; payload: T }
  | { ok: false; reason: FenceParseFailureReason }

export interface FencePanelContext {
  message: ConversationMessageView
  assistantName: string
  standalone: boolean
}

export interface FencePanelProps<T> {
  payload: T
  rawBody: string
  context: FencePanelContext
}

export interface FenceHandlerDefinition<T> {
  keyword: string
  roles?: readonly ConversationRole[]
  parse: (rawBody: string) => FenceParseResult<T>
  Component: ComponentType<FencePanelProps<T>>
}

export interface RegisteredFenceHandler {
  keyword: string
  roles: readonly ConversationRole[]
  parse: (rawBody: string) => FenceParseResult<unknown>
  Component: ComponentType<FencePanelProps<unknown>>
}

export interface ExtractedFenceBlock {
  keyword: string
  partIndex: number
  blockIndex: number
  rawBody: string
  payload: unknown
  handler: RegisteredFenceHandler
}

export interface FencedMessagePresentation {
  displayMessage: ConversationMessageView | null
  blocks: ExtractedFenceBlock[]
}
