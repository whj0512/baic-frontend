import type { GraphData } from '@antv/g6'
import { fetchGraphDBGraph } from '../../config/graphdbGraph'
import type {
  GraphDBGraphMeta,
  GraphDBGraphRequest,
} from '../../models/GraphDBGraph'
import {
  buildMergedGraphMeta,
  buildReadableGraphData,
  buildRootGraphRequest,
  DEFAULT_GRAPH_REQUEST,
  getRequirementRootIds,
  mergeGraphData,
} from './relationshipGraphModel'
import type { NodeTypeColorResolver } from './relationshipGraphModel'

const ROOT_QUERY_CONCURRENCY = 6

export interface RelationshipGraphSnapshot {
  graphData: GraphData
  meta: GraphDBGraphMeta
  focusNode: string | null
  expandedRootIds: string[]
}

export interface RelationshipGraphExpansion {
  graphData: GraphData
  meta: GraphDBGraphMeta
  root: string
}

export async function loadRelationshipGraph(
  request: GraphDBGraphRequest,
  signal: AbortSignal,
  resolveNodeColor: NodeTypeColorResolver,
): Promise<RelationshipGraphSnapshot> {
  if (request.root) {
    const response = await fetchGraphDBGraph(request, signal)
    const focusNode = response.meta.root || request.root

    return {
      graphData: buildReadableGraphData(response, resolveNodeColor),
      meta: response.meta,
      focusNode,
      expandedRootIds: focusNode ? [focusNode] : [],
    }
  }

  const discoveryResponse = await fetchGraphDBGraph(DEFAULT_GRAPH_REQUEST, signal)
  const overviewRoots = getRequirementRootIds(discoveryResponse.nodes)
  const rootResponses = await mapWithConcurrency(
    overviewRoots,
    ROOT_QUERY_CONCURRENCY,
    root => fetchGraphDBGraph(buildRootGraphRequest(request, root), signal),
  )
  const graphData = rootResponses.reduce<GraphData>(
    (merged, response) => mergeGraphData(
      merged,
      buildReadableGraphData(response, resolveNodeColor),
    ),
    { nodes: [], edges: [] },
  )

  return {
    graphData,
    meta: buildMergedGraphMeta(request, discoveryResponse, rootResponses, graphData),
    focusNode: null,
    expandedRootIds: overviewRoots,
  }
}

export async function loadRelationshipGraphExpansion(
  request: GraphDBGraphRequest,
  root: string,
  signal: AbortSignal,
  resolveNodeColor: NodeTypeColorResolver,
): Promise<RelationshipGraphExpansion> {
  const response = await fetchGraphDBGraph(
    buildRootGraphRequest(request, root),
    signal,
  )

  return {
    graphData: buildReadableGraphData(response, resolveNodeColor),
    meta: response.meta,
    root: response.meta.root || root,
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await worker(items[currentIndex])
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => runWorker(),
    ),
  )

  return results
}
