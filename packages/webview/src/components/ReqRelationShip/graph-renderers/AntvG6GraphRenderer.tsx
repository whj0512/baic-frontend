import { useCallback, useEffect, useRef, useState } from 'react'
import { Graph, GraphEvent, NodeEvent } from '@antv/g6'
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
  visibleEdgeIds: string[]
  edgeLabelsVisible: boolean
  focusNode: string | null
  layoutRevision: number
  expandingNodeId?: string | null
  onNodeDoubleClick?: (nodeId: string) => void
  onRenderStateChange?: (rendering: boolean, animated: boolean) => void
}

const LOADING_POSITION_EVENTS = [
  GraphEvent.AFTER_TRANSFORM,
  GraphEvent.AFTER_DRAW,
  GraphEvent.AFTER_RENDER,
  GraphEvent.AFTER_LAYOUT,
  GraphEvent.AFTER_ELEMENT_TRANSLATE,
]
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DEFAULT_NODE_SIZE = 48
const LOADING_INDICATOR_PADDING_RATIO = 0.24

function observeContainerResize(container: HTMLElement, onResize: () => void) {
  if (typeof ResizeObserver === 'undefined') return null

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)
  return resizeObserver
}

function AntvG6GraphRenderer({
  graphData,
  visibleEdgeIds,
  edgeLabelsVisible,
  focusNode,
  layoutRevision,
  expandingNodeId = null,
  onNodeDoubleClick,
  onRenderStateChange,
}: AntvG6GraphRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const loadingIndicatorRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const graphDataRef = useRef(graphData)
  const visibleEdgeIdsRef = useRef(visibleEdgeIds)
  const edgeLabelsVisibleRef = useRef(edgeLabelsVisible)
  const focusNodeRef = useRef(focusNode)
  const layoutRevisionRef = useRef(layoutRevision)
  const expandingNodeIdRef = useRef(expandingNodeId)
  const onNodeDoubleClickRef = useRef(onNodeDoubleClick)
  const appliedEdgeLabelsVisibleRef = useRef(edgeLabelsVisible)
  const appliedLayoutRevisionRef = useRef(layoutRevision)
  const renderFrameRef = useRef<number | null>(null)
  const loadingPositionFrameRef = useRef<number | null>(null)
  const renderSequenceRef = useRef(0)
  const layoutInProgressRef = useRef(false)
  const [panelData, setPanelData] = useState<GraphElementPanelData | null>(null)

  graphDataRef.current = graphData
  visibleEdgeIdsRef.current = visibleEdgeIds
  edgeLabelsVisibleRef.current = edgeLabelsVisible
  focusNodeRef.current = focusNode
  layoutRevisionRef.current = layoutRevision
  expandingNodeIdRef.current = expandingNodeId
  onNodeDoubleClickRef.current = onNodeDoubleClick

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

  const handleNodeDoubleClick = useCallback((event: IPointerEvent) => {
    const targetId = 'id' in event.target && typeof event.target.id === 'string'
      ? event.target.id
      : undefined
    if (!targetId) return

    onNodeDoubleClickRef.current?.(targetId)
  }, [])

  const syncLoadingIndicatorPosition = useCallback(() => {
    const graph = graphRef.current
    const indicator = loadingIndicatorRef.current
    const nodeId = expandingNodeIdRef.current
    if (!graph || graph.destroyed || !indicator || !nodeId) {
      if (indicator) indicator.hidden = true
      return
    }

    try {
      const canvasPosition = graph.getElementPosition(nodeId)
      const viewportPosition = graph.getViewportByCanvas(canvasPosition)
      if (!Number.isFinite(viewportPosition[0]) || !Number.isFinite(viewportPosition[1])) {
        indicator.hidden = true
        return
      }

      const [nodeWidth, nodeHeight] = getNodeSize(graph.getNodeData(nodeId).style?.size)
      const zoom = graph.getZoom()
      const padding = Math.min(nodeWidth, nodeHeight) * LOADING_INDICATOR_PADDING_RATIO
      const indicatorWidth = (nodeWidth + padding) * zoom
      const indicatorHeight = (nodeHeight + padding) * zoom
      const lineWidth = Math.min(4, Math.max(0.75, Math.min(indicatorWidth, indicatorHeight) * 0.055))

      indicator.style.left = `${viewportPosition[0]}px`
      indicator.style.top = `${viewportPosition[1]}px`
      indicator.style.width = `${indicatorWidth}px`
      indicator.style.height = `${indicatorHeight}px`
      indicator.style.setProperty('--req-relationship-loading-line-width', `${lineWidth}px`)
      indicator.hidden = false
    } catch {
      indicator.hidden = true
    }
  }, [])

  const scheduleLoadingIndicatorPosition = useCallback(() => {
    if (loadingPositionFrameRef.current !== null) return

    loadingPositionFrameRef.current = window.requestAnimationFrame(() => {
      loadingPositionFrameRef.current = null
      syncLoadingIndicatorPosition()
    })
  }, [syncLoadingIndicatorPosition])

  const renderGraphData = useCallback((graph: Graph) => {
    if (renderFrameRef.current !== null) {
      window.cancelAnimationFrame(renderFrameRef.current)
    }
    if (layoutInProgressRef.current) {
      graph.stopLayout()
    }

    const renderSequence = renderSequenceRef.current + 1
    const animateLayout = graph.rendered && !window.matchMedia?.(REDUCED_MOTION_QUERY).matches
    renderSequenceRef.current = renderSequence
    layoutInProgressRef.current = true
    onRenderStateChange?.(true, animateLayout)

    // 先显示 loading 遮罩，再执行 G6 内置 Radial 布局。
    renderFrameRef.current = window.requestAnimationFrame(() => {
      renderFrameRef.current = null
      if (graph.destroyed || renderSequence !== renderSequenceRef.current) return

      const latestGraphData = graphDataRef.current
      const labelsVisible = edgeLabelsVisibleRef.current
      const nodeCount = latestGraphData.nodes?.length || 0
      graph.setLayout(createG6RadialLayoutOptions(focusNodeRef.current, animateLayout, nodeCount))
      graph.setData(applyEdgePresentation(latestGraphData, labelsVisible, visibleEdgeIdsRef.current))
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
            onRenderStateChange?.(false, animateLayout)
          }
        })
    })
  }, [onRenderStateChange])

  const updateGraphDataWithoutLayout = useCallback(async (graph: Graph, nextGraphData: GraphData) => {
    // 若完整布局仍在下一帧等待执行，它会直接读取最新 graphData，无需额外 draw。
    if (renderFrameRef.current !== null) return

    const labelsVisible = edgeLabelsVisibleRef.current
    const dataWithCurrentPositions = preserveCurrentNodePositions(graph, nextGraphData)
    graph.setData(applyEdgePresentation(
      dataWithCurrentPositions,
      labelsVisible,
      visibleEdgeIdsRef.current,
    ))
    appliedEdgeLabelsVisibleRef.current = labelsVisible

    try {
      await graph.draw()
    } catch (error) {
      console.debug('[ReqRelationShip][G6 data update error]', error)
    }
  }, [])

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
      graph.on(NodeEvent.DBLCLICK, handleNodeDoubleClick)
      LOADING_POSITION_EVENTS.forEach((eventName) => {
        graph.on(eventName, scheduleLoadingIndicatorPosition)
      })

      const syncZoomOrigin = () => {
        updateZoomCanvasOrigin(graph, container)
        scheduleLoadingIndicatorPosition()
      }
      resizeObserver = observeContainerResize(container, syncZoomOrigin)
      syncZoomOriginFrame = window.requestAnimationFrame(syncZoomOrigin)
      appliedLayoutRevisionRef.current = layoutRevisionRef.current
      renderGraphData(graph)
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
      if (loadingPositionFrameRef.current !== null) {
        window.cancelAnimationFrame(loadingPositionFrameRef.current)
        loadingPositionFrameRef.current = null
      }
      renderSequenceRef.current += 1
      const graph = graphRef.current
      if (graph && !graph.destroyed) {
        graph.off(NodeEvent.DBLCLICK, handleNodeDoubleClick)
        LOADING_POSITION_EVENTS.forEach((eventName) => {
          graph.off(eventName, scheduleLoadingIndicatorPosition)
        })
        graph.stopLayout()
        graph.destroy()
      }
      graphRef.current = null
      container.replaceChildren()
    }
  }, [handleElementClick, handleNodeDoubleClick, renderGraphData, scheduleLoadingIndicatorPosition])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    void updateEdgeVisibility(graph, visibleEdgeIds).catch((error) => {
      console.debug('[ReqRelationShip][G6 edge visibility update error]', error)
    })
  }, [visibleEdgeIds])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    setPanelData(null)
    if (appliedLayoutRevisionRef.current !== layoutRevision) {
      appliedLayoutRevisionRef.current = layoutRevision
      renderGraphData(graph)
      return
    }

    void updateGraphDataWithoutLayout(graph, graphData)
  }, [graphData, layoutRevision, renderGraphData, updateGraphDataWithoutLayout])

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

  useEffect(() => {
    if (!expandingNodeId && loadingIndicatorRef.current) {
      loadingIndicatorRef.current.hidden = true
    }
    scheduleLoadingIndicatorPosition()
  }, [expandingNodeId, scheduleLoadingIndicatorPosition])

  return (
    <div className="antv-g6-graph-layout">
      <div className="antv-g6-graph-stage">
        <div ref={containerRef} className="antv-g6-graph-container" />
        <div
          ref={loadingIndicatorRef}
          className="antv-g6-node-loading-indicator"
          aria-hidden="true"
          hidden
        >
          <span className="antv-g6-node-loading-indicator__ring" />
        </div>
      </div>
      <G6PropertiesPanel panelData={panelData} />
    </div>
  )
}

