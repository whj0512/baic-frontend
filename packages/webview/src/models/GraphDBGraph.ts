import type { GraphData } from '@antv/g6'

export type GraphDBGraphOrigin = 'all' | 'explicit' | 'inferred' | 'both'
export type GraphDBGraphDepth = 1 | 2 | 3

export interface GraphDBGraphRequest {
  root?: string | null
  depth?: GraphDBGraphDepth
  origin?: GraphDBGraphOrigin
  node_types?: string[]
  predicates?: string[]
  node_limit?: number
  edge_limit?: number
  include_properties?: boolean
}

export interface GraphDBGraphMeta {
  root: string | null
  depth: number
  origin: GraphDBGraphOrigin
  nodeCount: number
  edgeCount: number
  nodeLimit: number
  edgeLimit: number
  truncated: boolean
  propertiesTruncated: boolean
  includeProperties: boolean
}

export type GraphDBGraphResponse = GraphData & {
  nodes: NonNullable<GraphData['nodes']>
  edges: NonNullable<GraphData['edges']>
  meta: GraphDBGraphMeta
}
