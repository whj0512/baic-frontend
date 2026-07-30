import type {
  ComponentType,
  ReactNode,
} from 'react'
import type {
  ConversationMessageView,
  QwenPawAgent,
  QwenPawChatHistory,
  QwenPawChatSpec,
  QwenPawConnectionState,
  QwenPawContent,
} from '../qwenPaw/types'

export type AgentTaskRunStatus =
  | 'draft'
  | 'running'
  | 'awaiting_confirmation'
  | 'partially_failed'
  | 'completed'
  | 'failed'

export type WorkflowJobStatus =
  | 'queued'
  | 'registered'
  | 'running'
  | 'awaiting_confirmation'
  | 'completed'
  | 'failed'
  | 'stopped'
  | 'unrecoverable'

export type WorkflowArtifactStatus =
  | 'declared'
  | 'ready'
  | 'partial'
  | 'invalid'
  | 'unavailable'

export interface WorkflowArtifactSource {
  chatSpecId: string
  sessionId: string
  messageId: string
  partKey: string
  handlerId: string
  queryBindingId: string
  variantId?: string
}

export interface WorkflowArtifact {
  id: string
  jobId: string
  kind: string
  name: string
  status: WorkflowArtifactStatus
  queryBindingId: string
  payloadKey: string
  source?: WorkflowArtifactSource
}

export interface WorkflowWarning {
  code: string
  message: string
  jobId?: string
  agentId?: string
  chatSpecId?: string
}

export interface WorkflowJob {
  id: string
  stepId: string
  entryAgentId: string
  status: WorkflowJobStatus
  order: number
  functionKey?: string
  chatSpec?: QwenPawChatSpec
  history?: QwenPawChatHistory
  messages?: ConversationMessageView[]
  registrationState: 'pending' | 'registered' | 'missing'
  historyState: 'idle' | 'loading' | 'ready' | 'empty' | 'error'
  requestId?: string
  error?: string
}

export interface AgentTaskRun {
  businessAgentId: string
  runId: string
  projectId: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
  status: AgentTaskRunStatus
  activeStepId: string
  jobs: WorkflowJob[]
  artifacts: WorkflowArtifact[]
  warnings: WorkflowWarning[]
  workflowData: unknown
  historyIncomplete: boolean
}

export interface WorkflowIdentity {
  businessAgentId: string
  runId: string
  projectId: string
}

export interface ParsedWorkflowJobIdentity {
  jobId: string
  stepId: string
  order: number
  functionKey?: string
}

export interface WorkflowIdentityAdapter {
  buildSessionId: (
    runId: string,
    job: ParsedWorkflowJobIdentity,
  ) => string
  parseSessionId: (
    sessionId: string,
    runId: string,
  ) => ParsedWorkflowJobIdentity | null
}

export type ArtifactDelivery =
  | 'assistant-fence'
  | 'tool-output'
  | 'client-panel'

export interface ArtifactQueryVariant {
  id: string
  label: string
  detail: 'summary' | 'full' | 'filtered'
}

export interface ArtifactQueryBinding {
  id: string
  stepId: string
  entryAgentId: string
  skillId: string
  delivery: ArtifactDelivery
  handlerId: string
  scope: 'job' | 'step'
  trigger: 'on-job-output-ready' | 'on-step-output-ready' | 'manual'
  sessionSelector: 'current-job' | 'latest-completed-step-job'
  variants?: ArtifactQueryVariant[]
}

export interface WorkflowStepDefinition {
  id: string
  name: string
  description: string
}

export interface ArtifactGroupDefinition {
  id: string
  name: string
  stepId: string
  kinds: string[]
}

export interface StarterFieldDefinition {
  id: string
  label: string
  type: 'text' | 'textarea' | 'file' | 'directory'
  required?: boolean
  multiple?: boolean
}

export interface StarterDefinition {
  fields: StarterFieldDefinition[]
}

export interface WorkflowRequestContext {
  projectId: string
  runId: string
  job: ParsedWorkflowJobIdentity
  values: Record<string, unknown>
}

export interface WorkflowRequest {
  agentId: string
  sessionId: string
  userId: string
  channel: 'console'
  content: QwenPawContent[]
}

export type WorkflowRequestBuilder = (
  context: WorkflowRequestContext,
) => WorkflowRequest

export interface BusinessAgentExtensions {
  starter?: ComponentType<unknown>
  stepPanels?: Record<string, ComponentType<unknown>>
  artifactRenderers?: Record<string, ComponentType<unknown>>
}

export interface BusinessAgentDefinition {
  id: string
  name: string
  description: string
  icon?: ReactNode
  requiredAgentIds: string[]
  entryAgentIds: string[]
  starter: StarterDefinition
  steps: WorkflowStepDefinition[]
  artifactGroups: ArtifactGroupDefinition[]
  artifactQueries: ArtifactQueryBinding[]
  identity: WorkflowIdentityAdapter
  buildInitialRequest: WorkflowRequestBuilder
  buildContinuationRequest: WorkflowRequestBuilder
  extensions?: BusinessAgentExtensions
}

export interface AgentDependencyHealth {
  id: string
  agent: QwenPawAgent | null
  state: 'available' | 'missing' | 'disabled' | 'model-missing' | 'offline'
  available: boolean
}

export interface BusinessAgentHealth {
  businessAgentId: string
  available: boolean
  connectionState: QwenPawConnectionState
  dependencies: AgentDependencyHealth[]
}

export interface EntryAgentChatsResult {
  agentId: string
  chats: QwenPawChatSpec[]
  error?: string
}

export interface AgentTaskRunsState {
  runs: AgentTaskRun[]
  selectedRun: AgentTaskRun | null
  loading: boolean
  detailLoading: boolean
  error: string | null
  historyIncomplete: boolean
}

export interface WorkflowStarterExtensionProps {
  definition: BusinessAgentDefinition
  values: Record<string, unknown>
}

export interface WorkflowStepPanelProps {
  run: AgentTaskRun
  job: WorkflowJob
}

export interface WorkflowArtifactProps {
  artifact: WorkflowArtifact
}
