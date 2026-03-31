import React from 'react'

export interface SidebarItem {
  type: string
  label: string
  shape: string
  color?: string
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

// 扩展后的策略类型
export interface GraphStrategy {
  sidebarItems: SidebarItem[]
  registerNodes?: () => void
  // 表单配置
  formConfig?: FormConfig
  // 边规则配置
  edgeRules?: EdgeRules
  // 拖拽面板布局配置
  stencilLayoutOptions?: any
  stencilGraphWidth?: number
  stencilGraphHeight?: number
  stencilGraphPadding?: number
}
