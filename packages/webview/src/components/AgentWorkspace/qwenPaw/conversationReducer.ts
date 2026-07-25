import type {
  ActiveConversationRef,
  ConversationMessageView,
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
      type: 'stream_text'
      assistantMessageId: string
      text: string
      mode: 'append' | 'replace'
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

    const currentText = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')

    return {
      ...message,
      parts: [{
        type: 'text',
        text: mode === 'append' ? `${currentText}${text}` : text,
      }],
    }
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
