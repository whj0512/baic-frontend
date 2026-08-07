import React from 'react'
import type { Cell, Graph, Node } from '@antv/x6'

export interface SidebarItem {
  type: string
  label: string
  shape: string
  color?: string
  tooltip?: string
  defaultAttrs?: Record<string, any>
  render?: React.ReactNode
}

// 依赖条件配置
export interface ControlDependency {
  name: string  // 依赖的字段名
  condition: string | number | boolean | ((value: any) => boolean)  // 条件值或判断函数
  hidden?: boolean  // 条件满足时是否隐藏，默认 false（即条件满足时显示）
}

// 表单控件配置
export interface FormControl {
  label?: string
  name: string
  shape: string  // 控件类型: 'InputText' | 'InputNumber' | 'Checkbox' | 'Select' | 自定义
  extra?: string  // 额外说明文字
  placeholder?: string
  disabled?: boolean
  options?: Array<{ label: string; value: string | number }>  // Select 选项
  hidden?: boolean  // 默认是否隐藏
  dependencies?: ControlDependency[]  // 依赖条件，满足任一条件时改变显示状态
  [key: string]: any  // 其他控件属性
}

// 表单分组
export interface FormGroup {
  title?: string
  controls: FormControl[]
}

// 表单 Tab
export interface FormTab {
  name: string
  groups: FormGroup[]
}

// 表单 Schema
export interface FormSchema {
  tabs: FormTab[]
  controlMap?: Record<string, React.FC<any>>
}

// 节点表单配置
export interface NodeFormConfig {
  schema: FormSchema
  // 可选：自定义控件映射
  controlMap?: Record<string, React.FC<any>>
}

// 表单配置（按目标类型）
export interface FormConfig {
  // 画布表单
  canvas?: FormSchema
  // 边表单
  edge?: FormSchema
  // 节点表单（按 shape 名称映射）
  nodes: Record<string, NodeFormConfig>
}

// 边规则配置（基于 Port）
export interface EdgeRules {
  // 获取节点的 port group 配置
  getPortGroups?: (nodeShape: string) => Record<string, any>
  // 获取节点的初始 ports
  getInitialPorts?: (nodeShape: string) => any[]
  // 节点是否支持动态添加多个 port
  supportsMultiplePorts?: (nodeShape: string) => boolean
  // 判断起始节点是否有多个命名输出（如 condition 的 yes/no）
  hasMultipleOutputs?: (nodeId: string, nodeShape: string) => boolean
  // 获取命名输出选项
  getOutputOptions?: (nodeId: string, nodeShape: string) => Array<{ value: string; label: string }>
}

// 连线模式
// 'sequence': 时序图模式，按坐标连线，支持 offsetY 防重叠、自动 label 等
// 'direct'  : 直连节点模式，使用普通 source/target cell 连线，支持 orth router
export type EdgeMode = 'sequence' | 'direct'

export interface PreConnectionRules {
  maxDistance?: number
  canUseSource?: (node: Node) => boolean
  canUseTarget?: (node: Node) => boolean
}

export interface SequenceConnectionConfig {
  participantShapes: string[]
}

// 扩展后的策略类型
export interface GraphStrategy {
  sidebarItems: SidebarItem[]
  registerNodes?: () => void
  // 在图初始化或重新加载数据后补齐该类型图所需的节点
  ensureRequiredNodes?: (graph: Graph) => void
  // 节点进入画布后的策略级初始化（不用于服务端数据导入前的转换）
  initializeNode?: (node: Node, graph: Graph) => void
  // 规则连线完成后规范化业务数据
  finalizeEdgeData?: (edgeData: Record<string, any>, source: Node, target: Node, graph: Graph) => Record<string, any>
  // 策略级单元保护，供菜单和键盘操作共同使用
  canRemoveCell?: (cell: Cell) => boolean
  canCopyCell?: (cell: Cell) => boolean
  // 表单配置
  formConfig?: FormConfig
  // 边规则配置（基于 Port 的连线，优先级最高）
  edgeRules?: EdgeRules
  // 节点拖入或移动时的预连线规则
  preConnectionRules?: PreConnectionRules
  // 时序图从生命线拖拽生成消息线的规则
  sequenceConnection?: SequenceConnectionConfig
  // 无 edgeRules 时的连线模式，默认 'direct'
  // 'sequence' 专用于时序图的坐标连线逻辑
  edgeMode?: EdgeMode
  // 边默认起点箭头类型
  defaultSourceMarker?: string | Record<string, any> | null
  // 边默认箭头类型
  defaultEdgeMarker?: string | Record<string, any> | null
  // 边默认业务数据
  getDefaultEdgeData?: () => Record<string, any>
  // 拖拽面板布局配置
  stencilLayoutOptions?: any
  stencilGraphWidth?: number
  stencilGraphHeight?: number
  stencilGraphPadding?: number
}
