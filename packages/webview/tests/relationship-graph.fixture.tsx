import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { GraphData } from '@antv/g6'
import AntvG6GraphRenderer from '../src/components/ReqRelationShip/graph-renderers/AntvG6GraphRenderer'
import RelationshipGraphStatus from '../src/components/ReqRelationShip/components/RelationshipGraphStatus'
import { RelationshipGraphRuntime } from '../src/components/ReqRelationShip/graph-renderers/relationshipGraphRuntime'
import type { RenderState } from '../src/components/ReqRelationShip/graph-renderers/relationshipGraphRuntime'
import '../src/components/ReqRelationShip/ReqRelationShip.css'

function fixture(nodeCount: number, edgeCount: number): GraphData {
  return {
    nodes: Array.from({ length: nodeCount }, (_, i) => ({
      id: `n${i}`, data: { name: `Requirement ${i}`, type: 'Requirement' },
      style: { fill: ['#1677ff', '#52c41a', '#fa8c16'][i % 3], labelText: `Requirement ${i}` },
    })),
    edges: Array.from({ length: edgeCount }, (_, i) => ({
      id: `e${i}`, source: `n${i % nodeCount}`, target: `n${(i * 13 + 1 + Math.floor(i / nodeCount) * 17) % nodeCount}`,
      data: { relationType: 'dependsOn', origin: i % 2 ? 'explicit' : 'inferred' },
      style: { stroke: i % 2 ? '#5B8FF9' : '#F6903D', labelText: 'dependsOn', lineWidth: 1 },
    })),
  }
}

function ComponentFixture() {
  const [data, setData] = useState(() => fixture(1, 0))
  const [labels, setLabels] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [selected, setSelected] = useState('')
  return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <div>
    <button onClick={() => setLabels(value => !value)}>切换标签</button>
    <button onClick={() => setData(fixture(12, 20))}>扩展</button>
    <button onClick={() => setMounted(value => !value)}>挂载/卸载</button>
    <span data-testid="selected">{selected}</span>
    </div>
    <RelationshipGraphStatus hasMeta nodeCount={data.nodes!.length} edgeCount={data.edges!.length}
      focusNode="n0" focusNodeName="Requirement 0" expandedRootCount={1} isDenseGraph={false}
      edgeLabelsVisible={labels} isTruncated={false} expandingNodeId={null} expandingNodeName=""
      legendData={{ nodes: [{ label: 'Requirement', color: '#1677ff' }], edges: [{ label: 'dependsOn', color: '#5B8FF9' }] }} />
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      {mounted && <AntvG6GraphRenderer graphData={data} visibleEdgeIds={data.edges!.map(edge => edge.id!)}
        edgeLabelsVisible={labels} focusNode="n0" layoutRevision={1} requirementLookupState={{ status: 'idle', target: null }}
        onPanelDataChange={panel => setSelected(panel ? 'selected' : '')} onNodeDoubleClick={() => setData(fixture(12, 20))} />}
    </div>
  </div>
}

const root = document.getElementById('root')!
if (new URLSearchParams(location.search).has('component')) {
  createRoot(root).render(<StrictMode><ComponentFixture /></StrictMode>)
} else {
  root.innerHTML = '<div id="status" style="height:30px">关系图性能验证</div><div id="canvas" style="position:relative;height:calc(100vh - 30px);overflow:hidden"></div>'
  let runtime: RelationshipGraphRuntime | null = null
  let data: GraphData = {}
  let start = 0
  let firstReady = 0
  let state: RenderState | null = null
  let drawMs = 0
  let maxDrawMs = 0
  let firstComplete = 0
  let firstViewportComplete = 0
  const longTasks: number[] = []
  new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: true })
  const api = {
    load(n: number, e: number) {
      runtime?.destroy()
      document.getElementById('canvas')!.replaceChildren()
      data = fixture(n, e)
      firstReady = 0; firstComplete = 0; firstViewportComplete = 0; drawMs = 0; maxDrawMs = 0; longTasks.length = 0
      start = performance.now()
      runtime = new RelationshipGraphRuntime(document.getElementById('canvas')!, {
        state: next => {
          state = next
          if (next.viewport && !firstViewportComplete) firstViewportComplete = performance.now() - start
          if (next.ready && !firstReady) firstReady = performance.now() - start
          document.getElementById('status')!.textContent = next.error || `${next.busy ? '计算中' : '就绪'} ${next.status}`
        }, click: () => {}, doubleClick: () => {},
      })
      const graph = runtime.graph
      const draw = graph.draw.bind(graph)
      graph.draw = async () => {
        const before = performance.now()
        await draw()
        const elapsed = performance.now() - before
        drawMs += elapsed; maxDrawMs = Math.max(maxDrawMs, elapsed)
        if (!firstComplete && graph.getNodeData().length === n && graph.getEdgeData().length === e) firstComplete = performance.now() - start
      }
      api.update(false)
    },
    update(labels: boolean, filter = false) {
      runtime?.setInput({ graphData: data, visibleEdgeIds: data.edges!.filter((_, i) => !filter || i % 2).map(edge => edge.id!), edgeLabelsVisible: labels, focusNode: 'n0', layoutRevision: 1 })
    },
    replace(n: number, e: number) { data = fixture(n, e); api.update(false) },
    invalid() { runtime?.setInput({ graphData: { nodes: [{ id: 'bad' }], edges: [{ source: 'bad', target: 'bad' }] }, visibleEdgeIds: [], edgeLabelsVisible: false, focusNode: null, layoutRevision: 2 }) },
    snapshot() {
      return { state, firstReady, firstComplete, firstViewportComplete, totalMs: performance.now() - start, drawMs, maxDrawMs,
        nodes: runtime?.graph.getNodeData().length, edges: runtime?.graph.getEdgeData().length,
        maxLongTask: Math.max(0, ...longTasks), longTasks: longTasks.length,
        heap: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize }
    },
    graph: () => runtime!.graph,
    runtime: () => runtime!,
    destroy() { runtime?.destroy(); runtime = null },
  }
  Object.assign(window, { graphTest: api })
}
