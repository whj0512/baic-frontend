export interface FunctionRelationsSummary {
  total_relations: number
  by_type: Record<string, number>
  inferred: number
  declared: number
}

export interface FunctionRelation extends Record<string, unknown> {
  relationType: string
  relationSource: string
  relationTarget: string
  isInferred: boolean
  subtype: string
  evidence: unknown[]
  confidence: string
  inferenceRule: string
}

export interface FunctionRelationsData {
  schema_version: string
  generated_at: string | null
  generated_by: string | null
  project_name: string
  query: {
    keyword: string
    repository: string
  }
  summary: FunctionRelationsSummary
  relations: FunctionRelation[]
}

export interface FunctionRelationsError {
  code: string
  message: string
}

export type FunctionRelationsEnvelope =
  | {
      protocol_version: '1.0'
      panel: 'function-relations'
      status: 'success'
      source_file: string
      data: FunctionRelationsData
      warnings: unknown[]
      error: null
    }
  | {
      protocol_version: '1.0'
      panel: 'function-relations'
      status: 'error'
      source_file: string | null
      data: null
      warnings: unknown[]
      error: FunctionRelationsError
    }

export type FunctionRelationsPanelPayload =
  | { state: 'loading' }
  | {
      state: 'success'
      envelope: Extract<FunctionRelationsEnvelope, { status: 'success' }>
    }
  | {
      state: 'remote-error'
      envelope: Extract<FunctionRelationsEnvelope, { status: 'error' }>
    }
  | { state: 'parse-error'; message: string }
