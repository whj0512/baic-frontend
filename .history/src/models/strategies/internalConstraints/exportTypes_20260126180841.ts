// internalConstraints 图导出 JSON 的类型定义 - 基于 helps/models.md

// 时间偏差配置
export interface TimeTolerance {
  type: 'percent' | 'absolute'
  value: number
}

// 动作项
export interface ActionItem {
  type: string
  params?: Record<string, any>
}

// 真值表目标节点
export interface TruthTableTargetNode {
  id: string
  name: string
}

// 真值表行
export interface TruthTableRow {
  targetNode: TruthTableTargetNode
  list: boolean[]
}

// 真值表
export interface TruthTable {
  header: string[]
  body: TruthTableRow[]
}

// Goto 节点的 friend 字段
export interface GotoFriend {
  id: string
  name: string
}

// 参数项
export interface ParamItem {
  label: string
  value: string
}

// 基础节点类型
export type NodeTypeName =
  | 'start'
  | 'then'
  | 'state'
  | 'condition'
  | 'call'
  | 'comment'
  | 'graph-ref'
  | 'truth'
  | 'goto'

// 基础节点接口
export interface BaseNode {
  id: string
  type_name: NodeTypeName
  desc: string
}

// Start 节点
export interface StartNode extends BaseNode {
  type_name: 'start'
}

// Then 节点
export interface ThenNode extends BaseNode {
  type_name: 'then'
}

// State 节点
export interface StateNode extends BaseNode {
  type_name: 'state'
  post_think_time: number
  forward_propagation: boolean
  normal_test_action_list: ActionItem[]
  dynamic_test_action_list: ActionItem[]
}

// Condition 节点
export interface ConditionNode extends BaseNode {
  type_name: 'condition'
  condition: string
  branch_yes: string
  branch_no: string
  time_tolerance: TimeTolerance
}

// Call 节点
export interface CallNode extends BaseNode {
  type_name: 'call'
  params_list: ParamItem[]
  script: string
  enable_inverse: boolean
}

// Comment 节点
export interface CommentNode extends BaseNode {
  type_name: 'comment'
  comment: string
}

// Graph-ref 节点
export interface GraphRefNode extends BaseNode {
  type_name: 'graph-ref'
  graph_id: string
  params_list: ParamItem[]
}

// Truth 节点
export interface TruthNode extends BaseNode {
  type_name: 'truth'
  truthTable: TruthTable
}

// Goto 节点
export interface GotoNode extends BaseNode {
  type_name: 'goto'
  friend: GotoFriend
}

// 所有节点类型的联合
export type ExportNode =
  | StartNode
  | ThenNode
  | StateNode
  | ConditionNode
  | CallNode
  | CommentNode
  | GraphRefNode
  | TruthNode
  | GotoNode

// 迁移（边）
export interface Transition {
  id: string
  source_node: string
  target_node: string
  desc?: string
  loop_times?: number
  time_tolerance?: TimeTolerance
  condition?: string
}

// 导出的图 JSON 结构
export interface ExportGraphJSON {
  id: string
  desc?: string
  graph_type?: 'request' | 'testcase'
  nodes: ExportNode[]
  transitions: Transition[]
}
