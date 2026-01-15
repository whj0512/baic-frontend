import { useEffect, useRef } from 'react'
import { Graph } from '@antv/x6'
import './FlowGraph.css'

interface FlowGraphProps {
  data?: any
  onChange?: (data: any) => void
  readOnly?: boolean
}

const FlowGraph = ({ data, onChange, readOnly = false }: FlowGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)

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

    // Add some default nodes if empty, or load provided data
    if (data && Object.keys(data).length > 0) {
      graph.fromJSON(data)
    } else if (!readOnly) {
      // Demo initial state if empty and editable
      const rect = graph.addNode({
        x: 100,
        y: 60,
        width: 100,
        height: 40,
        label: '开始',
        attrs: {
          body: {
            fill: '#eff4ff',
            stroke: '#5f95ff',
          },
        },
      })
      
      const circle = graph.addNode({
        x: 300,
        y: 60,
        width: 100,
        height: 40,
        label: '结束',
        shape: 'ellipse', 
         attrs: {
          body: {
            fill: '#fff7e6',
            stroke: '#faad14',
          },
        },
      })
      
      graph.addEdge({
        source: rect,
        target: circle,
        attrs: {
          line: {
            stroke: '#a0a0a0',
          },
        },
      })
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
      // Add more events as needed
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
  }, []) // Empty dependency array to init once. 
  // Note: reactive data updates would require more complex logic (useEffect on data) 
  // but for this simple editor, we assume initial load is sufficient.

  return (
    <div className="flow-graph-container">
       <div ref={containerRef} className="x6-graph-container" />
       {!readOnly && <div className="graph-help-text">按住 Ctrl + 滚轮缩放画布，拖拽空白处平移</div>}
    </div>
  )
}

export default FlowGraph
