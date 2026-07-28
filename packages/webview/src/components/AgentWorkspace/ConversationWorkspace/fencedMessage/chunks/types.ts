export interface ChunkRecord extends Record<string, unknown> {
  chunk_id: string
  title?: string
  chunk_type?: string
  req_id?: string
  canonical_function_name?: string
  parent_requirement?: unknown
  semantic_description?: string
  requirement_path?: unknown[]
  hierarchy_evidence?: unknown[]
  keywords?: unknown[]
  physical_segments?: unknown[]
  source_sections?: unknown[]
  sub_elements?: unknown[]
  subfunction?: unknown
  merged_from?: unknown[]
  source_relative_path?: string
}

export interface ChunksData extends Record<string, unknown> {
  document_info: Record<string, unknown>
  chunking_summary: Record<string, unknown>
  chunking_rules_applied?: unknown
  chunks: ChunkRecord[]
  project_relation_seed?: Record<string, unknown> | null
}

export interface ChunksEnvelope extends Record<string, unknown> {
  protocol_version: '1.0'
  status: 'success' | 'error'
  project_root: unknown
  source_file: unknown
  detail: unknown
  data: ChunksData | null
  warnings: unknown[]
  error: unknown
}
