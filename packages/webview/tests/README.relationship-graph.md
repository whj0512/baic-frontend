# Relationship graph validation

Run the deterministic data and queue tests:

```powershell
npm run test:relationship-graph --workspace @baic/webview
```

The browser fixture builds the real renderer and Worker in production mode, independent of backend authentication. It is a test entry point, not part of the application routes or extension assets.

Run `node packages/webview/tests/relationship-graph.browser.mjs` from the repository root with:

- `GRAPH_TEST_OUTPUT`: absolute output directory outside the repository (HTML bundle, screenshots and JSON results).
- `PLAYWRIGHT_MODULE`: optional absolute path to an installed Playwright `index.mjs`; otherwise resolves `playwright` normally. Chrome must be installed.
- `GRAPH_TEST_SMOKE=1`: exercise the React component, selection, expansion, StrictMode remounts, stale updates and Worker failure fallback.
- `GRAPH_TEST_RESIZE_ONLY=1`: exercise the actual legend/status component expanding and collapsing three times, then resize the window. Assert node pixels remain painted without canvas input and no new layout Worker starts.
- `GRAPH_TEST_VIEWPORT=1`: exercise 10k/30k viewport loading, pan/re-entry, offscreen eviction, coordinate retention and relation filtering.
- `GRAPH_TEST_REPEAT`: defaults to 5.
- `GRAPH_TEST_SIZES`: defaults to `[[300,1000],[3000,10000],[10000,30000]]`.
- `GRAPH_TEST_SKIP_BUILD=1`: only reuse an existing fixture bundle when source has not changed.

Keep hardware/browser/viewport fixed when comparing runs. The runner uses 1440×900, DPR 1 and records the browser version, CPU and RAM. Loading time and G6 draw API time are different measurements; actual raster painting is coalesced separately. Long tasks and full-frame repaint latency must be inspected alongside navigation frame rate. A passing build is not evidence of meeting the performance targets.

Acceptance targets for the default label mode: first meaningful content within 2 s, all elements within 10 s, median navigation frame rate at least 30 FPS, interaction response P95 within 200 ms. Also check explicit all-label mode, 10 minutes of repeated interactions, and 10 mount/unmount cycles. Preserve every node/edge ID and report any unmet target rather than truncating the fixture.

Viewport virtualization applies at 3,000 nodes or 10,000 edges. The full validated graph and all layout coordinates stay in memory; only the current viewport plus a 240-screen-pixel buffer is submitted to G6. The initial view centers the focus at zoom 1. Panning/zooming queries a bounding-volume index, with updates coalesced every 50 ms, and evicts offscreen drawing objects. Crossing edges retain their real endpoints as hidden anchors, without recursively loading those endpoints' other edges. Selection and layout coordinates survive eviction. This is rendering virtualization, not backend pagination.

In virtual mode `nodes`/`edges` in benchmark results are resident G6 counts (nodes include hidden endpoint anchors). `state.viewport` reports visible/buffer and complete graph counts. `firstViewportComplete` measures the initial viewport submission; it must not be presented as the previous full-graph loading metric `firstComplete`. Zooming out to the entire graph can still load every element and incur the original cost; no data-count cap or aggregation is applied.

Layout computation is cancellable and finite: BFS seeds, then at most 300 D3 iterations or 5 seconds. Graphs with 2–200 nodes and at most 500 edges show progressive force convergence, posting coordinates every four iterations with 32 ms pacing. Both limits must hold; reduced-motion users, empty/single-node graphs and larger graphs only receive initial/final coordinates. This conservative animation threshold is separate from the large-graph decoration policy. Dragging invalidates old layout results. A Worker failure retains valid data and uses the yielding seed generator. Ordinary data/style updates, coordinate commits and visibility updates share a latest-task queue. Virtual views paint their resident elements during navigation; nonvirtual large views use a temporary bitmap and repaint after settling.

No ESLint or `tsc --noEmit` invocation is required locally; those checks remain with CI.
