interface RenderConfig {
  x?: unknown
  y?: unknown
  width?: unknown
  height?: unknown
  color?: unknown
  fill?: unknown
  stroke?: unknown
  visible?: unknown
}

interface TestCaseNode {
  id?: unknown
  type_name?: unknown
  desc?: unknown
  name?: unknown
  render_config?: RenderConfig
  ports?: {
    items?: unknown
  }
  [key: string]: unknown
}

interface TestCaseTransition {
  id?: unknown
  source_node?: unknown
  target_node?: unknown
  sourcePort?: unknown
  targetPort?: unknown
  source_port_name?: unknown
  target_port_name?: unknown
  vertices?: unknown
  [key: string]: unknown
}

interface TestCaseGraph {
  nodes?: unknown
  transitions?: unknown
}

interface X6PortItem {
  id: string
  group: 'in' | 'out'
}

type ActionType = 'assignment' | 'expect' | 'send'

const FALLBACK_X = 80
const FALLBACK_Y = 80
const FALLBACK_NODE_GAP = 120

const typeNameToShape: Record<string, string> = {
  assignment: 'assginment-node',
  assginment: 'assginment-node',
  executable: 'executable-node',
  loop: 'loop-node',
  traverse: 'traverse-node',
  branch: 'branch-node',
  'sub-branch': 'sub-branch-node',
  subbranch: 'sub-branch-node',
  start: 'start-node',
}

const defaultNodeSize: Record<string, { width: number; height: number }> = {
  'assginment-node': { width: 100, height: 60 },
  'executable-node': { width: 100, height: 60 },
  'loop-node': { width: 100, height: 60 },
  'traverse-node': { width: 100, height: 60 },
  'branch-node': { width: 100, height: 60 },
  'sub-branch-node': { width: 80, height: 40 },
  'start-node': { width: 30, height: 30 },
}

const portGroups = {
  in: {
    position: 'top',
    attrs: {
      circle: {
        r: 4,
        magnet: true,
        stroke: '#1890ff',
        fill: '#fff',
        strokeWidth: 1,
      },
    },
  },
  out: {
    position: 'bottom',
    attrs: {
      circle: {
        r: 4,
        magnet: true,
        stroke: '#1890ff',
        fill: '#fff',
        strokeWidth: 1,
      },
    },
  },
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const asNonEmptyString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value : null
)

const asFiniteNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
)

const asPositiveNumber = (value: unknown): number | null => {
  const number = asFiniteNumber(value)
  return number !== null && number > 0 ? number : null
}

const normalizeTypeName = (value: string) => {
  const normalized = value.trim().toLowerCase().replaceAll('_', '-')
  return normalized === 'subbranch' ? 'sub-branch' : normalized
}

const normalizePortGroup = (value: unknown): 'in' | 'out' | null => {
  if (value === 'top' || value === 'in') return 'in'
  if (value === 'bottom' || value === 'out') return 'out'
  return null
}

const getDefaultActionSymbol = (actionType: ActionType) => (
  actionType === 'expect' ? '==' : '='
)

