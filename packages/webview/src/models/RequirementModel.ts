export const REQUIREMENT_DIMENSION_CODES = ['IBD', 'ESD', 'BDD', 'ISD', 'SC', 'UI'] as const

export type RequirementDimensionCode = (typeof REQUIREMENT_DIMENSION_CODES)[number]

export interface RequirementModel {
  id: string
  model_group_id: string
  requirement_version_id: string
  requirement_group_id: string
  dimension_code: RequirementDimensionCode
  model_type: string | null
  name: string
  model_key: string
  dsl_text: string
  graph_json: object
  source_representation: 'dsl' | 'graph' | 'both' | string
  context_model_group_id: string | null
  converter_version?: string | null
  is_primary: boolean
  sort_order: number
  source_path?: string | null
  metadata?: Record<string, unknown> | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface RequirementModelInput {
  dimension_code: RequirementDimensionCode
  model_group_id?: string
  model_type?: string | null
  name: string
  model_key: string
  dsl_text?: string | null
  graph_json?: object | null
  context_model_group_id?: string | null
  is_primary?: boolean
  sort_order?: number
  source_path?: string | null
  metadata?: Record<string, unknown> | null
}

export interface RequirementModelDraft extends RequirementModelInput {
  clientId: string
  dsl_text: string
  graph_json: object
}

export type RequirementModelIdentity =
  | { kind: 'persisted'; modelGroupId: string }
  | { kind: 'draft'; clientId: string }

export const isRequirementDimensionCode = (
  value: unknown,
): value is RequirementDimensionCode => (
  typeof value === 'string'
  && (REQUIREMENT_DIMENSION_CODES as readonly string[]).includes(value)
)
