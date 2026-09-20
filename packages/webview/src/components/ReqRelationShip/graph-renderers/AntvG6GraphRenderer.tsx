import { useEffect, useRef, useState } from 'react'
import { GraphEvent } from '@antv/g6'
import type { GraphData } from '@antv/g6'
import { Alert, Button } from 'antd'
import G6PropertiesPanel, { createPanelData } from './G6PropertiesPanel'
import type { GraphElementPanelData } from './G6PropertiesPanel'
import type { RequirementNodeLookupState } from '../requirementNodeLookup'
import { RelationshipGraphRuntime } from './relationshipGraphRuntime'
import type { RenderState } from './relationshipGraphRuntime'
import { nodeDiameter } from './relationshipRenderData'

interface AntvG6GraphRendererProps {
  graphData: GraphData
  visibleEdgeIds: string[]
  edgeLabelsVisible: boolean
  focusNode: string | null
  layoutRevision: number
  expandingNodeId?: string | null
  requirementLookupState: RequirementNodeLookupState
  onNodeDoubleClick?: (nodeId: string) => void
  onPanelDataChange?: (panelData: GraphElementPanelData | null) => void
  onOpenRequirement?: (requirementId: string) => void
  onRetryRequirementLookup?: () => void
  onRenderStateChange?: (rendering: boolean, animated: boolean) => void
}

const POSITION_EVENTS = [GraphEvent.AFTER_TRANSFORM, GraphEvent.AFTER_DRAW, GraphEvent.AFTER_ELEMENT_TRANSLATE]

function AntvG6GraphRenderer(props: AntvG6GraphRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<RelationshipGraphRuntime | null>(null)
  const latest = useRef(props)
  const [runtime, setRuntime] = useState<RelationshipGraphRuntime | null>(null)
  const [panelData, setPanelData] = useState<GraphElementPanelData | null>(null)
  const [state, setState] = useState<RenderState>({ busy: false, ready: false, status: '', error: null })
  useEffect(() => { latest.current = props })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false
    // StrictMode cancels the probe mount before creating a Canvas or Worker.
    const timer = window.setTimeout(() => {
      const instance = new RelationshipGraphRuntime(container, {
        state: next => { if (!disposed) setState(next) },
        click: (type, datum) => {
          if (disposed) return
          const panel = type && datum ? createPanelData(type, datum) : null
          setPanelData(panel)
          latest.current.onPanelDataChange?.(panel)
        },
        doubleClick: id => latest.current.onNodeDoubleClick?.(id),
      })
      runtimeRef.current = instance
      setRuntime(instance)
      instance.setInput(latest.current)
    }, 0)
    return () => {
      disposed = true
      window.clearTimeout(timer)
      runtimeRef.current?.destroy()
      runtimeRef.current = null
      latest.current.onRenderStateChange?.(false, false)
    }
  }, [])

  useEffect(() => {
    runtimeRef.current?.setInput({
      graphData: props.graphData,
      visibleEdgeIds: props.visibleEdgeIds,
      edgeLabelsVisible: props.edgeLabelsVisible,
      focusNode: props.focusNode,
      layoutRevision: props.layoutRevision,
    })
  }, [props.graphData, props.visibleEdgeIds, props.edgeLabelsVisible, props.focusNode, props.layoutRevision])

  useEffect(() => {
    props.onRenderStateChange?.(state.busy, false)
  }, [state.busy, props.onRenderStateChange])

  useEffect(() => {
    const indicator = indicatorRef.current
    const nodeId = props.expandingNodeId
    if (!runtime || !indicator || !nodeId) {
      if (indicator) indicator.hidden = true
      return
    }
    const graph = runtime.graph
    let frame: number | null = null
    const sync = () => {
      frame = null
      if (graph.destroyed) return
      try {
        const [x, y] = graph.getViewportByCanvas(graph.getElementPosition(nodeId))
        const diameter = nodeDiameter(graph.getNodeData(nodeId).style?.size) * graph.getZoom() * 1.24
        indicator.hidden = !Number.isFinite(x) || !Number.isFinite(y)
        indicator.style.left = `${x}px`
        indicator.style.top = `${y}px`
        indicator.style.width = `${diameter}px`
        indicator.style.height = `${diameter}px`
        indicator.style.setProperty('--req-relationship-loading-line-width', `${Math.min(4, Math.max(0.75, diameter * 0.055))}px`)
      } catch { indicator.hidden = true }
    }
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(sync) }
    POSITION_EVENTS.forEach(event => graph.on(event, schedule))
    schedule()
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      POSITION_EVENTS.forEach(event => graph.off(event, schedule))
      indicator.hidden = true
    }
  }, [runtime, props.expandingNodeId])

  return (
    <div className="antv-g6-graph-layout">
      <div className="antv-g6-graph-stage">
        <div ref={containerRef} className="antv-g6-graph-container" />
        <div className="antv-g6-render-status" role="status" aria-live="polite">
          {state.busy ? (state.ready ? '正在补全关系图与优化布局…' : '正在准备关系图…') : state.status}
          {state.viewport && ` · 当前视口（含缓冲区）${state.viewport.nodes} 个节点 / ${state.viewport.edges} 条关系，全图 ${state.viewport.totalNodes} / ${state.viewport.totalEdges}`}
        </div>
        {state.error && (
          <Alert className="antv-g6-render-error" type="warning" showIcon message={state.error}
            action={<Button size="small" onClick={() => runtimeRef.current?.retry()}>重试布局</Button>} />
        )}
        <div ref={indicatorRef} className="antv-g6-node-loading-indicator" aria-hidden="true" hidden>
          <span className="antv-g6-node-loading-indicator__ring" />
        </div>
      </div>
      <G6PropertiesPanel panelData={panelData} requirementLookupState={props.requirementLookupState}
        onOpenRequirement={props.onOpenRequirement} onRetryRequirementLookup={props.onRetryRequirementLookup} />
    </div>
  )
}

export default AntvG6GraphRenderer
