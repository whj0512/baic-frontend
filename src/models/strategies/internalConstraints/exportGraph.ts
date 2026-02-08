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
        normal_test_action_list: nodeData?.normal ?? [],
        dynamic_test_action_list: nodeData?.dynamic ?? [],
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