function applyEdgePresentation(
  graphData: GraphData,
  labelsVisible: boolean,
  visibleEdgeIds: string[],
): GraphData {
  const visibleEdgeIdSet = new Set(visibleEdgeIds)

  return {
    ...graphData,
    edges: (graphData.edges || []).map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        label: labelsVisible,
        visibility: visibleEdgeIdSet.has(edge.id) ? 'visible' : 'hidden',
      },
    })),
  }
}

function preserveCurrentNodePositions(graph: Graph, graphData: GraphData): GraphData {
  return {
    ...graphData,
    nodes: (graphData.nodes || []).map((node) => {
      try {
        const [x, y, z] = graph.getElementPosition(node.id)
        return {
          ...node,
          style: {
            ...node.style,
            x,
            y,
            z,
          },
        }
      } catch {
        return node
      }
    }),
  }
}

async function updateEdgeLabelVisibility(graph: Graph, visible: boolean) {
  graph.updateEdgeData((edges) => edges.map((edge) => ({
    id: edge.id,
    style: { label: visible },
  })))
  await graph.draw()
}

async function updateEdgeVisibility(graph: Graph, visibleEdgeIds: string[]) {
  const visibleEdgeIdSet = new Set(visibleEdgeIds)
  const visibility = Object.fromEntries(
    graph.getEdgeData().map((edge) => [
      edge.id,
      visibleEdgeIdSet.has(edge.id) ? 'visible' : 'hidden',
    ]),
  )

  await graph.setElementVisibility(visibility, false)
}

function getNodeSize(size: unknown): [number, number] {
  if (typeof size === 'number' && Number.isFinite(size) && size > 0) {
    return [size, size]
  }

  if (Array.isArray(size)) {
    const width = typeof size[0] === 'number' && Number.isFinite(size[0]) && size[0] > 0
      ? size[0]
      : DEFAULT_NODE_SIZE
    const height = typeof size[1] === 'number' && Number.isFinite(size[1]) && size[1] > 0
      ? size[1]
      : width
    return [width, height]
  }

  return [DEFAULT_NODE_SIZE, DEFAULT_NODE_SIZE]
}

export default AntvG6GraphRenderer
