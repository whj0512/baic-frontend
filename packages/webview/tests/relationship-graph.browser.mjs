import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { cpus, totalmem } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.env.GRAPH_TEST_OUTPUT
if (!out) throw new Error('Set GRAPH_TEST_OUTPUT to a directory outside the repository')
await mkdir(out, { recursive: true })
if (!process.env.GRAPH_TEST_SKIP_BUILD) await build({ configFile: false, root, plugins: [react()], base: '/', logLevel: 'warn',
  build: { outDir: resolve(out, 'site'), emptyOutDir: false, rollupOptions: { input: resolve(root, 'tests/relationship-graph.html') } } })
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname
    const file = resolve(out, 'site', '.' + pathname)
    if (!file.startsWith(resolve(out, 'site'))) { response.writeHead(403).end(); return }
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(file)] || 'application/octet-stream')
    response.end(await readFile(file))
  } catch { response.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const modulePath = process.env.PLAYWRIGHT_MODULE
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
const url = `http://127.0.0.1:${server.address().port}/tests/relationship-graph.html`
const results = []
const checks = []
await page.addInitScript(() => {
  const NativeWorker = window.Worker
  window.workerStats = { active: 0, created: 0, maxActive: 0, ticks: 0, elapsed: [] }
  window.Worker = class extends NativeWorker {
    ended = false
    constructor(...args) {
      super(...args)
      const stats = window.workerStats
      stats.active++; stats.created++; stats.maxActive = Math.max(stats.maxActive, stats.active)
      this.addEventListener('message', ({ data }) => {
        if (data.status === 'tick') stats.ticks++
        if (data.status === 'converged' || data.status === 'budget') stats.elapsed.push(data.elapsedMs)
      })
    }
    terminate() {
      if (!this.ended) { window.workerStats.active--; this.ended = true }
      return super.terminate()
    }
  }
})
try {
  if (process.env.GRAPH_TEST_RESIZE_ONLY) {
    await page.goto(url + '?component')
    await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes('布局已收敛'))
    const readPaint = () => page.evaluate(() => {
      let bluePixels = 0
      const canvases = [...document.querySelectorAll('.antv-g6-graph-container canvas')]
      for (const canvas of canvases) {
        const context = canvas.getContext('2d')
        if (!context) continue
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] === 22 && pixels[i + 1] === 119 && pixels[i + 2] === 255 && pixels[i + 3] === 255) bluePixels++
        }
      }
      return { bluePixels, height: canvases[0]?.height, workersCreated: window.workerStats.created }
    })
    const initial = await readPaint()
    if (!initial.bluePixels) throw new Error('Fixture has no painted node before resize')
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const action of ['展开图例', '收起图例']) {
        const before = await readPaint()
        await page.getByRole('button', { name: action, exact: true }).click()
        await page.waitForFunction(height => document.querySelector('.antv-g6-graph-container canvas')?.height !== height, before.height)
        // No canvas click, wheel, redraw or layout call after changing the legend.
        await page.waitForTimeout(200)
        const after = await readPaint()
        checks.push({ name: action, cycle, before, after })
        await page.screenshot({ path: resolve(out, `legend-${cycle}-${action}.png`) })
        console.log('legend resize', { action, before, after })
        if (!after.bluePixels) throw new Error('Legend resize cleared the graph pixels')
        if (after.workersCreated !== initial.workersCreated) throw new Error('Legend resize restarted layout')
      }
    }
    await page.setViewportSize({ width: 1100, height: 720 })
    await page.waitForTimeout(250)
    if (!(await readPaint()).bluePixels) throw new Error('Window resize cleared the graph pixels')
    await page.screenshot({ path: resolve(out, 'legend-window-resize.png') })
  } else {
  for (const [nodes, edges, reducedMotion, animated] of [[200, 500, 'no-preference', true], [201, 500, 'no-preference', false], [200, 501, 'no-preference', false], [200, 500, 'reduce', false]]) {
    await page.emulateMedia({ reducedMotion })
    await page.goto(url)
    await page.waitForFunction(() => !!window.graphTest)
    await page.evaluate(([n, e]) => window.graphTest.load(n, e), [nodes, edges])
    if (animated) {
      await page.waitForFunction(() => window.graphTest.snapshot().firstComplete && window.workerStats.ticks > 2)
      const before = await page.evaluate(() => window.graphTest.graph().getNodeData('n0').style.x)
      await page.waitForFunction(x => window.graphTest.graph().getNodeData('n0').style.x !== x, before)
    }
    await page.waitForFunction(() => window.graphTest.snapshot().firstComplete && !window.graphTest.snapshot().state.busy)
    const worker = await page.evaluate(() => window.workerStats)
    if ((worker.ticks > 1) !== animated || worker.active !== 0) throw new Error(`Animation policy failed: ${nodes}/${edges}/${reducedMotion}`)
    checks.push({ name: 'finite animation policy', nodes, edges, reducedMotion, worker })
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  if (process.env.GRAPH_TEST_VIEWPORT) {
    await page.goto(url)
    await page.waitForFunction(() => !!window.graphTest)
    await page.evaluate(() => window.graphTest.load(10000, 30000))
    await page.waitForFunction(() => window.graphTest.snapshot().state?.viewport && !window.graphTest.snapshot().state.busy, null, { timeout: 60000 })
    console.log('viewport ready', await page.evaluate(() => window.graphTest.snapshot()))
    const initial = await page.evaluate(() => {
      const graph = window.graphTest.graph()
      return { snapshot: window.graphTest.snapshot(), visible: graph.getNodeData().filter(node => node.style.visibility === 'visible').map(node => node.id).sort(), focus: graph.getNodeData('n0').style }
    })
    if (initial.snapshot.state.viewport.nodes >= 10000 || initial.snapshot.edges >= 30000) throw new Error('Viewport did not reduce resident elements')
    await page.screenshot({ path: resolve(out, 'viewport-initial.png') })
    await page.evaluate(() => window.graphTest.graph().translateBy([-1200, 0], false))
    await page.waitForFunction(previous => window.graphTest.graph().getNodeData().some(node => node.style.visibility === 'visible' && !previous.includes(node.id)), initial.visible)
    await page.waitForTimeout(250)
    await page.screenshot({ path: resolve(out, 'viewport-pan.png') })
    await page.evaluate(() => window.graphTest.graph().translateBy([1200, 0], false))
    await page.waitForFunction(previous => JSON.stringify(window.graphTest.graph().getNodeData().filter(node => node.style.visibility === 'visible').map(node => node.id).sort()) === JSON.stringify(previous), initial.visible)
    const restored = await page.evaluate(() => window.graphTest.graph().getNodeData('n0').style)
    if (restored.x !== initial.focus.x || restored.y !== initial.focus.y) throw new Error('Panning changed layout coordinates')
    const zoomBefore = await page.evaluate(() => window.graphTest.graph().getZoom())
    await page.mouse.move(720, 465)
    await page.mouse.wheel(0, -120)
    await page.waitForFunction(zoom => window.graphTest.graph().getZoom() !== zoom, zoomBefore)
    await page.waitForTimeout(300)
    await page.evaluate(() => window.graphTest.graph().zoomTo(1, false, [720, 435]))
    const originBefore = await page.evaluate(() => window.graphTest.graph().getCanvasByViewport([0, 0]))
    await page.mouse.move(5, 35)
    await page.mouse.down()
    await page.mouse.move(605, 35, { steps: 24 })
    await page.mouse.up()
    await page.waitForFunction(origin => Math.abs(window.graphTest.graph().getCanvasByViewport([0, 0])[0] - origin[0]) > 500, originBefore)
    await page.waitForTimeout(300)
    await page.evaluate(() => window.graphTest.update(true, true))
    await page.waitForFunction(() => {
      const edges = window.graphTest.graph().getEdgeData()
      return edges.length > 0 && window.graphTest.snapshot().state.viewport.edges === edges.length
        && edges.every(edge => Number(edge.id.slice(1)) % 2 === 1 && edge.style.label === true)
    })
    const filtered = await page.evaluate(() => window.graphTest.snapshot())
    await page.evaluate(() => window.graphTest.graph().translateBy([1000000, 1000000], false))
    await page.waitForFunction(() => window.graphTest.graph().getNodeData().length === 0 && window.graphTest.graph().getEdgeData().length === 0 && window.graphTest.snapshot().state.viewport.nodes === 0)
    await page.evaluate(() => window.graphTest.graph().translateBy([-1000000, -1000000], false))
    await page.waitForFunction(expected => window.graphTest.snapshot().state.viewport.edges === expected
      && window.graphTest.graph().getEdgeData().length === expected
      && window.graphTest.graph().getNodeData().some(node => node.id === 'n0' && node.style.visibility === 'visible'), filtered.edges)
    checks.push({ name: '10k viewport pan, mouse drag, wheel zoom, eviction, re-entry, retained coordinates, labels and filtering', initial: initial.snapshot, filtered, restored: await page.evaluate(() => window.graphTest.snapshot()) })
  }
  if (process.env.GRAPH_TEST_SMOKE) {
    await page.goto(url + '?component')
    await page.locator('.antv-g6-graph-container').waitFor()
    await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes('布局已收敛'))
    const stage = await page.locator('.antv-g6-graph-container').boundingBox()
    await page.screenshot({ path: resolve(out, 'component-before-click.png') })
    console.log('component stage', stage)
    const nodePoint = await page.evaluate(() => {
      for (const canvas of document.querySelectorAll('.antv-g6-graph-container canvas')) {
        const context = canvas.getContext('2d')
        if (!context) continue
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
        let x = 0, y = 0, count = 0
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] === 22 && pixels[i + 1] === 119 && pixels[i + 2] === 255 && pixels[i + 3] === 255) {
            x += (i / 4) % canvas.width; y += Math.floor(i / 4 / canvas.width); count++
          }
        }
        if (count) { const box = canvas.getBoundingClientRect(); return { x: box.x + x / count / devicePixelRatio, y: box.y + y / count / devicePixelRatio } }
      }
      throw new Error('No painted node found')
    })
    await page.mouse.click(nodePoint.x, nodePoint.y)
    await page.getByTestId('selected').filter({ hasText: 'selected' }).waitFor()
    await page.getByRole('button', { name: '切换标签', exact: true }).click()
    await page.getByRole('button', { name: '扩展', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes('布局已收敛'))
    await page.screenshot({ path: resolve(out, 'component.png') })
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: '挂载/卸载', exact: true }).click()
      await page.waitForFunction(() => !document.querySelector('.antv-g6-graph-container') && window.workerStats.active === 0)
      await page.getByRole('button', { name: '挂载/卸载', exact: true }).click()
      await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes('布局已收敛'))
    }
    checks.push({ name: 'React StrictMode, selection panel, expansion, labels, 10 remounts', worker: await page.evaluate(() => window.workerStats) })
    await page.goto(url)
    await page.waitForFunction(() => !!window.graphTest)
    await page.evaluate(() => window.graphTest.load(300, 1000))
    await page.waitForFunction(() => window.graphTest.snapshot().firstComplete && !window.graphTest.snapshot().state.busy)
    await page.evaluate(() => window.graphTest.invalid())
    const invalid = await page.evaluate(() => window.graphTest.snapshot())
    if (!invalid.state.error || invalid.nodes !== 300 || invalid.edges !== 1000) throw new Error('Invalid graph replaced previous data')
    await page.evaluate(() => {
      window.graphTest.replace(500, 1800)
      window.graphTest.replace(50, 120)
      window.graphTest.update(true, true)
    })
    await page.waitForFunction(() => {
      const s = window.graphTest.snapshot()
      return s.nodes === 50 && s.edges === 120 && !s.state.busy
    })
    checks.push({ name: 'invalid data preserved and rapid replacements during loading', state: await page.evaluate(() => window.graphTest.snapshot()) })
    await page.evaluate(() => {
      window.graphTest.destroy()
      window.Worker = class { constructor() { throw new Error('test worker unavailable') } }
      window.graphTest.load(300, 1000)
    })
    await page.waitForFunction(() => window.graphTest.snapshot().firstComplete && !window.graphTest.snapshot().state.busy)
    checks.push({ name: 'Worker unavailable fallback', state: await page.evaluate(() => window.graphTest.snapshot()) })
    console.log('smoke', JSON.stringify(checks))
  }
  const sizes = process.env.GRAPH_TEST_SIZES ? JSON.parse(process.env.GRAPH_TEST_SIZES) : [[300, 1000], [3000, 10000], [10000, 30000]]
  const repeat = Number(process.env.GRAPH_TEST_REPEAT || 5)
  for (const [nodes, edges] of sizes) {
    for (let run = 0; run < repeat; run++) {
      await page.goto(url)
      await page.waitForFunction(() => !!window.graphTest)
      await page.evaluate(([n, e]) => window.graphTest.load(n, e), [nodes, edges])
      const progress = setInterval(() => {
        void page.evaluate(() => window.graphTest.snapshot()).then(snapshot => console.log('progress', snapshot.nodes, snapshot.edges, Math.round(snapshot.totalMs))).catch(() => {})
      }, 10000)
      try {
        await page.waitForFunction(([n, e]) => {
          const s = window.graphTest.snapshot()
          return s.state?.error || (!s.state?.busy && (s.state?.viewport
            ? s.state.viewport.totalNodes === n && s.state.viewport.totalEdges === e
            : s.nodes === n && s.edges === e))
        }, [nodes, edges], { timeout: 120000 })
      } catch (error) { errors.push(String(error)) }
      clearInterval(progress)
      const result = await page.evaluate(() => window.graphTest.snapshot())
      if (result.firstComplete || result.firstViewportComplete) {
        result.interaction = await page.evaluate(async () => {
          const frames = []
          let previous = await new Promise(resolve => requestAnimationFrame(resolve))
          const graph = window.graphTest.graph()
          for (let i = 0; i < 60; i++) {
            const now = await new Promise(resolve => requestAnimationFrame(resolve))
            if (now > previous) frames.push(now - previous)
            previous = now
            await graph.translateBy([i % 2 ? 3 : -3, 0], false)
          }
          frames.sort((a, b) => a - b)
          return { medianFps: 1000 / frames[Math.floor(frames.length / 2)], p95FrameMs: frames[Math.floor(frames.length * 0.95)] }
        })
      }
      result.input = { nodes, edges, run }
      result.worker = await page.evaluate(() => window.workerStats)
      result.errors = [...errors]
      console.log(JSON.stringify(result))
      results.push(result)
      await page.screenshot({ path: resolve(out, `graph-${nodes}-${run}.png`) })
    }
  }
  }
  await writeFile(resolve(out, 'results.json'), JSON.stringify({ browser: browser.version(), cpu: cpus()[0].model, memory: totalmem(), viewport: '1440x900 DPR 1', checks, results, errors }, null, 2))
} catch (error) {
  await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {})
  await writeFile(resolve(out, 'failure.json'), JSON.stringify({ error: String(error), errors, body: await page.locator('body').innerText().catch(() => '') }, null, 2))
  throw error
} finally {
  await browser.close()
  server.close()
}
