import { useEffect, useRef } from 'react'
import { Graph, Snapline, Dnd } from '@antv/x6'
import './FlowGraph.css'
import { register } from '@antv/x6-react-shape'
import NodeWrapper from './nodes/common/NodeWrapper'
import CallNode from './nodes/internalConstraints/CallNode'
import GraphSidebar, { NODE_PALETTES } from './GraphSidebar'

interface FlowGraphProps {
  data?: any
  onChange?: (data: any) => void
  readOnly?: boolean
  sectionKey?: string
}

register({
  shape: 'custom-rect-node',
  width: 120,
  height: 60,
  component: NodeWrapper,
})

register({
  shape: 'call-node',
  width: 120,
  height: 60,
  component: CallNode,
});

const FlowGraph = ({ data, onChange, readOnly = false, sectionKey = 'default' }: FlowGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const dndContainerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const dndRef = useRef<Dnd | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize Graph
    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      grid: {
        size: 10,
        visible: true,
      },
      panning: true,
      mousewheel: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
      },
      interacting: !readOnly,
      background: {
        color: '#f8f9fa',
      },
    })

    graphRef.current = graph

    // Initialize Dnd
    if (!readOnly && dndContainerRef.current) {
      const dnd = new Dnd({
        target: graph,
        scaled: false,
        dndContainer: dndContainerRef.current, // Optional, can help with scrolling
      })
      dndRef.current = dnd
    }

    // Load Data
    if (data && Object.keys(data).length > 0) {
      graph.fromJSON(data)
    } else if (!readOnly) {
      // Only show demo nodes if completely empty and no palette used yet
      // But with sidebar, maybe better to start empty or with a simple instruction?
      // Keeping empty is cleaner for a "drawing" tool.
      // 添加节点
      graph.addNode({
        shape: 'call-node',
        x: 100,
        y: 100,
        data: {
          nodeName: '计算函数',
          stroke: '#1890ff',
          fill: '#e6f7ff',
        },
      });
    }

    // Listen for changes
    if (onChange && !readOnly) {
      const updateData = () => {
        onChange(graph.toJSON())
      }

      graph.on('node:change:position', updateData)
      graph.on('node:added', updateData)
      graph.on('node:removed', updateData)
      graph.on('edge:added', updateData)
      graph.on('edge:removed', updateData)
    }

    // Plugins
    graph.use(
      new Snapline({
        enabled: true,
      }),
    )

    return () => {
      graph.dispose()
    }
  }, [])

  const startDrag = (e: React.MouseEvent, item: typeof NODE_PALETTES['default'][0]) => {
    if (!graphRef.current || !dndRef.current) return

    let node

    if (item.shape === 'polygon') {
      // Create a rhombus for events/decisions
      node = graphRef.current.createNode({
        shape: 'polygon',
        width: 100,
        height: 60,
        points: '0,30 50,0 100,30 50,60', // Rhombus
        label: item.label,
        attrs: {
          body: {
            fill: item.color,
            stroke: '#5c5c5c',
            strokeWidth: 1,
          },
          label: {
            fill: '#333',
          }
        },
      })
    } else if (item.shape === 'call-node') {
      node = graphRef.current.createNode({
        shape: 'call-node',
        width: 120,
        height: 60,
        data: {
          nodeName: item.label,
          stroke: '#1890ff',
          fill: item.color,
        },
      })
    } else {
      node = graphRef.current.createNode({
        shape: item.shape,
        width: 100,
        height: 40,
        label: item.label,
        attrs: {
          body: {
            fill: item.color,
            stroke: '#5c5c5c',
            strokeWidth: 1,
            rx: item.shape === 'rect' ? 4 : 0, // rounded corners for rects
            ry: item.shape === 'rect' ? 4 : 0,
          },
          label: {
            fill: '#333',
          }
        },
      })
    }

    dndRef.current.start(node, e.nativeEvent as any)
  }

  return (
    <div className="flow-graph-container">
      {!readOnly && (
        <GraphSidebar 
          sectionKey={sectionKey} 
          onDragStart={startDrag} 
          dndContainerRef={dndContainerRef as React.RefObject<HTMLDivElement>} 
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