import { Button, Select } from 'antd'
import type {
  GraphDBGraphDepth,
  GraphDBGraphOrigin,
} from '../../../models/GraphDBGraph'

export type EdgeLabelMode = 'auto' | 'show' | 'hide'

interface RelationshipGraphToolbarProps {
  depth: GraphDBGraphDepth
  origin: GraphDBGraphOrigin
  edgeLabelMode: EdgeLabelMode
  loading: boolean
  onDepthChange: (depth: GraphDBGraphDepth) => void
  onOriginChange: (origin: GraphDBGraphOrigin) => void
  onEdgeLabelModeChange: (mode: EdgeLabelMode) => void
  onRefresh: () => void
}

const DEPTH_OPTIONS: Array<{ label: string, value: GraphDBGraphDepth }> = [
  { label: '1 跳', value: 1 },
  { label: '2 跳', value: 2 },
  { label: '3 跳', value: 3 },
]

const ORIGIN_OPTIONS: Array<{ label: string, value: GraphDBGraphOrigin }> = [
  { label: '全部关系', value: 'all' },
  { label: '仅显式关系', value: 'explicit' },
  { label: '仅推理关系', value: 'inferred' },
  { label: '显式且推理', value: 'both' },
]

const EDGE_LABEL_OPTIONS: Array<{ label: string, value: EdgeLabelMode }> = [
  { label: '自动', value: 'auto' },
  { label: '始终显示', value: 'show' },
  { label: '始终隐藏', value: 'hide' },
]

function RelationshipGraphToolbar({
  depth,
  origin,
  edgeLabelMode,
  loading,
  onDepthChange,
  onOriginChange,
  onEdgeLabelModeChange,
  onRefresh,
}: RelationshipGraphToolbarProps) {
  return (
    <div className="req-relationship-operation">
      <div className="req-relationship-operation__field">
        <span>展开深度：</span>
        <Select<GraphDBGraphDepth>
          value={depth}
          options={DEPTH_OPTIONS}
          onChange={onDepthChange}
        />
      </div>

      <div className="req-relationship-operation__field">
        <span>关系来源：</span>
        <Select<GraphDBGraphOrigin>
          value={origin}
          options={ORIGIN_OPTIONS}
          onChange={onOriginChange}
        />
      </div>

      <div className="req-relationship-operation__field">
        <span>关系文字：</span>
        <Select<EdgeLabelMode>
          value={edgeLabelMode}
          options={EDGE_LABEL_OPTIONS}
          onChange={onEdgeLabelModeChange}
        />
      </div>

      <Button type="primary" onClick={onRefresh} loading={loading}>
        刷新关系图
      </Button>
    </div>
  )
}

export default RelationshipGraphToolbar
