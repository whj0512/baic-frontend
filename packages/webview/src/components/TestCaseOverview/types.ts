import type { GraphData } from '@antv/g6'
import type { TEST_CASE_OVERVIEW_NODE_STYLES } from '../echartsNodeStyles'

export type TestCaseOverviewGraphData = GraphData
export type TestCaseOverviewNodeKind = keyof typeof TEST_CASE_OVERVIEW_NODE_STYLES

export interface StackItem {
  indent: number
  type: 'path' | 'data'
  value: string
  id?: string
}

export interface ParsedTreeNode {
  id: string
  name: string
  category: number
}

export interface ParsedTreeEdge {
  from: string
  to: string
  label: string
}

export interface OverviewNodeMeta {
  id: string
  name: string
  category: number
  kind: TestCaseOverviewNodeKind
  tooltip: string
  x?: number
  y?: number
}

export interface OverviewLinkMeta {
  source: string
  target: string
}
