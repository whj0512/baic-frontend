import { Card } from 'antd'
import AntvG6GraphRenderer from './graph-renderers/AntvG6GraphRenderer'
import EchartsGraphRenderer from './graph-renderers/EchartsGraphRenderer'
import NvlGraphRenderer from './graph-renderers/NvlGraphRenderer'
import type { G6GraphData, RenderMode, NvlGraphData } from './types'

interface RelationshipGraphViewProps {
  renderMode: RenderMode
  echartsOption: object
  nvlGraphData: NvlGraphData
  g6GraphData: G6GraphData
}

function RelationshipGraphView({ renderMode, echartsOption, nvlGraphData, g6GraphData }: RelationshipGraphViewProps) {
  return (
    <Card className="result-card">
      {renderMode === 'echarts' && (
        <EchartsGraphRenderer option={echartsOption} />
      )}
      {renderMode === 'nvl' && (
        <NvlGraphRenderer graphData={nvlGraphData} />
      )}
      {renderMode === 'antv/g6' && (
        <AntvG6GraphRenderer graphData={g6GraphData} />
      )}
    </Card>
  )
}

export default RelationshipGraphView
