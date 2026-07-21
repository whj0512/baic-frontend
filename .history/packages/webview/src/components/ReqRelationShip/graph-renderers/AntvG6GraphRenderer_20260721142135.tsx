import { useCallback, useEffect, useRef, useState } from 'react'
import { Graph } from '@antv/g6'
import type { GraphData, IPointerEvent } from '@antv/g6'
import G6PropertiesPanel, { createPanelData } from './G6PropertiesPanel'
import type { GraphElementPanelData } from './G6PropertiesPanel'
import {
  createG6GraphOptions,
  createG6RadialLayoutOptions,
  updateZoomCanvasOrigin,
} from './g6GraphOptions'

interface AntvG6GraphRendererProps {
  graphData: GraphData
  edgeLabelsVisible: boolean
  focusNode: string | null
  onRenderStateChange?: (rendering: boolean) => void
}

function observeContainerResize(container: HTMLElement, onResize: () => void) {
  if (typeof ResizeObserver === 'undefined') return null

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)
  return resizeObserver
}

function AntvG6GraphRenderer({
  graphData,
  edgeLabelsVisible,
  focusNode,
  onRenderStateChange,
}: AntvG6GraphRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const graphDataRef = useRef(graphData)
  const edgeLabelsVisibleRef = useRef(edgeLabelsVisible)
  const focusNodeRef = useRef(focusNode)
  const appliedEdgeLabelsVisibleRef = useRef(edgeLabelsVisible)
  const renderFrameRef = useRef<number | null>(null)
  const renderSequenceRef = useRef(0)
  const layoutInProgressRef = useRef(false)
  const [panelData, setPanelData] = useState<GraphElementPanelData | null>(null)

  graphDataRef.current = graphData
  edgeLabelsVisibleRef.current = edgeLabelsVisible
  focusNodeRef.current = focusNode

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

  const renderGraphData = useCallback((graph: Graph, nextGraphData: GraphData) => {
    if (renderFrameRef.current !== null) {
      window.cancelAnimationFrame(renderFrameRef.current)
    }
    // graph.stopLayout()

    const renderSequence = renderSequenceRef.current + 1
    renderSequenceRef.current = renderSequence
    layoutInProgressRef.current = true
    onRenderStateChange?.(true)

    // 先显示 loading 遮罩，再执行 G6 内置 Radial 布局。
    renderFrameRef.current = window.requestAnimationFrame(() => {
      renderFrameRef.current = null
      if (graph.destroyed || renderSequence !== renderSequenceRef.current) return

      const labelsVisible = edgeLabelsVisibleRef.current
      graph.setLayout(createG6RadialLayoutOptions(focusNodeRef.current))
      graph.setData(applyEdgeLabelVisibility(nextGraphData, labelsVisible))
      appliedEdgeLabelsVisibleRef.current = labelsVisible

      graph.render()
        .then(async () => {
          if (graph.destroyed || renderSequence !== renderSequenceRef.current) return

          if (appliedEdgeLabelsVisibleRef.current !== edgeLabelsVisibleRef.current) {
            await updateEdgeLabelVisibility(graph, edgeLabelsVisibleRef.current)
            appliedEdgeLabelsVisibleRef.current = edgeLabelsVisibleRef.current
          }
        })
        .catch((error) => {
          console.debug('[ReqRelationShip][G6 radial render error]', error)
        })
        .finally(() => {
          if (renderSequence === renderSequenceRef.current) {
            layoutInProgressRef.current = false
            onRenderStateChange?.(false)
          }
        })
    })
  }, [onRenderStateChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let resizeObserver: ResizeObserver | null = null
    let syncZoomOriginFrame: number | null = null

    // 延迟初始化可跳过 React StrictMode 的首次探测挂载，避免完整创建并销毁两次 G6。
    const initializeTimer = window.setTimeout(() => {
      container.replaceChildren()

      const graph = new Graph({
        container,
        ...createG6GraphOptions(container, handleElementClick),
      })
      graphRef.current = graph

      const syncZoomOrigin = () => updateZoomCanvasOrigin(graph, container)
      resizeObserver = observeContainerResize(container, syncZoomOrigin)
      syncZoomOriginFrame = window.requestAnimationFrame(syncZoomOrigin)
      renderGraphData(graph, graphDataRef.current)
    }, 0)

    return () => {
      window.clearTimeout(initializeTimer)
      resizeObserver?.disconnect()
      if (syncZoomOriginFrame !== null) {
        window.cancelAnimationFrame(syncZoomOriginFrame)
      }
      if (renderFrameRef.current !== null) {
        window.cancelAnimationFrame(renderFrameRef.current)
        renderFrameRef.current = null
      }
      renderSequenceRef.current += 1
      graphRef.current?.stopLayout()
      graphRef.current?.destroy()
      graphRef.current = null
      container.replaceChildren()
    }
  }, [handleElementClick, renderGraphData])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    setPanelData(null)
    renderGraphData(graph, graphData)
  }, [focusNode, graphData, renderGraphData])

  useEffect(() => {
    const graph = graphRef.current
    if (
      !graph
      || graph.destroyed
      || layoutInProgressRef.current
      || appliedEdgeLabelsVisibleRef.current === edgeLabelsVisible
    ) return

    appliedEdgeLabelsVisibleRef.current = edgeLabelsVisible
    void updateEdgeLabelVisibility(graph, edgeLabelsVisible).catch((error) => {
      console.debug('[ReqRelationShip][G6 edge label update error]', error)
    })
  }, [edgeLabelsVisible])

  return (
    <div className="antv-g6-graph-layout">
      <div ref={containerRef} className="antv-g6-graph-container" />
      <G6PropertiesPanel panelData={panelData} />
    </div>
  )
}

function applyEdgeLabelVisibility(graphData: GraphData, visible: boolean): GraphData {
  return {
    ...graphData,
    edges: (graphData.edges || []).map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        label: visible,
      },
    })),
  }
}

async function updateEdgeLabelVisibility(graph: Graph, visible: boolean) {
  graph.updateEdgeData((edges) => edges.map((edge) => ({
    id: edge.id,
    style: { label: visible },
  })))
  await graph.draw()
}

export default AntvG6GraphRenderer
