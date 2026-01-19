import React, { useEffect, useRef, useMemo } from 'react'
import { Graph, Snapline, Stencil } from '@antv/x6'
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
  const stencilContainerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const stencilRef = useRef<Stencil | null>(null)

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

    if (!readOnly && stencilContainerRef.current) {
      const stencil = new Stencil({
        title: '组件库',
        target: graph,
        stencilGraphWidth: 200,
        stencilGraphHeight: 0,
        collapsable: true,
        groups: [
          {
            name: 'default',
            title: '基础组件',
          },
        ],
        layoutOptions: {
          columns: 1,
          columnWidth: 150,
          rowHeight: 80,
        },
      })

      if (stencilContainerRef.current) {
        stencilContainerRef.current.appendChild(stencil.container)
      }
      stencilRef.current = stencil

      const nodes = strategy.sidebarItems.map((item) => {
        return graph.createNode({
          shape: item.shape,
          label: item.label,
          ...item.defaultAttrs,
          isStencil: true,
          // Ensure data has what we need（元数据）
          data: {
            nodeName: item.label,
            
            ...(item.defaultAttrs?.data || {})
          }
        })
      })

      stencil.load(nodes, 'default')
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

  // Handle data updates when switching sections if the component is reused
  useEffect(() => {
    if (graphRef.current && data) {
      // Data handling logic (same as before)
    }
  }, [data])

  return (
    <div className="flow-graph-container">
      {!readOnly && (
        <div
          className="graph-sidebar"
          ref={stencilContainerRef}
          style={{ padding: 0 }}
        />
      )}
      <div className="graph-content-wrapper">
        <div ref={containerRef} className="x6-graph-container" />
        {!readOnly && <div className="graph-help-text">按住 Ctrl + 滚轮缩放画布，拖拽空白处平移</div>}
      </div>
    </div>
  )
}

export default FlowGraph
