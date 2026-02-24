export interface RequirementVersion {
  id: string
  requirement_id: string
  version_number: number
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