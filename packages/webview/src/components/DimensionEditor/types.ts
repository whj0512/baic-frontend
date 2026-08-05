import type { Requirement } from '../../models/Requirement'
import type { RequirementModel, RequirementModelDraft } from '../../models/RequirementModel'

export type ViewMode = 'visual' | 'dsl'

export type ConvertedVisualData = {
  cellsData: object
  canvasData?: Record<string, any>
}

export type EditorSnapshot = {
  content: string
  dslContent: string
  graphData: object
}

// SectionKey 与 CreateRequirement.tsx 保持一致
export type SectionKey =
  | 'environment'
  | 'interaction'
  | 'internalComposition'
  | 'moduleResponses'
  | 'internalConstraints'
  | 'dialogMap'

export type DimensionSectionConfig = {
  dimensionCode: string
  label: string
  graphField?: keyof Requirement
  dslField?: keyof Requirement
}

export interface RequirementDimensionEditorProps {
  mode?: 'requirement'
  draftProjectScope: string
  requirement: Requirement
  sectionKey: SectionKey
  model?: RequirementModel | RequirementModelDraft
  modelIdentity?: string
  ibdDsl?: string
  visualDisabledReason?: string
  onBack: () => void
  onSave?: (sectionKey: SectionKey, graphData: object, dslText: string, snapshot?: EditorSnapshot) => void
  onPersist?: (snapshot: EditorSnapshot) => Promise<void>
}

export interface DimensionArtifactDraft {
  dslContent: string
  graphData: object
}

export interface ArtifactDimensionEditorProps {
  mode: 'artifact'
  sectionKey: SectionKey
  initialDslContent: string
  initialGraphData?: object
  ibdDsl?: string
  visualDisabledReason?: string
  onBack?: () => void
  onDraftChange?: (draft: DimensionArtifactDraft) => void
}

export type DimensionEditorProps =
  | RequirementDimensionEditorProps
  | ArtifactDimensionEditorProps
