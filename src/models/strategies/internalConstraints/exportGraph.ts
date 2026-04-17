// X6 图数据到导出 JSON 的转换函数

import type { Graph } from '@antv/x6'
import type { ExportGraphJSON, ExportNode, Transition } from './exportTypes'
import { shapeToTypeName } from './defaultData'

// 生成唯一 ID
const generateId = (): string => {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 构建 condition 节点的分支映射
// 返回 { nodeId: { branch_yes: targetId, branch_no: targetId } }
const buildConditionBranchMap = (graph: Graph): Map<string, { branch_yes: string; branch_no: string }> => {
  const branchMap = new Map<string, { branch_yes: string; branch_no: string }>()

  graph.getEdges().forEach(edge => {
    const sourceCell = edge.getSourceCell()
    const targetCell = edge.getTargetCell()
    if (!sourceCell || !targetCell) return

    // 只处理从 condition 节点出发的边
    if (sourceCell.shape !== 'condition-node') return

    const sourceId = sourceCell.id
    const targetId = targetCell.id
    const edgeData = edge.getData() || {}

    // 初始化映射
    if (!branchMap.has(sourceId)) {
      branchMap.set(sourceId, { branch_yes: '', branch_no: '' })
    }

    const branches = branchMap.get(sourceId)!

    // 根据 sourceOutput 判断是 yes 还是 no 分支
    if (edgeData.sourceOutput === 'yes') {
      branches.branch_yes = targetId
    } else if (edgeData.sourceOutput === 'no') {
      branches.branch_no = targetId
    }
  })

  return branchMap
}

// 转换单个节点
const convertNode = (
  nodeData: any,
  nodeId: string,
  shape: string,
  conditionBranches?: { branch_yes: string; branch_no: string }
): ExportNode | null => {
  const typeName = shapeToTypeName[shape]
  if (!typeName) return null

  const baseNode = {
    id: nodeId,
    type_name: typeName,
    desc: nodeData?.nodeName || nodeData?.comment || '',
  }

  switch (typeName) {
    case 'start':
    case 'then':
      return baseNode as ExportNode

    case 'state':
      return {
        ...baseNode,
        pre_think_time: nodeData?.pre_think_time ?? 0,
        post_think_time: nodeData?.post_think_time ?? 0,
        entry_action_list: nodeData?.entry ?? [],
        exit_action_list: nodeData?.exit ?? [],
        during_action_list: nodeData?.during ?? [],
        normal_test_action_list: nodeData?.normal_test_action_list ?? [],
        dynamic_test_action_list: nodeData?.dynamic_test_action_list ?? [],
        forward_propagation: nodeData?.forward_propagation ?? false,
      } as ExportNode

    case 'condition':
      return {
        ...baseNode,
        condition: nodeData?.condition ?? '',
        branch_yes: conditionBranches?.branch_yes ?? '',
        branch_no: conditionBranches?.branch_no ?? '',
        time_tolerance: nodeData?.time_tolerance ?? { type: 'percent', value: 0 },
      } as ExportNode

    case 'call':
      return {
        ...baseNode,
        params_list: nodeData?.params_list ?? [],
        in_list: nodeData?.in_list ?? [],
        return_list: nodeData?.return_list ?? [],
        script: nodeData?.script ?? '',
        enable_inverse: nodeData?.enable_inverse ?? false,
      } as ExportNode

    case 'comment':
      return {
        ...baseNode,
        comment: nodeData?.comment ?? '',
      } as ExportNode

    case 'graph-ref':
      return {
        ...baseNode,
        graph_id: nodeData?.graph?.id ?? '',
        params_list: nodeData?.graph?.params_list ?? [],
        has_return_val: nodeData?.graph?.has_return_val ?? false,
        return_val: nodeData?.graph?.return_val ?? '',
      } as ExportNode

    case 'truth':
      return {
        ...baseNode,
        truthTable: nodeData?.truthTable ?? { header: [], body: [] },
      } as ExportNode

    case 'goto':
      return {
        ...baseNode,
        friend: nodeData?.friend ?? { id: '', name: '' },
      } as ExportNode

    default:
      return baseNode as ExportNode
  }
}

// 转换边为 Transition
const convertEdge = (
  edgeData: any,
  edgeId: string,
  sourceId: string,
  targetId: string
): Transition => {
  return {
    id: edgeId,
    source_node: sourceId,
    target_node: targetId,
    desc: edgeData?.edgeName || '',
    loop_times: edgeData?.loop_times,
    time_tolerance: edgeData?.time_tolerance,
    condition: edgeData?.condition,
  }
}

// 主导出函数：将 X6 Graph 转换为导出 JSON
export const exportGraphToJSON = (
  graph: Graph,
  graphId?: string,
  graphDesc?: string
): ExportGraphJSON => {
  const nodes: ExportNode[] = []
  const transitions: Transition[] = []

  // 先构建 condition 节点的分支映射
  const conditionBranchMap = buildConditionBranchMap(graph)

  // 转换所有节点
  graph.getNodes().forEach(node => {
    const nodeData = node.getData() || {}
    const conditionBranches = conditionBranchMap.get(node.id)
    const converted = convertNode(nodeData, node.id, node.shape, conditionBranches)
    if (converted) {
      nodes.push(converted)
    }
  })

  // 转换所有边
  graph.getEdges().forEach(edge => {
    const edgeData = edge.getData() || {}
    const sourceCell = edge.getSourceCell()
    const targetCell = edge.getTargetCell()
    if (sourceCell && targetCell) {
      const transition = convertEdge(
        edgeData,
        edge.id,
        sourceCell.id,
        targetCell.id
      )
      transitions.push(transition)
    }
  })

  return {
    id: graphId || generateId(),
    desc: graphDesc || '',
    graph_type: 'request',
    nodes,
    transitions,
  }
}

// --- RBG DSL JSON Export ---

// UUID Mapping Helper
const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
const isSpecialPort = (id: string) => ['yes', 'no', 'top1', 'bottom', 'top', 'left', 'right', 'condition'].includes(id)
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const idMap = new Map<string, string>()
const getMappedId = (rawId: string | undefined): string => {
  if (!rawId) return ''
  if (isUUID(rawId)) return rawId
  if (isSpecialPort(rawId)) return rawId
  if (!idMap.has(rawId)) idMap.set(rawId, generateUUID())
  return idMap.get(rawId)!
}

// 转换节点
const convertNodeToRBG = (
  graph: Graph,
  node: any,
  conditionBranches?: { branch_yes: string; branch_no: string }
): any => {
  const nodeData = node.getData() || {}
  const shape = node.shape
  const typeName = shapeToTypeName[shape]
  if (!typeName) return null

  // 获取输入输出边
  const incomingEdges = graph.getIncomingEdges(node) || []
  const outgoingEdges = graph.getOutgoingEdges(node) || []

  const portsProp = node.getProp('ports') || { items: [], groups: {} }

  // RBG JSON base Node
  const baseNode: Record<string, any> = {
    id: node.id,
    desc: nodeData.nodeName || nodeData.comment || nodeData.desc || '',
    type_name: typeName,
    render_config: {
      color: nodeData.color || '#fab7cb',
      visible: true,
      x: node.position().x,
      y: node.position().y,
      width: node.size().width,
      height: node.size().height,
    },
    is_init_node: nodeData.is_init_node || false,
    is_finish_node: nodeData.is_finish_node || false,
    input_transitions: incomingEdges.map((e: any) => getMappedId(e.id)),
    ports: {
      items: (portsProp.items || []).map((p: any) => ({
        group: p.group || 'unknown',
        id: getMappedId(p.id)
      })),
      groups: portsProp.groups || {}
    },
    output_transitions: outgoingEdges.map((e: any) => getMappedId(e.id)),
  }

  // specific types extensions
  switch (typeName) {
    case 'start':
      baseNode.is_init_node = true
      break
    case 'then':
      break
    case 'state':
      baseNode.pre_think_time = nodeData.pre_think_time ?? 0
      baseNode.post_think_time = nodeData.post_think_time ?? 0
      baseNode.entry_action_list = nodeData.entry ?? []
      baseNode.exit_action_list = nodeData.exit ?? []
      baseNode.during_action_list = nodeData.during ?? []
      baseNode.normal_test_action_list = nodeData.normal_test_action_list ?? []
      baseNode.dynamic_test_action_list = nodeData.dynamic_test_action_list ?? []

      baseNode.ref_graph = nodeData.ref_graph ?? null
      baseNode.forward_propagation = nodeData.forward_propagation ?? false
      baseNode.time_props = nodeData.time_props ?? null
      break
    case 'condition':
      baseNode.test_layer = nodeData.test_layer ?? { data: [], is_order: true, is_group: true }
      baseNode.test_coverage = nodeData.test_coverage ?? { is_configured: false }
      baseNode.condition = nodeData.condition ?? ''
      baseNode.branch_yes = conditionBranches?.branch_yes ? getMappedId(conditionBranches.branch_yes) : ''
      baseNode.branch_no = conditionBranches?.branch_no ? getMappedId(conditionBranches.branch_no) : ''
      baseNode.time_tolerance = nodeData.time_tolerance ?? { type: 'percent', value: 0 }
      break
    case 'call':
    case 'graph-ref':
    case 'truth':
    case 'goto':
    case 'comment':
      Object.assign(baseNode, convertNode(nodeData, getMappedId(node.id), shape, undefined))
      baseNode.id = getMappedId(node.id)
      break
  }

  return baseNode
}

const convertEdgeToTransitionRBG = (
  edge: any
): any => {
  const edgeData = edge.getData() || {}

  return {
    id: edge.id,
    desc: edgeData.edgeName || '',
    type_name: 'transition',
    render_config: {
      color: '#CDFFAE',
      visible: true,
      x: 0, y: 0, width: 0, height: 0
    },
    test_layer: edgeData.test_layer ?? { data: [], is_order: true, is_group: true },
    test_coverage: edgeData.test_coverage ?? { is_configured: false },
    condition: edgeData.condition || '',
    action_list: edgeData.action_list ?? [],
    loop_times: edgeData.loop_times ?? 1,
    event_list: edgeData.event_list ?? [],
    source_node: getMappedId(edge.getSourceCellId()),
    target_node: getMappedId(edge.getTargetCellId()),
    source_port_name: getMappedId(edge.getSourcePortId()),
    target_port_name: getMappedId(edge.getTargetPortId()),
    vertices: edge.getVertices() || [],
    time_tolerance: edgeData.time_tolerance ?? { type: 'percent', value: 0 }
  }
}

export const exportGraphToRBG = (
  graph: Graph,
  graphId?: string,
  graphDesc?: string
): any => {
  const nodes: any[] = []
  const transitions: any[] = []
  const conditionBranchMap = buildConditionBranchMap(graph)

  idMap.clear()

  graph.getNodes().forEach(node => {
    const conditionBranches = conditionBranchMap.get(node.id)
    const converted = convertNodeToRBG(graph, node, conditionBranches)
    if (converted) {
      nodes.push(converted)
    }
  })

  graph.getEdges().forEach(edge => {
    const sourceCellId = edge.getSourceCellId()
    const targetCellId = edge.getTargetCellId()
    if (sourceCellId && targetCellId) {
      const transition = convertEdgeToTransitionRBG(edge)
      transitions.push(transition)
    }
  })

  // 处理全局画布数据
  const canvasData = (graph as any).canvasData || {}
  // 取 graphId：如果是空则优先用 canvasData 中的 id，否则创建
  const finalGraphId = graphId || canvasData.id || generateUUID()

  return {
    id: getMappedId(finalGraphId),
    desc: canvasData.desc || '',
    type_name: 'graph',
    test_coverage: canvasData.test_coverage ?? {
      path_coverage: { path_coverage_method: 'All' },
      condition_points_coverage: {
        condition_coverage_method: 'MCDC',
        point_coverage_method: '3-points',
        coverage_type: 'customize'
      }
    },
    h_function: canvasData.h_function || 'none',
    local_variable_list: canvasData.local_variable_list || [],
    variable_action_list: canvasData.variable_action_list || [],
    entry_action_list: canvasData.entry_action_list || [],
    exit_action_list: canvasData.exit_action_list || [],
    nodes: nodes,
    transitions: transitions
  }
}
