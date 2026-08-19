import type { GraphData } from '@antv/g6'
import type {
  GraphDBGraphMeta,
  GraphDBGraphOrigin,
  GraphDBGraphRequest,
  GraphDBGraphResponse,
} from '../../models/GraphDBGraph'

export const DEFAULT_GRAPH_REQUEST: GraphDBGraphRequest = {
  root: '',
  depth: 1,
  origin: 'all',
  node_types: ['Requirement'],
  node_limit: 300,
  edge_limit: 1000,
  include_properties: true,
}

const NODE_TYPE_COLOR_PALETTE = [
  '#1677ff',
  '#52c41a',
  '#fa8c16',
  '#722ed1',
  '#eb2f96',
  '#13c2c2',
  '#fa541c',
  '#2f54eb',
  '#a0d911',
  '#d4380d',
]

export interface GraphLegendItem {
  label: string
  color: string
  stroke?: string
  dashed?: boolean
}

export interface GraphLegendData {
  nodes: GraphLegendItem[]
  edges: GraphLegendItem[]
}

export type NodeTypeColorResolver = (type: string) => string

const EDGE_ORIGIN_LEGEND_ITEMS: GraphLegendItem[] = [
  { label: '显式关系', color: '#5B8FF9' },
  { label: '推理关系', color: '#F6903D', dashed: true },
  { label: '显式且推理关系', color: '#9661BC' },
]

export function createNodeTypeColorResolver(): NodeTypeColorResolver {
  const colors = new Map<string, string>()

  return (type: string) => {
    const nodeType = type || '未分类'
    const existingColor = colors.get(nodeType)
    if (existingColor) return existingColor

    const colorIndex = colors.size
    const color = colorIndex < NODE_TYPE_COLOR_PALETTE.length
      ? NODE_TYPE_COLOR_PALETTE[colorIndex]
      : `hsl(${(colorIndex * 137.508) % 360} 70% 48%)`
    colors.set(nodeType, color)
    return color
  }
}

export function buildReadableGraphData(
  graphResponse: GraphData,
  resolveNodeColor: NodeTypeColorResolver,
): GraphData {
  return {
    nodes: (graphResponse.nodes || []).map((node) => {
      const style = isRecord(node.style) ? node.style : {}

      return {
        ...node,
        style: {
          ...style,
          fill: resolveNodeColor(getGraphNodeType(node)),
        },
      } as NonNullable<GraphData['nodes']>[number]
    }),
    edges: (graphResponse.edges || []).map((edge) => {
      const style = isRecord(edge.style) ? edge.style : {}
      const data = isRecord(edge.data) ? edge.data : {}
      const labelText = getString(style.labelText)
        || getString(data.relationType)
        || getString(data.predicate)

      return {
        ...edge,
        style: {
          ...style,
          labelText,
        },
      } as NonNullable<GraphData['edges']>[number]
    }),
  }
}

export function buildGraphLegendData(
  nodes: NonNullable<GraphData['nodes']>,
  resolveNodeColor: NodeTypeColorResolver,
): GraphLegendData {
  const nodeLegendItems = new Map<string, GraphLegendItem>()

  nodes.forEach((node) => {
    const label = getGraphNodeType(node) || '未分类'
    if (nodeLegendItems.has(label)) return

    const color = resolveNodeColor(getGraphNodeType(node))
    nodeLegendItems.set(label, { label, color, stroke: color })
  })

  return {
    nodes: Array.from(nodeLegendItems.values()),
    edges: EDGE_ORIGIN_LEGEND_ITEMS,
  }
}

export function mergeGraphData(current: GraphData, incoming: GraphData): GraphData {
  return {
    nodes: mergeElementsById(current.nodes || [], incoming.nodes || []),
    edges: mergeElementsById(current.edges || [], incoming.edges || []),
  }
}

export function getRequirementRootIds(nodes: NonNullable<GraphData['nodes']>) {
  return Array.from(new Set(
    nodes
      .filter(isRequirementGraphNode)
      .map(node => node.id),
  ))
}

export function buildRootGraphRequest(request: GraphDBGraphRequest, root: string) {
  const rootRequest: GraphDBGraphRequest = { ...request, root }
  delete rootRequest.node_types
  return rootRequest
}

export function buildMergedGraphMeta(
  request: GraphDBGraphRequest,
  discoveryResponse: GraphDBGraphResponse,
  rootResponses: GraphDBGraphResponse[],
  graphData: GraphData,
): GraphDBGraphMeta {
  const responses = [discoveryResponse, ...rootResponses]

  return {
    ...discoveryResponse.meta,
    root: null,
    depth: request.depth ?? DEFAULT_GRAPH_REQUEST.depth ?? 2,
    origin: request.origin ?? DEFAULT_GRAPH_REQUEST.origin ?? 'all',
    nodeCount: graphData.nodes?.length || 0,
    edgeCount: graphData.edges?.length || 0,
    nodeLimit: request.node_limit ?? DEFAULT_GRAPH_REQUEST.node_limit ?? 300,
    edgeLimit: request.edge_limit ?? DEFAULT_GRAPH_REQUEST.edge_limit ?? 1000,
    truncated: responses.some(response => response.meta.truncated),
    propertiesTruncated: responses.some(response => response.meta.propertiesTruncated),
    includeProperties: request.include_properties
      ?? DEFAULT_GRAPH_REQUEST.include_properties
      ?? true,
  }
}

export function filterGraphDataByOrigin(
  graphData: GraphData,
  origin: GraphDBGraphOrigin,
): GraphData {
  if (origin === 'all') return graphData

  return {
    ...graphData,
    edges: (graphData.edges || []).filter((edge) => {
      const data = isRecord(edge.data) ? edge.data : {}
      return data.origin === origin
    }),
  }
}

export function hasGraphSizeChanged(current: GraphData, next: GraphData) {
  return (current.nodes?.length || 0) !== (next.nodes?.length || 0)
    || (current.edges?.length || 0) !== (next.edges?.length || 0)
}

export function getNodeDisplayName(graphData: GraphData, nodeId: string | null) {
  if (!nodeId) return ''

  const node = (graphData.nodes || []).find((item) => item.id === nodeId)
  if (!node) return nodeId

  return getGraphNodeDisplayName(node)
}

export function isMetaTruncated(meta: GraphDBGraphMeta) {
  return meta.truncated || meta.propertiesTruncated
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function isRequirementGraphNode(node: NonNullable<GraphData['nodes']>[number]) {
  const data = isRecord(node.data) ? node.data : {}
  const rdfTypes = Array.isArray(data.rdfTypes) ? data.rdfTypes : []

  return getString(data.type) === 'Requirement'
    || getString(data.typeIri).endsWith('#Requirement')
    || rdfTypes.some(type => getString(type).endsWith('#Requirement'))
}

function mergeElementsById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = [...current]
  const indexById = new Map(current.map((element, index) => [element.id, index]))

  incoming.forEach((element) => {
    const existingIndex = indexById.get(element.id)
    if (existingIndex === undefined) {
      indexById.set(element.id, merged.length)
      merged.push(element)
      return
    }

    merged[existingIndex] = element
  })

  return merged
}

function getGraphNodeDisplayName(node: NonNullable<GraphData['nodes']>[number]) {
  const data = isRecord(node.data) ? node.data : {}
  const style = isRecord(node.style) ? node.style : {}
  return getString(data.name)
    || getString(data.identifier)
    || getString(style.labelText)
    || node.id
}

function getGraphNodeType(node: NonNullable<GraphData['nodes']>[number]) {
  const data = isRecord(node.data) ? node.data : {}
  return getString(data.type)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : ''
}
