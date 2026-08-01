import type {
  ActiveConversationRef,
  ConversationMessageView,
  ConversationPart,
  QwenPawConversationStatus,
  QwenPawError,
  QwenPawRegistrationState,
} from './types'

export interface QwenPawConversationState {
  activeConversation: ActiveConversationRef | null
  messages: ConversationMessageView[]
  status: QwenPawConversationStatus
  registrationState: QwenPawRegistrationState
  error: QwenPawError | null
}

export type QwenPawConversationAction =
  | {
      type: 'activate'
      conversation: ActiveConversationRef | null
      messages?: ConversationMessageView[]
      status?: QwenPawConversationStatus
      registrationState?: QwenPawRegistrationState
    }
  | {
      type: 'history_loaded'
      conversationKey: string
      messages: ConversationMessageView[]
    }
  | {
      type: 'history_failed'
      conversationKey: string
      error: QwenPawError
    }
  | {
      type: 'send_started'
      userMessage: ConversationMessageView
      assistantMessage: ConversationMessageView
    }
  | {
      type: 'retry_started'
      assistantMessageId: string
    }
  | {
      type: 'stream_text'
      assistantMessageId: string
      text: string
      mode: 'append' | 'replace'
    }
  | {
      type: 'stream_tool'
      assistantMessageId: string
      part: Extract<ConversationPart, { type: 'tool' }>
    }
  | {
      type: 'send_finalizing'
      userMessageId: string
      assistantMessageId: string
    }
  | {
      type: 'history_reconciled'
      messages: ConversationMessageView[]
    }
  | {
      type: 'send_completed'
      userMessageId: string
      assistantMessageId: string
    }
  | { type: 'send_failed'; error: QwenPawError }
  | { type: 'send_stopped' }
  | {
      type: 'registered'
      conversation: ActiveConversationRef
    }
  | { type: 'registration_syncing' }
  | { type: 'registration_pending' }

export const INITIAL_QWENPAW_CONVERSATION_STATE: QwenPawConversationState = {
  activeConversation: null,
  messages: [],
  status: 'idle',
  registrationState: 'idle',
  error: null,
}

export function getConversationKey(
  conversation: ActiveConversationRef | null,
): string | null {
  if (!conversation) {
    return null
  }

  return conversation.kind === 'persisted'
    ? `${conversation.agentId}:chat:${conversation.chatId}`
    : `${conversation.agentId}:draft:${conversation.sessionId}`
}

function updateAssistantText(
  messages: ConversationMessageView[],
  assistantMessageId: string,
  text: string,
  mode: 'append' | 'replace',
): ConversationMessageView[] {
  return messages.map((message) => {
    if (message.id !== assistantMessageId) {
      return message
    }

    const parts = [...message.parts]
    const activePartIndex = parts.length - 1
    const activePart = parts[activePartIndex]

    if (activePart?.type === 'text') {
      parts[activePartIndex] = {
        type: 'text',
        text: mode === 'append' ? `${activePart.text}${text}` : text,
      }
    } else {
      parts.push({ type: 'text', text })
    }

    return {
      ...message,
      parts,
    }
  })
}

function hasToolCall(
  part: Extract<ConversationPart, { type: 'tool' }>,
): boolean {
  return (
    part.eventType === 'plugin_call'
    || part.eventType === 'plugin_call_and_output'
  )
}

function hasToolOutput(
  part: Extract<ConversationPart, { type: 'tool' }>,
): boolean {
  return (
    part.eventType === 'plugin_call_output'
    || part.eventType === 'plugin_call_and_output'
  )
}

function mergeStreamingToolParts(
  current: Extract<ConversationPart, { type: 'tool' }>,
  incoming: Extract<ConversationPart, { type: 'tool' }>,
): Extract<ConversationPart, { type: 'tool' }> {
  const hasCall = hasToolCall(current) || hasToolCall(incoming)
  const hasOutput = hasToolOutput(current) || hasToolOutput(incoming)

  return {
    type: 'tool',
    eventType:
      hasCall && hasOutput
        ? 'plugin_call_and_output'
        : incoming.eventType,
    callId: incoming.callId ?? current.callId,
    name: incoming.name ?? current.name,
    input: incoming.input ?? current.input,
    output: incoming.output ?? current.output,
    data: {
      previous: current.data,
      latest: incoming.data,
    },
  }
}

