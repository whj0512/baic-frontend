// 将 dsl-to-rbg API 返回的 JSON 转换为 X6 图数据格式

import type { NodeTypeName } from './exportTypes'

// API 返回的节点渲染配置
interface RenderConfig {
  x: number
  y: number
  width?: number
  height?: number
  color?: string
  visible?: boolean
}

// API 返回的节点数据
interface ApiNode {
  id: string
  type_name: string
  desc?: string
  render_config: RenderConfig
  // State 节点属性
  pre_think_time?: number
  post_think_time?: number
  entry_action_list?: any[]
  exit_action_list?: any[]
  during_action_list?: any[]
  normal_test_action_list?: any[]
  dynamic_test_action_list?: any[]
  forward_propagation?: boolean
  // Condition 节点属性
  condition?: string
  time_tolerance?: any
  // Call 节点属性
  params_list?: any[]
  in_list?: string[]
  return_list?: string[]
  script?: string
  enable_inverse?: boolean
  // Comment 节点属性
  comment?: string
  // Graph-ref 节点属性
  graph_id?: string
  has_return_val?: boolean
  return_val?: string
  // Truth 节点属性
  truthTable?: any
  // Goto 节点属性
  friend?: { id: string; name: string }
}

// API 返回的边数据
interface ApiTransition {
  id: string
  source_node: string
  target_node: string
  sourcePort?: string
  targetPort?: string
  desc?: string
  condition?: string
  loop_times?: number
  time_tolerance?: any
  action_list?: any[]
  event_list?: any[]
  test_layer?: any
  test_coverage?: any
}

// API 返回的图数据
interface ApiGraphData {
  id: string
  desc?: string
  graph_type?: string
  nodes: ApiNode[]
  transitions: ApiTransition[]
}

// type_name 到 X6 shape 的映射
const typeNameToShape: Record<string, string> = {
  'start': 'start-node',
  'then': 'then-node',
  'state': 'state-node',
  'condition': 'condition-node',
  'call': 'call-node',
  'comment': 'comment-node',
  'graph-ref': 'graph-node',
  'truth': 'truth-node',
  'goto': 'goto-node',
}

// 节点默认尺寸
const defaultNodeSize: Record<string, { width: number; height: number }> = {
  'start-node': { width: 30, height: 30 },
  'then-node': { width: 30, height: 30 },
  'state-node': { width: 120, height: 80 },
  'condition-node': { width: 120, height: 80 },
  'call-node': { width: 120, height: 60 },
  'comment-node': { width: 120, height: 60 },
  'graph-node': { width: 120, height: 60 },
  'truth-node': { width: 120, height: 60 },
  'goto-node': { width: 120, height: 60 },
}

// 节点默认样式
const defaultNodeStyle: Record<string, { stroke: string; fill: string }> = {
  'start-node': { stroke: '#333', fill: '#686666' },
  'then-node': { stroke: '#333', fill: '#fff' },
  'state-node': { stroke: '#333', fill: '#fff' },
  'condition-node': { stroke: '#333', fill: '#fff' },
  'call-node': { stroke: '#1890ff', fill: '#e6f7ff' },
  'comment-node': { stroke: '#1890ff', fill: '#e6f7ff' },
  'graph-node': { stroke: '#1890ff', fill: '#e6f7ff' },
  'truth-node': { stroke: '#1890ff', fill: '#e6f7ff' },
  'goto-node': { stroke: '#333', fill: '#fff' },
}

/**
 * 将 API 节点转换为 X6 节点数据
 */
