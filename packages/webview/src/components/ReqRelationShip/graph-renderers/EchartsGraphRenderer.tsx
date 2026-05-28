import ReactECharts from 'echarts-for-react'

interface EchartsGraphRendererProps {
  option: object
}

function EchartsGraphRenderer({ option }: EchartsGraphRendererProps) {
  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', minHeight: '600px', width: '100%' }}
      notMerge={true}
      lazyUpdate={true}
    />
  )
}

export default EchartsGraphRenderer
