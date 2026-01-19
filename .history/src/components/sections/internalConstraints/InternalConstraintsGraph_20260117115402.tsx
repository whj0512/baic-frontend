import { useEffect, useRef } from 'react'
import { Graph, Snapline, Dnd } from '@antv/x6'
import { register } from '@antv/x6-react-shape'
import NodeWrapper from '../../nodes/common/NodeWrapper'
import CallNode from '../../nodes/internalConstraints/CallNode'
import './InternalConstraintsGraph.css'

interface SectionGraphProps {
  data?: any
  onChange?: (data: any) => void
  readOnly?: boolean
}

const PALETTE = [
  { type: 'call', label: '计算函数', shape: 'call-node', color: '#e6f7ff' },
]

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

const InternalConstraintsGraph = ({ data, onChange, readOnly = false }: SectionGraphProps) => {
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
      setTimeout(() => graph.dispose(), 0)
    }
  }, [])

  const startDrag = (e: React.MouseEvent, item: typeof PALETTE[0]) => {
    if (!graphRef.current || !dndRef.current) return

    const node = graphRef.current.createNode({
      shape: 'call-node',
      width: 120,
      height: 60,
      data: {
        nodeName: item.label,
        stroke: '#1890ff',
        fill: item.color,
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
                {item.shape === 'call-node' ? (
                   <CallNode isStencil={true} nodeName={item.label} fill={item.color} stroke="#1890ff" />
                ) : (
                  item.label
                )}
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

export default InternalConstraintsGraph
