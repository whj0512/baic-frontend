import { useState } from 'react'
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type {
  GraphDBGraphRequest,
  GraphDBGraphResponse,
} from '../../models/GraphDBGraph'
import RelationshipGraphStatus from './components/RelationshipGraphStatus'
import RelationshipGraphToolbar from './components/RelationshipGraphToolbar'
import type { EdgeLabelMode } from './components/RelationshipGraphToolbar'
import RelationshipGraphViewport from './components/RelationshipGraphViewport'
import { useReqRelationshipGraph } from './useReqRelationshipGraph'

import './ReqRelationShip.css'

interface ReqRelationShipProps {
  onBack?: () => void
  initialRequest?: GraphDBGraphRequest
  initialGraph?: GraphDBGraphResponse
  embedded?: boolean
}

const DENSE_GRAPH_EDGE_LIMIT = 120

function ReqRelationShip({
  onBack,
  initialRequest,
  initialGraph,
  embedded = false,
}: ReqRelationShipProps) {
  const relationshipGraph = useReqRelationshipGraph({
    initialRequest,
    initialGraph,
  })
  const [edgeLabelMode, setEdgeLabelMode] = useState<EdgeLabelMode>('auto')
  const isDenseGraph = relationshipGraph.edgeCount > DENSE_GRAPH_EDGE_LIMIT
  const edgeLabelsVisible = edgeLabelMode === 'show'
    || (edgeLabelMode === 'auto' && !isDenseGraph)
  const hasMeta = relationshipGraph.latestMeta !== null

  return (
    <div
      className={`req-relationship-container${
        embedded ? ' req-relationship-container--embedded' : ''
      }`}
    >
      {!embedded ? (
        <div className="req-relationship-header">
          {onBack ? (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
              className="req-relationship-back-btn"
            >
              返回
            </Button>
          ) : null}
          <h2>需求间关系</h2>
        </div>
      ) : null}

      <RelationshipGraphToolbar
        depth={relationshipGraph.depth}
        origin={relationshipGraph.origin}
        edgeLabelMode={edgeLabelMode}
        loading={relationshipGraph.loading}
        onDepthChange={relationshipGraph.changeDepth}
        onOriginChange={relationshipGraph.changeOrigin}
        onEdgeLabelModeChange={setEdgeLabelMode}
        onRefresh={relationshipGraph.refresh}
      />

      <RelationshipGraphStatus
        hasMeta={hasMeta}
        nodeCount={relationshipGraph.nodeCount}
        edgeCount={relationshipGraph.edgeCount}
        focusNode={relationshipGraph.focusNode}
        focusNodeName={relationshipGraph.focusNodeName}
        expandedRootCount={relationshipGraph.expandedRootCount}
        isDenseGraph={isDenseGraph}
        edgeLabelsVisible={edgeLabelsVisible}
        isTruncated={relationshipGraph.isTruncated}
        expandingNodeId={relationshipGraph.expandingNodeId}
        expandingNodeName={relationshipGraph.expandingNodeName}
        legendData={relationshipGraph.legendData}
      />

      <RelationshipGraphViewport
        graphData={relationshipGraph.graphData}
        visibleEdgeIds={relationshipGraph.visibleEdgeIds}
        edgeLabelsVisible={edgeLabelsVisible}
        focusNode={relationshipGraph.focusNode}
        layoutRevision={relationshipGraph.layoutRevision}
        expandingNodeId={relationshipGraph.expandingNodeId}
        loading={relationshipGraph.loading}
        queryError={relationshipGraph.queryError}
        hasMeta={hasMeta}
        onNodeDoubleClick={relationshipGraph.toggleNodeExpansion}
        onDismissError={relationshipGraph.dismissError}
      />
    </div>
  )
}

export default ReqRelationShip
