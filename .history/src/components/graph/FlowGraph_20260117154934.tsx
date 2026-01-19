import React, { useEffect, useRef, useMemo } from 'react'
import { Graph, Snapline, Dnd } from '@antv/x6'
import { register } from '@antv/x6-react-shape'
import NodeWrapper from '../nodes/common/NodeWrapper'
import { getStrategy } from './strategies'
import './FlowGraph.css'

// Register common components
register({
  shape: 'custom-rect-node',
  width: 120,
  height: 60,
  component: NodeWrapper,
})

interface FlowGraphProps {
  sectionKey: string
  data?: any
  onChange?: (data: any) => void
  readOnly?: boolean
}

const FlowGraph = ({ sectionKey, data, onChange, readOnly = false }: FlowGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const dndContainerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const dndRef = useRef<Dnd | null>(null)

  const strategy = useMemo(() => getStrategy(sectionKey), [sectionKey])

  useEffect(() => {
    // Strategy-specific registration
    if (strategy.registerNodes) {
      strategy.registerNodes()
    }

    if (!containerRef.current) return

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      grid: { size: 10, visible: true },
      panning: true,
      mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
      interacting: !readOnly,
      background: { color: '#f8f9fa' },
    })

    graphRef.current = graph

    if (!readOnly && dndContainerRef.current) {
      dndRef.current = new Dnd({
        target: graph,
        scaled: false,
        dndContainer: dndContainerRef.current,
      })
    }

    if (data && Object.keys(data).length > 0) {
      graph.fromJSON(data)
    }

    if (onChange && !readOnly) {
      const updateData = () => onChange(graph.toJSON())
      graph.on('node:change:position', updateData)
      graph.on('node:added', updateData)
      graph.on('node:removed', updateData)
      graph.on('edge:added', updateData)
      graph.on('edge:removed', updateData)
    }

    graph.use(new Snapline({ enabled: true }))

    return () => {
      graph.dispose()
    }
  }, [strategy, readOnly]) // Re-init when strategy changes (sectionKey changes) or readOnly changes.
  // Note: data and onChange are not in dependency array to avoid re-init on every data change.
  // Ideally, if 'data' changes externally (reset), we might want to fromJSON again. 
  // But typically in this app, data is controlled by parent state which is updated by onChange.

  // Handle data updates when switching sections if the component is reused
  useEffect(() => {
    if (graphRef.current && data) {
       // Only reload if the graph is empty or we want to force update. 
       // Since the parent holds state, when we switch sectionKey, the 'data' prop changes too.
       // Because 'strategy' is in the dependency of the init effect, the graph destroys and recreates.
       // So the init effect handles loading 'data'.
       // We don't need a separate effect for 'data' unless we want to support external updates without remounting.
    }
  }, [data])

  const startDrag = (e: React.MouseEvent, item: any) => {
    if (!graphRef.current || !dndRef.current) return

    const node = graphRef.current.createNode({
      shape: item.shape,
      label: item.label,
      ...item.defaultAttrs,
      // Ensure data has what we need (especially for custom nodes)
      data: {
        nodeName: item.label,
        ...(item.defaultAttrs?.data || {})
      }
    })

    dndRef.current.start(node, e.nativeEvent as any)
  }

  return (
    <div className="flow-graph-container">
      {!readOnly && (
        <div className="graph-sidebar" ref={dndContainerRef}>
          <div className="sidebar-title">组件库</div>
          <div className="sidebar-items">
            {strategy.sidebarItems.map((item) => (
              
              <div
                key={item.type}
                className="sidebar-item"
                onMouseDown={(e) => startDrag(e, item)}
                style={{
                  borderColor: item.color === '#ffffff' ? '#d9d9d9' : item.color,
                  backgroundColor: item.color,
                  // If custom render is present, remove padding/border styles that might conflict, or keep them?
                  // Keeping them for now as container styles.
                  padding: item.render ? 0 : '0.5rem',
                  border: item.render ? 'none' : undefined,
                  background: item.render ? 'transparent' : undefined
                }}
              >
                {item.render ? item.render : item.label}
              </div>
            ))}
          </div>
          <div className="sidebar-help">拖拽组件到画布</div>
        </div>
      )}
      <div className="graph-content-wrapper">
        <div ref={containerRef} className="x6-graph-container" />
        {!readOnly && <div className="graph-help-text">按住 Ctrl + 滚轮缩放画布，拖拽空白处平移</div>}
      </div>
    </div>
  )
}

export default FlowGraph