function updateAssistantTool(
  messages: ConversationMessageView[],
  assistantMessageId: string,
  incoming: Extract<ConversationPart, { type: 'tool' }>,
): ConversationMessageView[] {
  return messages.map((message) => {
    if (message.id !== assistantMessageId) {
      return message
    }

    const parts = message.parts.filter(
      (part) => part.type !== 'text' || part.text.length > 0,
    )
    const partIndex = incoming.callId
      ? parts.findIndex(
        (part) =>
          part.type === 'tool' && part.callId === incoming.callId,
      )
      : -1
    const currentPart = partIndex >= 0 ? parts[partIndex] : undefined
    if (currentPart?.type === 'tool') {
      parts[partIndex] = mergeStreamingToolParts(
        currentPart,
        incoming,
      )
    } else {
      parts.push(incoming)
    }

    return { ...message, parts }
  })
}

export function qwenPawConversationReducer(
  state: QwenPawConversationState,
  action: QwenPawConversationAction,
): QwenPawConversationState {
  switch (action.type) {
    case 'activate':
      return {
        activeConversation: action.conversation,
        messages: action.messages ?? [],
        status:
          action.status
          ?? (action.conversation ? 'ready' : 'idle'),
        registrationState:
          action.registrationState
          ?? (action.conversation?.kind === 'persisted' ? 'synced' : 'idle'),
        error: null,
      }
    case 'history_loaded':
      if (
        getConversationKey(state.activeConversation)
        !== action.conversationKey
        || state.status === 'generating'
        || state.status === 'finalizing'
      ) {
        return state
      }

      return {
        ...state,
        messages: action.messages,
        status: 'ready',
        error: null,
      }
    case 'history_failed':
      if (
        getConversationKey(state.activeConversation)
        !== action.conversationKey
        || state.status === 'generating'
        || state.status === 'finalizing'
      ) {
        return state
      }

      return {
        ...state,
        status: 'failed',
        error: action.error,
      }
    case 'send_started':
      return {
        ...state,
        messages: [
          ...state.messages,
          action.userMessage,
          action.assistantMessage,
        ],
        status: 'generating',
        error: null,
      }
    case 'retry_started':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.assistantMessageId
            ? {
                ...message,
                parts: [{ type: 'text', text: '' }],
                transient: true,
                status: 'generating',
              }
            : message),
        status: 'generating',
        error: null,
      }
    case 'stream_text':
      return {
        ...state,
        messages: updateAssistantText(
          state.messages,
          action.assistantMessageId,
          action.text,
          action.mode,
        ),
      }
    case 'stream_tool':
      return {
        ...state,
        messages: updateAssistantTool(
          state.messages,
          action.assistantMessageId,
          action.part,
        ),
      }
    case 'send_finalizing':
      if (state.status !== 'generating') {
        return state
      }

      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.assistantMessageId
            ? { ...message, transient: false, status: 'syncing' }
            : message.id === action.userMessageId
              ? { ...message, transient: false, status: 'sent' }
              : message),
        status: 'finalizing',
        error: null,
      }
    case 'history_reconciled':
      if (state.status !== 'generating' && state.status !== 'finalizing') {
        return state
      }

      return {
        ...state,
        messages: action.messages,
        status: 'completed',
        error: null,
      }
    case 'send_completed':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.assistantMessageId
            ? { ...message, transient: false, status: 'completed' }
            : message.id === action.userMessageId
              ? { ...message, transient: false, status: 'sent' }
              : message,
        ),
        status: 'completed',
        error: null,
      }
    case 'send_failed':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.transient
            ? {
                ...message,
                transient: false,
                status: message.role === 'assistant' ? 'failed' : 'sent',
              }
            : message,
        ),
        status: 'failed',
        error: action.error,
      }
    case 'send_stopped':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.transient
            ? {
                ...message,
                transient: false,
                status: message.role === 'assistant' ? 'stopped' : 'sent',
              }
            : message,
        ),
        status: 'stopped',
        error: null,
      }
    case 'registered':
      return {
        ...state,
        activeConversation: action.conversation,
        registrationState: 'synced',
      }
    case 'registration_syncing':
      return {
        ...state,
        registrationState: 'syncing',
      }
    case 'registration_pending':
      return {
        ...state,
        registrationState: 'pending',
      }
  }
}
