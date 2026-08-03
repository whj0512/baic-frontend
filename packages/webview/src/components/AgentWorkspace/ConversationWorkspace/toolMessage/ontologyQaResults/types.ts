export interface OntologyQaResultsSummary {
  total_inferred: number
  dependencies: number
  conflicts: number
  state_machine_issues: Record<string, number>
  scenario_issues: Record<string, number>
}

export type OntologyQaFinding = Record<string, unknown>

export interface OntologyQaResultsData {
  schema_version: string
  generated_at: string | null
  generated_by: string | null
  project_name: string | null
  summary: OntologyQaResultsSummary
  inferred_dependencies: OntologyQaFinding[]
  inferred_conflicts: OntologyQaFinding[]
  state_machine_issues: OntologyQaFinding[]
  scenario_issues: OntologyQaFinding[]
  root_cause_analysis: Record<string, unknown>
}

export interface OntologyQaResultsError {
  code: string
  message: string
}

export type OntologyQaResultsEnvelope =
  | {
      protocol_version: '1.0'
      status: 'success'
      source_file: string
      data: OntologyQaResultsData
      warnings: unknown[]
      error: null
    }
  | {
      protocol_version: '1.0'
      status: 'error'
      source_file: string | null
      data: null
      warnings: unknown[]
      error: OntologyQaResultsError
    }

export type OntologyQaResultsPanelPayload =
  | { state: 'loading' }
  | { state: 'success'; envelope: Extract<OntologyQaResultsEnvelope, { status: 'success' }> }
  | { state: 'remote-error'; envelope: Extract<OntologyQaResultsEnvelope, { status: 'error' }> }
  | { state: 'parse-error'; message: string }
