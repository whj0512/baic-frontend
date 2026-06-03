import { useCallback, useEffect, useRef, useState } from 'react'
import { Graph } from '@antv/g6'
import type { IPointerEvent } from '@antv/g6'
import type { G6GraphData } from '../types'
import G6PropertiesPanel, { createPanelData } from './G6PropertiesPanel'
import type { GraphElementPanelData } from './G6PropertiesPanel'
import {
  G6_LEGEND_PLUGIN_OPTIONS,
  createG6GraphOptions,
  updateZoomCanvasOrigin,
} from './g6GraphOptions'

interface AntvG6GraphRendererProps {
  graphData: G6GraphData
}

function renderGraphData(graph: Graph, graphData: G6GraphData) {
  graph.setData(graphData)
  graph.render()
    .then(() => {
      if (!graph.destroyed) {
        graph.updatePlugin(G6_LEGEND_PLUGIN_OPTIONS)
      }
    })
    .catch((error) => {
      console.debug('[ReqRelationShip][G6 render error]', error)
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
  const [panelData, setPanelData] = useState<GraphElementPanelData | null>(null)

  const handleElementClick = useCallback((event: IPointerEvent) => {
    if (event.targetType !== 'node' && event.targetType !== 'edge') {
      setPanelData(null)
      return
    }

    const targetId = 'id' in event.target && typeof event.target.id === 'string' ? event.target.id : undefined
    const graph = graphRef.current
    if (!targetId || !graph || graph.destroyed) {
      setPanelData(null)
      return
    }

    const datum = graph.getElementData(targetId)
    if (!datum) {
      setPanelData(null)
      return
    }

    setPanelData(createPanelData(event.targetType, datum))
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.replaceChildren()

    const graph = new Graph({
      container,
      ...createG6GraphOptions(container, handleElementClick),
    })
    graphRef.current = graph

    const syncZoomOrigin = () => updateZoomCanvasOrigin(graph, container)
    const resizeObserver = observeContainerResize(container, syncZoomOrigin)
    const syncZoomOriginFrame = window.requestAnimationFrame(syncZoomOrigin)

    return () => {
      resizeObserver?.disconnect()
      window.cancelAnimationFrame(syncZoomOriginFrame)
      graph.destroy()
      graphRef.current = null
      container.replaceChildren()
    }
  }, [handleElementClick])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    setPanelData(null)
    renderGraphData(graph, graphData)
  }, [graphData])

  return (
    <div className="antv-g6-graph-layout">
      <div ref={containerRef} className="antv-g6-graph-container" />
      <G6PropertiesPanel panelData={panelData} />
    </div>
  )
}

export default AntvG6GraphRenderer
