export interface Requirement {
  id: string
  project_id: string
  current_version_id: string
  previous_version_id?: string
  nl_text?: string
  dsl_text?: string
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
}