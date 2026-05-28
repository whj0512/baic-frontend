import type { ReqRelationship } from '../../models/ReqRelationship'
import type { Requirement } from '../../models/Requirement'

export type RenderMode = 'echarts' | 'nvl'

export type RequirementMap = Map<string, Requirement>

export interface DependencyResult {
  dependent_graph: string
  depended_graph: string
  data_name?: string
  dependent_range?: string
  depended_range?: string
  [key: string]: unknown
}

export interface DependencyResponse {
  dependencies?: DependencyResult[]
  relationships?: ReqRelationship[]
}

export interface NormalizedReqRelationship {
  id: string
  sourceRequirementId: string
  targetRequirementId: string
  relationType: string
  dataName?: string
  dependentRange?: string
  dependedRange?: string
  properties?: Record<string, any>
}

export interface NvlNode {
  id: string
  caption?: string
  size?: number
  color?: string
  properties?: Record<string, any>
}

export interface NvlRelationship {
  id: string
  from: string
  to: string
  caption?: string
  type?: string
  color?: string
  width?: number
  properties?: Record<string, any>
}

export interface NvlGraphData {
  nodes: NvlNode[]
  rels: NvlRelationship[]
}
