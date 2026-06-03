/**
 * v2: 需求版本不再使用独立的 requirement_version 表，
 * 而是直接存放在 req_requirement 表的行级版本中。
 * 此接口保留用于版本列表展示，字段对齐到 req_requirement 行。
 */
export interface RequirementVersion {
  id: string                     // 版本行 ID（req_requirement.id）
  requirement_group_id: string   // 逻辑需求 ID
  version_code: number           // 版本号
  project_id: string
  created_by: string
  created_at: string
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
}