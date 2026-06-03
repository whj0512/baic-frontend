// internalConstraints 图各节点类型的默认数据

import type { NodeTypeName } from './exportTypes'

// X6 shape 到导出 type_name 的映射
export const shapeToTypeName: Record<string, NodeTypeName> = {
  'start-node': 'start',
  'then-node': 'then',
  'state-node': 'state',
  'condition-node': 'condition',
  'call-node': 'call',
  'comment-node': 'comment',
  'graph-node': 'graph-ref',
  'truth-node': 'truth',
  'goto-node': 'goto',
}
