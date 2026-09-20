import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const base = new URL('../src/components/ReqRelationShip/graph-renderers/', import.meta.url)
async function load(name) {
  const source = await readFile(new URL(name, base), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}
const { validateRenderData, sameTopology, ParallelEdgeGeometry } = await load('relationshipRenderData.ts')
const { seedPositions, shouldAnimateLayout } = await load('relationshipLayout.ts')
const { LatestTaskQueue } = await load('latestTaskQueue.ts')
const { RelationshipViewportIndex, segmentIntersects, shouldVirtualize } = await load('relationshipViewport.ts')
const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

test('animate only small graphs within both limits and respect reduced motion', () => {
  assert.equal(shouldAnimateLayout(200, 500), true)
  assert.equal(shouldAnimateLayout(201, 500), false)
  assert.equal(shouldAnimateLayout(200, 501), false)
  assert.equal(shouldAnimateLayout(20, 0), true)
  assert.equal(shouldAnimateLayout(200, 500, true), false)
  assert.equal(shouldAnimateLayout(0, 0), false)
  assert.equal(shouldAnimateLayout(1, 1), false)
})

test('viewport selection keeps crossing edges, hidden endpoints and filtered topology without recursive loading', () => {
  const data = validateRenderData({ nodes: [{ id: 'center' }, { id: 'left' }, { id: 'right' }, { id: 'far' }], edges: [
    { id: 'cross', source: 'left', target: 'right' },
    { id: 'outside', source: 'right', target: 'far' },
    { id: 'loop', source: 'center', target: 'center' },
  ] })
  const positions = new Map([['center', [0, 0]], ['left', [-1000, 0]], ['right', [1000, 0]], ['far', [2000, 0]]])
  const index = new RelationshipViewportIndex()
  index.rebuild(data, positions, new ParallelEdgeGeometry().update(data.edges))
  const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 }
  const result = index.select(bounds, data, new Set(data.edges.keys()))
  assert.deepEqual([...result.visibleNodes], ['center'])
  assert.deepEqual([...result.edges].sort(), ['cross', 'loop'])
  assert.deepEqual([...result.nodes].sort(), ['center', 'left', 'right'])
  assert.equal(result.nodes.has('far'), false)
  assert.deepEqual([...index.select(bounds, data, new Set(['loop'])).nodes], ['center'])
  assert.equal(index.select({ minX: 10000, maxX: 11000, minY: 10000, maxY: 11000 }, data, new Set(data.edges.keys())).nodes.size, 0)
  assert.equal(positions.size, 4)
  assert.equal(shouldVirtualize(2999, 9999), false)
  assert.equal(shouldVirtualize(3000, 0), true)
  assert.equal(shouldVirtualize(2, 10000), true)
})

test('clipping rejects diagonal bounding-box false positives and retains tangencies', () => {
  const bounds = { minX: -10, minY: -10, maxX: 10, maxY: 10 }
  assert.equal(segmentIntersects([-100, 0], [100, 0], bounds), true)
  assert.equal(segmentIntersects([-100, 0], [0, 100], bounds), false)
  assert.equal(segmentIntersects([-100, 10], [100, 10], bounds), true)
  assert.equal(segmentIntersects([0, 0], [0, 0], bounds), true)
})

test('viewport index rebuild restores moved nodes and conservative parallel-curve bounds', () => {
  const data = validateRenderData({ nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ id: 'curve', source: 'a', target: 'b' }] })
  const positions = new Map([['a', [-1000, -500]], ['b', [1000, -500]]])
  const index = new RelationshipViewportIndex()
  const geometry = new Map([['curve', { style: { curveOffset: 1000 } }]])
  const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 }
  index.rebuild(data, positions, geometry)
  assert.equal(index.select(bounds, data, new Set(['curve'])).edges.has('curve'), true)
  positions.set('a', [0, 0])
  index.rebuild(data, positions, geometry)
  assert.equal(index.select(bounds, data, new Set()).visibleNodes.has('a'), true)
})

