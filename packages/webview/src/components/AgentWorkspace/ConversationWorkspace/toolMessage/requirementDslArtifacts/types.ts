import type { RequirementDimensionCode } from '../../../../../models/RequirementModel'

export type RequirementDslArtifactType =
  | 'environment'
  | 'external-scenario'
  | 'statechart'

export interface RequirementDslSummary {
  feature_count: number
  requirement_count: number
  source_requirement_count: number
  artifact_count: number
  relationship_count: number
  environment_count: number
  external_scenario_count: number
  statechart_count: number
  empty_artifact_requirement_count: number
  missing_name_count: number
  missing_description_count: number
  metadata_missing_count: number
  orphan_requirement_count: number
  unmapped_source_requirement_count: number
}

export interface RequirementDslRequirement {
  name: string
  description: string
  artifacts: string[]
}

export interface RequirementDslArtifact {
  type: RequirementDslArtifactType
  content: string
}

export interface RequirementDslError {
  code: string
  message: string
}

export interface RequirementDslModelSummary {
  feature_count: number
  requirement_count: number
  source_requirement_count: number
  model_count: number
  relationship_count: number
  dimension_counts: Record<RequirementDimensionCode, number>
  empty_model_requirement_count: number
  missing_name_count: number
  missing_description_count: number
  metadata_missing_count: number
  orphan_requirement_count: number
  unmapped_source_requirement_count: number
}

export interface RequirementDslModelRequirement {
  name: string
  description: string
  nl_text: string
  req_type: string
  model_ids: string[]
}

export interface RequirementDslModel {
  dimension_code: RequirementDimensionCode
  model_type: string | null
  name: string
  model_key: string
  dsl_text: string
  graph_json: object | null
  source_representation: string
  context_model_id: string | null
  is_primary: boolean
  sort_order: number
  source_path: string | null
}

export type RequirementDslModelsEnvelope =
  | {
      protocol_version: '2.0'
      status: 'success'
      summary: RequirementDslModelSummary
      requirements: Record<string, RequirementDslModelRequirement>
      models: Record<string, RequirementDslModel>
      warnings: unknown[]
      error: null
    }
  | {
      protocol_version: '2.0'
      status: 'error'
      summary: null
      requirements: Record<string, never>
      models: Record<string, never>
      warnings: unknown[]
      error: RequirementDslError
    }

export type RequirementDslToolEnvelope =
  | RequirementDslArtifactsEnvelope
  | RequirementDslModelsEnvelope

export type RequirementDslArtifactsEnvelope =
  | {
      protocol_version: '1.0'
      status: 'success'
      summary: RequirementDslSummary
      requirements: Record<string, RequirementDslRequirement>
      artifacts: Record<string, RequirementDslArtifact>
      warnings: unknown[]
      error: null
    }
  | {
      protocol_version: '1.0'
      status: 'error'
      summary: null
      requirements: Record<string, never>
      artifacts: Record<string, never>
      warnings: unknown[]
      error: RequirementDslError
    }

export type RequirementDslArtifactsPanelPayload =
  | { state: 'loading' }
  | {
      state: 'success'
      envelope: Extract<
        RequirementDslToolEnvelope,
        { status: 'success' }
      >
    }
  | {
      state: 'remote-error'
      envelope: Extract<
        RequirementDslToolEnvelope,
        { status: 'error' }
      >
    }
  | {
      state: 'parse-error'
      message: string
    }
