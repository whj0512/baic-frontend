import { useEffect, useRef } from 'react'
import { Graph } from '@antv/g6'
import type { TraceabilityExtractGraphData } from '../types'
import {
  TRACEABILITY_EXTRACT_LEGEND_PLUGIN_OPTIONS,
  createTraceabilityExtractG6GraphOptions,
  updateTraceabilityExtractZoomOrigin,
} from './traceabilityExtractGraphOptions'

interface TraceabilityExtractGraphRendererProps {
  graphData: TraceabilityExtractGraphData
}

function renderGraphData(graph: Graph, graphData: TraceabilityExtractGraphData) {
  graph.setData(graphData)
  graph.render()
    .then(() => {
      if (!graph.destroyed) {
        graph.updatePlugin(TRACEABILITY_EXTRACT_LEGEND_PLUGIN_OPTIONS)
      }
    })
    .catch((error) => {
      console.debug('[TraceabilityExtract][G6 render error]', error)
    })
}

function observeContainerResize(container: HTMLElement, onResize: () => void) {
  if (typeof ResizeObserver === 'undefined') return null

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)
  return resizeObserver
}

function TraceabilityExtractGraphRenderer({ graphData }: TraceabilityExtractGraphRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.replaceChildren()

    const graph = new Graph({
      container,
      ...createTraceabilityExtractG6GraphOptions(container),
    })
    graphRef.current = graph

    const syncGraphSize = () => {
      const { width, height } = container.getBoundingClientRect()
      if (width <= 0 || height <= 0 || graph.destroyed) return

      graph.resize(width, height)
      updateTraceabilityExtractZoomOrigin(graph, container)
    }
    const resizeObserver = observeContainerResize(container, syncGraphSize)
    const syncGraphSizeFrame = window.requestAnimationFrame(syncGraphSize)

    return () => {
      resizeObserver?.disconnect()
      window.cancelAnimationFrame(syncGraphSizeFrame)
      graph.destroy()
      graphRef.current = null
      container.replaceChildren()
    }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    renderGraphData(graph, graphData)
  }, [graphData])

  return <div ref={containerRef} className="tc-overview-g6-graph" />
}

export default TraceabilityExtractGraphRenderer
