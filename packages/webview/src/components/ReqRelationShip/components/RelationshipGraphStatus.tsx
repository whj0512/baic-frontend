import { useState } from 'react'
import { Button } from 'antd'
import { DownOutlined, RightOutlined } from '@ant-design/icons'
import type { GraphLegendData } from '../relationshipGraphModel'

interface RelationshipGraphStatusProps {
  hasMeta: boolean
  nodeCount: number
  edgeCount: number
  focusNode: string | null
  focusNodeName: string
  expandedRootCount: number
  isDenseGraph: boolean
  edgeLabelsVisible: boolean
  isTruncated: boolean
  expandingNodeId: string | null
  expandingNodeName: string
  legendData: GraphLegendData
}

function RelationshipGraphStatus({
  hasMeta,
  nodeCount,
  edgeCount,
  focusNode,
  focusNodeName,
  expandedRootCount,
  isDenseGraph,
  edgeLabelsVisible,
  isTruncated,
  expandingNodeId,
  expandingNodeName,
  legendData,
}: RelationshipGraphStatusProps) {
  return (
    <div className="req-relationship-status">
      <div className="req-relationship-status__metrics">
        {hasMeta ? (
          <>
            <span>节点 <strong>{nodeCount}</strong></span>
            <span>关系 <strong>{edgeCount}</strong></span>
            <span>{focusNode ? `当前中心：${focusNodeName}` : '需求根节点查询并集'}</span>
            <span>已查询根节点 <strong>{expandedRootCount}</strong></span>
          </>
        ) : (
          <span>尚未加载关系图</span>
        )}
        {isDenseGraph && !edgeLabelsVisible ? (
          <span className="req-relationship-status__performance">
            大图模式已隐藏关系文字
          </span>
        ) : null}
        {isTruncated ? (
          <span className="req-relationship-status__warning">
            结果已截断，请降低深度后重试
          </span>
        ) : null}
        <span className="req-relationship-status__expanding" aria-live="polite">
          {expandingNodeId ? `正在展开：${expandingNodeName}` : ''}
        </span>
      </div>
      <GraphLegend data={legendData} />
    </div>
  )
}

function GraphLegend({ data }: { data: GraphLegendData }) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="req-relationship-legend" aria-label="关系图图例">
      <div className="req-relationship-legend__toolbar">
        <Button
          type="text"
          size="small"
          className="req-relationship-legend__toggle"
          icon={collapsed ? <RightOutlined /> : <DownOutlined />}
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展开图例' : '收起图例'}
          onClick={() => setCollapsed(current => !current)}
        >
          图例
        </Button>
        <span className="req-relationship-legend__summary">
          节点类型 {data.nodes.length} · 关系类型 {data.edges.length}
        </span>
        <span className="req-relationship-legend__hint">单击查看属性，双击节点继续展开</span>
      </div>

      {!collapsed ? (
        <div className="req-relationship-legend__content">
          {data.nodes.length > 0 ? (
            <div className="req-relationship-legend__group">
              <span className="req-relationship-legend__heading">节点</span>
              {data.nodes.map(item => (
                <span key={item.label} className="req-relationship-legend__item">
                  <span
                    className="req-relationship-legend__node"
                    style={{
                      backgroundColor: item.color,
                      borderColor: item.stroke || item.color,
                      boxShadow: `0 0 0 1px ${item.stroke || item.color}`,
                    }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}

          {data.edges.length > 0 ? (
            <div className="req-relationship-legend__group">
              <span className="req-relationship-legend__heading">关系</span>
              {data.edges.map(item => (
                <span key={item.label} className="req-relationship-legend__item">
                  <span
                    className="req-relationship-legend__edge"
                    style={{
                      borderColor: item.color,
                      borderTopStyle: item.dashed ? 'dashed' : 'solid',
                    }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default RelationshipGraphStatus
