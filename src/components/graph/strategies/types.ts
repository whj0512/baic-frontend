import { Graph } from '@antv/x6'

export interface SidebarItem {
  type: string
  label: string
  shape: string
  color?: string
  defaultAttrs?: Record<string, any>
  render?: React.ReactNode
}

export interface GraphStrategy {
  sidebarItems: SidebarItem[]
  registerNodes?: () => void
}
