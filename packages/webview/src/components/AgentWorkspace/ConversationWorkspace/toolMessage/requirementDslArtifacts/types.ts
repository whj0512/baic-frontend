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
        RequirementDslArtifactsEnvelope,
        { status: 'success' }
      >
    }
  | {
      state: 'remote-error'
      envelope: Extract<
        RequirementDslArtifactsEnvelope,
        { status: 'error' }
      >
    }
  | {
      state: 'parse-error'
      message: string
    }
