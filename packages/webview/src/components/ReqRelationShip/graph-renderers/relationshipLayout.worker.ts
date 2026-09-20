import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'
import { seedPositions } from './relationshipLayout'
import type { LayoutRequest, LayoutResult } from './relationshipLayout'

const worker = self as unknown as {
  onmessage: ((event: MessageEvent<LayoutRequest>) => void) | null
  postMessage: (message: LayoutResult | { version: number; error: string }, transfer?: Transferable[]) => void
}

worker.onmessage = async ({ data: request }) => {
  try {
    const started = performance.now()
    const generator = seedPositions(request)
    let step = generator.next()
    while (!step.done) step = generator.next()
    const initial = step.value
    const nodes = request.nodes.map((node, i) => ({
      id: node.id, size: node.size,
      x: initial[i * 2], y: initial[i * 2 + 1],
    }))
    worker.postMessage({ version: request.version, status: 'initial', positions: initial, elapsedMs: performance.now() - started }, [initial.buffer])
    const simulation = forceSimulation(nodes).stop()
      .force('charge', forceManyBody().strength(-180).theta(0.9))
      .force('link', forceLink<typeof nodes[number], { source: string; target: string }>(request.edges)
        .id(node => node.id).distance(140).strength(0.1))
      .force('collide', forceCollide<typeof nodes[number]>().radius(node => node.size / 2 + 8).iterations(1))
      .force('x', forceX(0).strength(0.005))
      .force('y', forceY(0).strength(0.005))
    let iteration = 0
    const publishPositions = (status: LayoutResult['status']) => {
      const positions = new Float32Array(nodes.length * 2)
      nodes.forEach((node, i) => {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error('布局产生了无效坐标')
        positions[i * 2] = node.x
        positions[i * 2 + 1] = node.y
      })
      worker.postMessage({ version: request.version, status, positions, elapsedMs: performance.now() - started }, [positions.buffer])
    }
    const computeStarted = performance.now()
    while (simulation.alpha() > simulation.alphaMin() && iteration < 300 && performance.now() - computeStarted < 5000) {
      simulation.tick()
      iteration++
      if (request.animate && iteration % 4 === 0) {
        publishPositions('tick')
        // Pace small graphs so convergence is visible without flooding the draw queue.
        await new Promise(resolve => setTimeout(resolve, 32))
      }
    }
    simulation.stop()
    publishPositions(simulation.alpha() <= simulation.alphaMin() ? 'converged' : 'budget')
  } catch (error) {
    worker.postMessage({ version: request.version, error: error instanceof Error ? error.message : String(error) })
  }
}
