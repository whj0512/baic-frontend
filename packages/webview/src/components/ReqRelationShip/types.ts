import type { ReqRelationship } from '../../models/ReqRelationship'
import type { Requirement } from '../../models/Requirement'
import type { GraphData } from '@antv/g6'

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

export type G6GraphData = GraphData
