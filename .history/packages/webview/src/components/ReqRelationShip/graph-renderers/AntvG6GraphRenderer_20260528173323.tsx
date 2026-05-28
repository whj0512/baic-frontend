import { useEffect, useRef } from 'react'
import { Graph } from '@antv/g6'
import type { GraphOptions } from '@antv/g6'
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
  node: {
    type: 'circle',
    state: {
      active: {
        halo: true,
        haloStroke: '#1677ff',
        haloLineWidth: 6,
        haloOpacity: 0.15,
      },
    },
  },
  edge: {
    state: {
      active: {
        stroke: '#1677ff',
        lineWidth: 3,
      },
    },
  },
}

interface AntvG6GraphRendererProps {
  graphData: G6GraphData
}

function AntvG6GraphRenderer({ graphData }: AntvG6GraphRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const graph = new Graph({ 
      container: container,
    })
    graphRef.current = graph

    return () => {
      graph.destroy()
      graphRef.current = null
    }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    graph.setOptions({
      ...G6_GRAPH_OPTIONS,
      data: graphData,
    })

    graph.render().catch((error) => {
      console.debug('[ReqRelationShip][G6 render error]', error)
    })
  }, [graphData])

  return <div ref={containerRef} className="antv-g6-graph-container" />
}

export default AntvG6GraphRenderer
