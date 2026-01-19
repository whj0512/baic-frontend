import { useEffect, useRef } from 'react'
import { Graph, Snapline, Dnd } from '@antv/x6'
import { register } from '@antv/x6-react-shape'
import NodeWrapper from '../../nodes/common/NodeWrapper'
import './InternalCompositionGraph.css'

interface SectionGraphProps {
  data?: any
  onChange?: (data: any) => void
  readOnly?: boolean
}

const PALETTE = [
  { type: 'module', label: '子模块', shape: 'rect', color: '#f9f0ff' },
  { type: 'component', label: '组件', shape: 'rect', color: '#e6fffb' },
  { type: 'interface', label: '接口', shape: 'ellipse', color: '#fff2e8' },
]

register({
  shape: 'custom-rect-node',
  width: 120,
  height: 60,
  component: NodeWrapper,
})

const InternalCompositionGraph = ({ data, onChange, readOnly = false }: SectionGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const dndContainerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const dndRef = useRef<Dnd | null>(null)

  useEffect(() => {
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
  }, [])

  const startDrag = (e: React.MouseEvent, item: typeof PALETTE[0]) => {
    if (!graphRef.current || !dndRef.current) return

    const node = graphRef.current.createNode({
      shape: item.shape,
      width: 100,
      height: 40,
      label: item.label,
      attrs: {
        body: {
          fill: item.color,
          stroke: '#5c5c5c',
          strokeWidth: 1,
          rx: item.shape === 'rect' ? 4 : 0,
          ry: item.shape === 'rect' ? 4 : 0,
        },
        label: { fill: '#333' }
      },
    })

    dndRef.current.start(node, e.nativeEvent as any)
  }

  return (
    <div className="flow-graph-container">
      {!readOnly && (
        <div className="graph-sidebar" ref={dndContainerRef}>
          <div className="sidebar-title">组件库</div>
          <div className="sidebar-items">
            {PALETTE.map((item) => (
              <div
                key={item.type}
                className="sidebar-item"
                onMouseDown={(e) => startDrag(e, item)}
                style={{
                  borderColor: item.color === '#ffffff' ? '#d9d9d9' : item.color,
                  backgroundColor: item.color
                }}
              >
                {item.label}
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

export default InternalCompositionGraph
