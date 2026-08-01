export type OntologyWorkflowStageStatus = 'pending' | 'active' | 'completed'

export interface OntologyWorkflowStageDefinition {
  id: 'itemization' | 'function-modeling' | 'ontology-management'
  title: string
  description: string
  scenes: readonly number[]
}

export interface OntologyWorkflowStageView extends OntologyWorkflowStageDefinition {
  status: OntologyWorkflowStageStatus
}

export interface SceneOneFormValues {
  sourceDocument: string
  mineruMarkdown: string
  projectRoot: string
  additionalConstraints: string
}

export interface SceneThreeFormValues {
  functionMarkdown: string
  projectRoot: string
  additionalRequirements: string
}

export type WorkflowFunctionModelingStatus =
  | 'pending'
  | 'started'
  | 'restarted'

export interface WorkflowFunctionProgress {
  chunkId: string
  messageCount: number
  latestMessageIndex: number
  functionMarkdown: string
  projectRoot: string
  status: WorkflowFunctionModelingStatus
}

export interface WorkflowFunctionSelection {
  chunkId: string
  requirementId: string | null
  name: string
  sourceRelativePath: string | null
  projectRoot: string
  resolvedMarkdownPath: string | null
}

export interface OntologyWorkflowInteraction {
  enabled: boolean
  activeChunksMessageId: string | null
  selectedChunkId: string | null
  modeledChunkIds: ReadonlySet<string>
  onSelectFunction: (selection: WorkflowFunctionSelection) => void
}
