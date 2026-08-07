export const ONTOLOGY_INGESTION_ID = 'ontology-ingestion'

export const ONTOLOGY_INGESTION_AGENT_ROLES = [
  {
    id: 'requirement_itemizer',
    pipeline: 'itemization',
    role: '文档条目化入口',
  },
  {
    id: 'requirement_index_parser',
    pipeline: 'itemization',
    role: '目录与索引解析',
  },
  {
    id: 'requirement_document_extractor',
    pipeline: 'itemization',
    role: '需求文档提取',
  },
  {
    id: 'requirement_document_parse',
    pipeline: 'function-modeling',
    role: '单功能建模入口',
  },
  {
    id: 'requirement_context_parse',
    pipeline: 'function-modeling',
    role: '功能上下文解析',
  },
  {
    id: 'requirement_dsl_generator',
    pipeline: 'function-modeling',
    role: 'DSL 生成',
  },
  {
    id: 'requirement_dsl_aligner',
    pipeline: 'function-modeling',
    role: 'DSL 对齐',
  },
  {
    id: 'requirement_testcase_generator',
    pipeline: 'function-modeling',
    role: '测试用例生成',
  },
  {
    id: 'requirement_ontology_manager',
    pipeline: 'ontology',
    role: '本体关系管理入口',
  },
  {
    id: 'requirement_ontology_parser',
    pipeline: 'ontology',
    role: 'DSL 本体转换',
  },
  {
    id: 'requirement_ontology_uploader',
    pipeline: 'ontology',
    role: 'GraphDB 上传',
  },
  {
    id: 'requirement_ontology_inferencer',
    pipeline: 'ontology',
    role: '本体关系推理',
  },
] as const

export const ONTOLOGY_INGESTION_REQUIRED_AGENT_IDS =
  ONTOLOGY_INGESTION_AGENT_ROLES.map((agent) => agent.id)

export const ONTOLOGY_INGESTION_ENTRY_AGENT_IDS = [
  'requirement_itemizer',
  'requirement_document_parse',
  'requirement_ontology_manager',
] as const

export const ONTOLOGY_INGESTION_STEP_IDS = [
  'itemization',
  'function-modeling',
  'ontology',
] as const
