import type { Requirement } from '../../models/Requirement'

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

export interface DimensionEditorProps {
  draftProjectScope: string
  requirement: Requirement
  sectionKey: SectionKey
  onBack: () => void
  onSave?: (sectionKey: SectionKey, graphData: object, dslText: string, snapshot?: EditorSnapshot) => void
}