const parseActionExpression = (express: string, actionType: ActionType) => {
  const functionMatch = express.match(/^\s*([^=><(]+?)\s*\((.*)\)\s*$/)
  if (functionMatch) {
    return {
      name: functionMatch[1]?.trim() ?? '',
      symbol: '()',
      value: functionMatch[2]?.trim() ?? '',
      isStandard: true,
    }
  }

  const operators = ['not in', '>=', '<=', '==', '!=', '>', '<', '=', 'in']
  const operatorPattern = operators
    .map((operator) => operator
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+'))
    .join('|')
  const match = express.match(new RegExp(`^\\s*(.*?)\\s*(${operatorPattern})\\s*(.*?)\\s*$`))

  if (!match) {
    return {
      name: '',
      symbol: '',
      value: '',
      isStandard: false,
    }
  }

  return {
    name: match[1]?.trim() ?? '',
    symbol: match[2]?.trim() ?? getDefaultActionSymbol(actionType),
    value: match[3]?.trim() ?? '',
    isStandard: true,
  }
}

const convertAction = (
  value: unknown,
  actionType: ActionType,
  nodeId: string,
  index: number,
) => {
  const source = typeof value === 'string'
    ? { express: value }
    : (isRecord(value) ? value : {})
  const express = typeof source.express === 'string' ? source.express : ''
  const parsed = express
    ? parseActionExpression(express, actionType)
    : {
        name: '',
        symbol: getDefaultActionSymbol(actionType),
        value: '',
        isStandard: true,
      }
  const name = typeof source.name === 'string' ? source.name : parsed.name
  const symbol = typeof source.symbol === 'string' ? source.symbol : parsed.symbol
  const actionValue = typeof source.value === 'string' ? source.value : parsed.value
  const isStandard = typeof source.isStandard === 'boolean'
    ? source.isStandard
    : express
      ? parsed.isStandard
      : true

  return {
    ...source,
    id: asNonEmptyString(source.id) ?? `${nodeId}-${actionType}-${index}`,
    name,
    symbol,
    value: actionValue,
    isStandard,
    express,
    pre_think_time: asFiniteNumber(source.pre_think_time) ?? 0,
    post_think_time: asFiniteNumber(source.post_think_time) ?? 0,
    type: asNonEmptyString(source.type) ?? 'action',
  }
}

const convertNodeActions = (node: TestCaseNode, nodeId: string) => {
  return (['assignment', 'expect', 'send'] as const).reduce<Record<string, unknown>>(
    (result, actionType) => {
      const actions = node[actionType]
      if (Array.isArray(actions)) {
        result[actionType] = actions.map((action, index) => (
          convertAction(action, actionType, nodeId, index)
        ))
      }
      return result
    },
    {},
  )
}

const convertPorts = (node: TestCaseNode): X6PortItem[] => {
  const rawItems = node.ports?.items
  if (!Array.isArray(rawItems)) return []

  const portIds = new Set<string>()
  const items: X6PortItem[] = []

  rawItems.forEach(rawItem => {
    if (!isRecord(rawItem)) return

    const id = asNonEmptyString(rawItem.id)
    const group = normalizePortGroup(rawItem.group)
    if (!id || !group || portIds.has(id)) return

    portIds.add(id)
    items.push({ id, group })
  })

  return items
}

const convertNode = (node: TestCaseNode, index: number) => {
  const id = asNonEmptyString(node.id)
  const rawTypeName = asNonEmptyString(node.type_name)
  if (!id || !rawTypeName) return null

  const typeName = normalizeTypeName(rawTypeName)
  const shape = typeNameToShape[typeName]
  if (!shape) return null

  const renderConfig = isRecord(node.render_config) ? node.render_config : {}
  const configuredX = asFiniteNumber(renderConfig.x)
  const configuredY = asFiniteNumber(renderConfig.y)
  const hasConfiguredPosition = configuredX !== null && configuredY !== null
  const defaultSize = defaultNodeSize[shape]
  const nodeName = asNonEmptyString(node.desc)
    ?? asNonEmptyString(node.name)
    ?? typeName
  const fill = asNonEmptyString(renderConfig.fill)
    ?? asNonEmptyString(renderConfig.color)
    ?? (shape === 'start-node' ? '#686666' : '#fff')
  const stroke = asNonEmptyString(renderConfig.stroke) ?? '#333'

  return {
    id,
    shape,
    x: hasConfiguredPosition ? configuredX : FALLBACK_X,
    y: hasConfiguredPosition ? configuredY : FALLBACK_Y + index * FALLBACK_NODE_GAP,
    width: asPositiveNumber(renderConfig.width) ?? defaultSize.width,
    height: asPositiveNumber(renderConfig.height) ?? defaultSize.height,
    visible: renderConfig.visible !== false,
    data: {
      ...node,
      ...convertNodeActions(node, id),
      nodeName,
      renderKey: typeName,
      stroke,
      fill,
    },
    ports: {
      groups: portGroups,
      items: convertPorts(node),
    },
  }
}

const convertEdge = (
  transition: TestCaseTransition,
  index: number,
  nodeIds: Set<string>,
) => {
  const sourceNode = asNonEmptyString(transition.source_node)
  const targetNode = asNonEmptyString(transition.target_node)
  if (!sourceNode || !targetNode || !nodeIds.has(sourceNode) || !nodeIds.has(targetNode)) {
    return null
  }

  const sourcePort = asNonEmptyString(transition.sourcePort)
    ?? asNonEmptyString(transition.source_port_name)
  const targetPort = asNonEmptyString(transition.targetPort)
    ?? asNonEmptyString(transition.target_port_name)
  const id = asNonEmptyString(transition.id) ?? `testcase-edge-${index}`

  return {
    id,
    shape: 'edge',
    source: sourcePort ? { cell: sourceNode, port: sourcePort } : { cell: sourceNode },
    target: targetPort ? { cell: targetNode, port: targetPort } : { cell: targetNode },
    vertices: Array.isArray(transition.vertices) ? transition.vertices : [],
    data: { ...transition },
  }
}

export const importGraphFromJSON = (jsonString: string) => {
  const parsed: unknown = JSON.parse(jsonString)
  if (!isRecord(parsed)) {
    throw new Error('测试用例 test_content 必须是 JSON 对象')
  }

  const graph = parsed as TestCaseGraph
  if (!Array.isArray(graph.nodes)) {
    throw new Error('测试用例 test_content 缺少 nodes 数组')
  }

  const nodes = graph.nodes
    .map((node, index) => isRecord(node) ? convertNode(node as TestCaseNode, index) : null)
    .filter((node): node is NonNullable<typeof node> => node !== null)

  if (graph.nodes.length > 0 && nodes.length === 0) {
    throw new Error('测试用例不包含 testcaseView 支持的节点类型')
  }

  const nodeIds = new Set(nodes.map(node => node.id))
  const transitions = Array.isArray(graph.transitions) ? graph.transitions : []
  const edges = transitions
    .map((transition, index) => (
      isRecord(transition)
        ? convertEdge(transition as TestCaseTransition, index, nodeIds)
        : null
    ))
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null)

  return {
    cells: [...nodes, ...edges],
  }
}

export default importGraphFromJSON
