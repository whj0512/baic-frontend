export interface Requirement {
  id: string
  name: string
  requirement_group_id?: string  // v2 逻辑需求 ID（API 中仍以该值作为 requirement_id）
  version_code?: number          // v2 版本号
  project_id: string
  nl_text?: string
  dsl_IBD?: string
  dsl_ESD?: string
  dsl_SC?: string
  dsl_BDD?: string
  dsl_ISD?: string
  graph_IBD?: object
  graph_ESD?: object
  graph_SC?: object
  graph_BDD?: object
  graph_ISD?: object
  created_by: string
  created_at: string
  updated_at: string
  type?: string
}