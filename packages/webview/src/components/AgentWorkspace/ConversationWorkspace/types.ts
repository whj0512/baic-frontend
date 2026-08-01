import type {
  ActiveConversationRef,
  ConversationMessageView,
  QwenPawAgent,
  QwenPawChatSpec,
  QwenPawConversationStatus,
  QwenPawConnectionState,
  QwenPawHistoryStatus,
  QwenPawRegistrationState,
  QwenPawUploadResponse,
} from '../qwenPaw/types'

export interface ConversationDraft {
  text: string
  files: QwenPawUploadResponse[]
}

export type WorkspaceNavigationTarget =
  | 'requirements'
  | 'test-cases'
  | 'knowledge-graph'

export type ConversationWorkflowMode = 'ontology-ingestion'

export interface ConversationWorkspaceProps {
  activeAgent: QwenPawAgent | null
  activeConversation: ActiveConversationRef | null
  activeChat: QwenPawChatSpec | null
  connectionState: QwenPawConnectionState
  messages: ConversationMessageView[]
  historyStatus: QwenPawHistoryStatus
  historyError: string | null
  streaming: boolean
  streamError: string | null
  conversationStatus: QwenPawConversationStatus
  registrationState: QwenPawRegistrationState
  workflowMode?: ConversationWorkflowMode
  onSend: (draft: ConversationDraft) => Promise<void>
  onRetry: () => Promise<void>
  onStop: () => void
  onHistoryRetry: () => void
  onOpenSidebar: () => void
  onWorkspaceNavigate: (target: WorkspaceNavigationTarget) => void
}