const convertNode = (apiNode: ApiNode): any => {
  const shape = typeNameToShape[apiNode.type_name] || 'custom-rect-node'
  const defaultSize = defaultNodeSize[shape] || { width: 120, height: 60 }
  const defaultStyle = defaultNodeStyle[shape] || { stroke: '#333', fill: '#fff' }

  // 基础节点数据
  const nodeData: any = {
    nodeName: apiNode.desc || apiNode.type_name,
    ...defaultStyle,
  }

  // 根据节点类型添加特定属性
  switch (apiNode.type_name) {
    case 'state':
      nodeData.pre_think_time = apiNode.pre_think_time ?? 0
      nodeData.post_think_time = apiNode.post_think_time ?? 0
      nodeData.entry_action_list = apiNode.entry_action_list ?? []
      nodeData.exit_action_list = apiNode.exit_action_list ?? []
      nodeData.during_action_list = apiNode.during_action_list ?? []
      nodeData.normal_test_action_list = apiNode.normal_test_action_list ?? []
      nodeData.dynamic_test_action_list = apiNode.dynamic_test_action_list ?? []
      nodeData.forward_propagation = apiNode.forward_propagation ?? false
      break

    case 'condition':
      nodeData.condition = apiNode.condition ?? ''
      nodeData.time_tolerance = apiNode.time_tolerance
      break

    case 'call':
      nodeData.params_list = apiNode.params_list ?? []
      nodeData.in_list = apiNode.in_list ?? []
      nodeData.return_list = apiNode.return_list ?? []
      nodeData.script = apiNode.script ?? ''
      nodeData.enable_inverse = apiNode.enable_inverse ?? false
      break

    case 'comment':
      nodeData.comment = apiNode.comment ?? ''
      break

    case 'graph-ref':
      nodeData.graph_id = apiNode.graph_id ?? ''
      nodeData.params_list = apiNode.params_list ?? []
      nodeData.has_return_val = apiNode.has_return_val ?? false
      nodeData.return_val = apiNode.return_val ?? ''
      break

    case 'truth':
      nodeData.truthTable = apiNode.truthTable
      break

    case 'goto':
      nodeData.friend = apiNode.friend ?? { id: '', name: '' }
      break
  }

  return {
    id: apiNode.id,
    shape,
    x: apiNode.render_config?.x ?? 100,
    y: apiNode.render_config?.y ?? 100,
    width: defaultSize.width,
    height: defaultSize.height,
    data: nodeData,
  }
}

/**
 * 将 API 边转换为 X6 边数据
 */
const convertEdge = (apiTransition: ApiTransition): any => {
  const edgeData: any = {
    edgeName: apiTransition.desc || '',
    condition: apiTransition.condition ?? '',
    loop_times: apiTransition.loop_times ?? 0,
    time_tolerance: apiTransition.time_tolerance,
    action_list: apiTransition.action_list ?? [],
    event_list: apiTransition.event_list ?? [],
    test_layer: apiTransition.test_layer,
    test_coverage: apiTransition.test_coverage,
  }

  return {
    id: apiTransition.id,
    shape: 'edge',
    source: apiTransition.source_node,
    target: apiTransition.target_node,
    attrs: {
      line: {
        stroke: '#1890ff',
        strokeWidth: 2,
        targetMarker: {
          name: 'block',
          width: 12,
          height: 8,
        },
      },
    },
    router: {
      name: 'orth',
    },
    connector: {
      name: 'rounded',
      args: { radius: 8 },
    },
    data: edgeData,
  }
}

/**
 * 将 dsl-to-rbg API 返回的 JSON 字符串解析为 X6 图数据格式
 * @param jsonString API 返回的 JSON 字符串
 * @returns X6 图数据格式 { cells: [...] }
 */
export const importGraphFromJSON = (jsonString: string): any => {
  const apiData: ApiGraphData = JSON.parse(jsonString)

  const cells: any[] = []

  // 转换节点
  if (apiData.nodes && Array.isArray(apiData.nodes)) {
    apiData.nodes.forEach(node => {
      cells.push(convertNode(node))
    })
  }

  // 转换边
  if (apiData.transitions && Array.isArray(apiData.transitions)) {
    apiData.transitions.forEach(transition => {
      cells.push(convertEdge(transition))
    })
  }

  return { cells }
}

export default importGraphFromJSON
