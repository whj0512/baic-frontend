import { useEffect, useRef } from 'react'
import { Graph } from '@antv/g6'
import type { TestCaseOverviewGraphData } from '../types'
import {
  TEST_CASE_OVERVIEW_LEGEND_PLUGIN_OPTIONS,
  createTestCaseOverviewG6GraphOptions,
  updateTestCaseOverviewZoomOrigin,
} from './g6GraphOptions'

interface AntvG6GraphRendererProps {
  graphData: TestCaseOverviewGraphData
}

function renderGraphData(graph: Graph, graphData: TestCaseOverviewGraphData) {
  graph.setData(graphData)
  graph.render()
    .then(() => {
      if (!graph.destroyed) {
        graph.updatePlugin(TEST_CASE_OVERVIEW_LEGEND_PLUGIN_OPTIONS)
      }
    })
    .catch((error) => {
      console.debug('[TestCaseOverview][G6 render error]', error)
    })
}

function observeContainerResize(container: HTMLElement, onResize: () => void) {
  if (typeof ResizeObserver === 'undefined') return null

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)
  return resizeObserver
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
      ...createTestCaseOverviewG6GraphOptions(container),
    })
    graphRef.current = graph

    const syncZoomOrigin = () => updateTestCaseOverviewZoomOrigin(graph, container)
    const resizeObserver = observeContainerResize(container, syncZoomOrigin)
    const syncZoomOriginFrame = window.requestAnimationFrame(syncZoomOrigin)

    return () => {
      resizeObserver?.disconnect()
      window.cancelAnimationFrame(syncZoomOriginFrame)
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

export default AntvG6GraphRenderer
