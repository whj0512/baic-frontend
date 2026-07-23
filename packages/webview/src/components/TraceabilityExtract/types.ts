import type { GraphData } from '@antv/g6'
import type { TRACEABILITY_EXTRACT_NODE_STYLES } from '../graphNodeStyles'

export type TraceabilityExtractGraphData = GraphData
export type TraceabilityExtractNodeKind = keyof typeof TRACEABILITY_EXTRACT_NODE_STYLES

export interface TraceabilityGraphRequest {
  project_id: string
  response_mode: 'graph'
  minimum_path_score: number
  minimum_scenario_coverage: number
  include_singletons: boolean
  persist: boolean
}

export interface TraceabilitySummary {
  requirement_count: number
  path_count: number
  dependency_count: number
  scenario_count: number
  test_case_count: number
  matched_test_case_count: number
}

export interface TraceabilityPersistence {
  requested: boolean
  persisted_test_case_ids: string[]
}

export interface TraceabilityGraphNodeData {
  name: string
  kind: TraceabilityExtractNodeKind
  category: number
  [key: string]: unknown
}

export interface TraceabilityGraphNode {
  id: string
  data: TraceabilityGraphNodeData
  [key: string]: unknown
}

export type TraceabilityRelation = 'PART_OF_SCENARIO' | 'COVERED_BY'

export interface TraceabilityGraphEdge {
  id: string
  source: string
  target: string
  data: {
    relation: TraceabilityRelation
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface TraceabilityGraphResponse {
  response_mode: 'graph'
  summary: TraceabilitySummary
  g6: {
    nodes: TraceabilityGraphNode[]
    edges: TraceabilityGraphEdge[]
  }
  persistence: TraceabilityPersistence
}
