import { useEffect, useRef } from 'react'
import { Graph } from '@antv/g6'
import type { ElementDatum, GraphOptions, IElementEvent } from '@antv/g6'
import type { G6GraphData } from '../types'

const G6_GRAPH_OPTIONS: Omit<GraphOptions, 'container' | 'data'> = {
  autoResize: true,
  autoFit: 'view',
  padding: 48,
  zoomRange: [0.2, 4],
  animation: true,
  layout: {
    type: 'force',
    preventOverlap: true,
    nodeSize: 64,
    linkDistance: 180,
  },
  behaviors: [
    { type: 'drag-canvas' },
    { type: 'zoom-canvas' },
    { type: 'drag-element' },
    { type: 'hover-activate' },
  ],
  transforms: [
    {
      type: 'process-parallel-edges',
      mode: 'bundle',
      distance: 28,
    },
  ],
  plugins: [
    {
      type: 'tooltip',
      trigger: 'click',
      enable: canShowDataTooltip,
      getContent: getDataTooltipContent,
      onOpenChange: () => undefined,
    },
  ],
}

function canShowDataTooltip(event: IElementEvent, items: ElementDatum[]) {
  return (event.targetType === 'node' || event.targetType === 'edge') && getElementData(items) !== undefined
}

async function getDataTooltipContent(event: IElementEvent, items: ElementDatum[]) {
  const content = document.createElement('div')
  content.style.maxWidth = '320px'
  content.style.maxHeight = '260px'
  content.style.overflow = 'auto'

  const title = document.createElement('div')
  title.textContent = `${event.targetType} data`
  title.style.marginBottom = '6px'
  title.style.fontWeight = '600'
  title.style.color = '#1f1f1f'

  const payload = document.createElement('pre')
  payload.textContent = stringifyTooltipData(getElementData(items))
  payload.style.margin = '0'
  payload.style.whiteSpace = 'pre-wrap'
  payload.style.wordBreak = 'break-word'
  payload.style.fontSize = '12px'
  payload.style.lineHeight = '1.5'
  payload.style.color = '#333'

  content.append(title, payload)
  return content
}

function getElementData(items: ElementDatum[]) {
  return items[0]?.data
}

function stringifyTooltipData(data: unknown) {
  if (data === undefined) return ''

  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

interface AntvG6GraphRendererProps {
  graphData: G6GraphData
}

function AntvG6GraphRenderer({ graphData }: AntvG6GraphRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.replaceChildren()

    const graph = new Graph({
      container,
      ...G6_GRAPH_OPTIONS,
    })
    graphRef.current = graph

    return () => {
      graph.destroy()
      graphRef.current = null
      container.replaceChildren()
    }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    graph.setData(graphData)
    graph.render().catch((error) => {
      console.debug('[ReqRelationShip][G6 render error]', error)
    })
  }, [graphData])

  return <div ref={containerRef} className="antv-g6-graph-container" />
}

export default AntvG6GraphRenderer