test('reject invalid IDs and endpoints before accepting a graph', () => {
  for (const graph of [
    { nodes, edges: [{ source: 'a', target: 'b' }] },
    { nodes: [...nodes, { id: 'a' }] },
    { nodes, edges: [{ id: 'a', source: 'a', target: 'b' }] },
    { nodes, edges: [{ id: 'edge', source: 'a', target: 'missing' }] },
  ]) assert.throws(() => validateRenderData(graph))
  assert.equal(validateRenderData({}).nodes.size, 0)
})

test('topology compares IDs and endpoints, not just counts', () => {
  const graph = { nodes, edges: [{ id: 'e', source: 'a', target: 'b' }] }
  const original = validateRenderData(graph)
  assert.equal(sameTopology(original, validateRenderData(graph)), true)
  assert.equal(sameTopology(original, validateRenderData({ ...graph, edges: [{ id: 'e', source: 'a', target: 'c' }] })), false)
  assert.equal(sameTopology(original, validateRenderData({ ...graph, edges: [{ id: 'x', source: 'a', target: 'b' }] })), false)
})

test('parallel edges, reverse edges and self-loops remain distinct and reuse unchanged geometry', () => {
  const graph = validateRenderData({ nodes, edges: [
    { id: 'e1', source: 'a', target: 'b' }, { id: 'e2', source: 'b', target: 'a' },
    { id: 'l1', source: 'c', target: 'c' }, { id: 'l2', source: 'c', target: 'c' },
  ] })
  const cache = new ParallelEdgeGeometry()
  const geometry = cache.update(graph.edges)
  assert.equal(geometry.size, 4)
  assert.notEqual(geometry.get('e1').style.curveOffset, -geometry.get('e2').style.curveOffset)
  assert.notEqual(geometry.get('l1').style.loopPlacement, geometry.get('l2').style.loopPlacement)
  assert.equal(geometry.get('e1'), cache.update(graph.edges).get('e1'))
})

test('seeding is deterministic, finite, covers disconnected nodes and preserves existing coordinates', () => {
  const request = { nodes: [{ id: 'a', size: 44, x: 100, y: 200 }, { id: 'b', size: 44 }, { id: 'c', size: 44 }], edges: [{ source: 'a', target: 'b' }], focusNode: 'a' }
  const run = () => { const gen = seedPositions(request); let step = gen.next(); while (!step.done) step = gen.next(); return step.value }
  const positions = run()
  assert.deepEqual(positions, run())
  assert.equal(positions.length, 6)
  assert.equal(positions[0], 100)
  assert.equal(positions[1], 200)
  assert.ok([...positions].every(Number.isFinite))
  assert.ok(Math.hypot(positions[2] - 100, positions[3] - 200) < 101)
})

test('latest queue serializes work, coalesces pending changes and survives rejection', async () => {
  let release
  let active = 0, maxActive = 0, calls = 0, errors = 0
  const gate = new Promise(resolve => { release = resolve })
  const queue = new LatestTaskQueue(async () => {
    calls++; active++; maxActive = Math.max(maxActive, active)
    try { if (calls === 1) await gate; else throw new Error('expected') } finally { active-- }
  }, () => { errors++ })
  queue.request(); queue.request(); queue.request()
  release()
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(calls, 2)
  assert.equal(maxActive, 1)
  assert.equal(errors, 1)
  queue.dispose(); queue.request()
  assert.equal(calls, 2)
})

test('disposing a running queue discards pending tasks', async () => {
  let release
  let calls = 0
  const gate = new Promise(resolve => { release = resolve })
  const queue = new LatestTaskQueue(async () => { calls++; await gate }, error => { throw error })
  queue.request(); queue.request(); queue.dispose(); release()
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(calls, 1)
})

test('10k nodes and 30k edges retain all identities including parallel edges', () => {
  const graph = validateRenderData({
    nodes: Array.from({ length: 10000 }, (_, i) => ({ id: `n${i}` })),
    edges: Array.from({ length: 30000 }, (_, i) => ({ id: `e${i}`, source: `n${i % 10000}`, target: `n${(i + 1) % 10000}` })),
  })
  const geometry = new ParallelEdgeGeometry().update(graph.edges)
  assert.equal(graph.nodes.size, 10000)
  assert.equal(geometry.size, 30000)
  assert.equal(graph.large, true)
  assert.equal(graph.incidentEdges.get('n0').size, 6)
})
