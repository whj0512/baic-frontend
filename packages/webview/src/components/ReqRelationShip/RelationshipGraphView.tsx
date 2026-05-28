import { useCallback, useMemo, useRef } from 'react'
import { Card } from 'antd'
import ReactECharts from 'echarts-for-react'
import { InteractiveNvlWrapper } from '@neo4j-nvl/react'
import type { InteractionOptions, MouseEventCallbacks } from '@neo4j-nvl/react'
import type { RenderMode, NvlGraphData } from './types'

const NVL_OPTIONS = {
  disableTelemetry: true,
  disableWebWorkers: true,
  initialZoom: 1,
}

const NVL_INTERACTION_OPTIONS: InteractionOptions = {
  drawShadowOnHover: true,
}

type NvlHoverCallback = Extract<MouseEventCallbacks['onHover'], (...args: any[]) => void>
type NvlHoverElement = Parameters<NvlHoverCallback>[0] & {
  properties?: Record<string, unknown>
}

interface RelationshipGraphViewProps {
  renderMode: RenderMode
  echartsOption: object
  nvlGraphData: NvlGraphData
}

function RelationshipGraphView({ renderMode, echartsOption, nvlGraphData }: RelationshipGraphViewProps) {
  const hoveredElementKeyRef = useRef<string | null>(null)

  const handleNvlHover = useCallback<NvlHoverCallback>((element) => {
    const hoverElement = element as NvlHoverElement | undefined
    const hoverKey = getNvlHoverKey(hoverElement)
    if (hoveredElementKeyRef.current === hoverKey) return

    hoveredElementKeyRef.current = hoverKey
    if (!hoverElement) return

    const isRelationship = isNvlRelationship(hoverElement)
    console.debug('[ReqRelationShip][NVL hover]', {
      type: isRelationship ? 'relationship' : 'node',
      id: hoverElement.id,
      caption: hoverElement.caption,
      from: isRelationship ? hoverElement.from : undefined,
      to: isRelationship ? hoverElement.to : undefined,
      properties: hoverElement.properties,
    })
  }, [])

  const nvlMouseEventCallbacks = useMemo<MouseEventCallbacks>(() => ({
    onHover: handleNvlHover,
  }), [handleNvlHover])

  return (
    <Card className="result-card">
      {renderMode === 'echarts' ? (
        <ReactECharts
          option={echartsOption}
          style={{ height: '100%', minHeight: '600px', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
        />
      ) : (
        <div className="nvl-graph-container">
          <InteractiveNvlWrapper
            nodes={nvlGraphData.nodes}
            rels={nvlGraphData.rels}
            layout="forceDirected"
            nvlOptions={NVL_OPTIONS}
            interactionOptions={NVL_INTERACTION_OPTIONS}
            mouseEventCallbacks={nvlMouseEventCallbacks}
          />
        </div>
      )}
    </Card>
  )
}

function getNvlHoverKey(element?: NvlHoverElement | null) {
  if (!element) return null

  return `${isNvlRelationship(element) ? 'relationship' : 'node'}:${element.id}`
}

function isNvlRelationship(element: NvlHoverElement): element is NvlHoverElement & { from: string; to: string } {
  return 'from' in element && 'to' in element
}

export default RelationshipGraphView
