import type { Graph } from '@antv/x6'
import type { ModelImportOptions, ModelStrategy } from '../types'

type DialogMapDisplayVariant = {
  variant_id: string
  display_text: string
  condition: string
}

type DialogMapWidget = {
  id?: string
  widget_id: string
  type: string
  name: string
  action: string
  action_type: string
  target: string | null
  condition: string
  display_variants: DialogMapDisplayVariant[]
}

type DialogMapNode = {
  id: string
  type?: string
  type_name?: string
  name: string
  desc?: string
  x?: number
  y?: number
  widgets?: DialogMapWidget[]
}

type DialogMapTransition = {
  id: string
  name?: string
  source_node?: unknown
  target_node?: unknown
  source?: unknown
  target?: unknown
  from?: unknown
  to?: unknown
  trigger?: string
  trigger_type?: string
  condition?: string
  data_carried?: string[]
}

type DialogMapGraph = {
  id?: string
  name?: string
  desc?: string
  graph_type?: string
  entry_node?: string
  nodes?: DialogMapNode[]
  entry?: DialogMapNode
  pages?: DialogMapNode[]
  transitions?: DialogMapTransition[]
}

const isRecord = (value: unknown): value is Record<string, any> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
)

const asString = (value: unknown, fallback = '') => (
  typeof value === 'string' ? value : fallback
)

const normalizeDisplayVariants = (value: unknown): DialogMapDisplayVariant[] => (
  Array.isArray(value)
    ? value.filter(isRecord).map(variant => ({
      variant_id: asString(variant.variant_id ?? variant.variantId),
      display_text: asString(variant.display_text ?? variant.displayText),
      condition: asString(variant.condition),
    }))
    : []
)

const normalizeWidgets = (value: unknown): DialogMapWidget[] => (
  Array.isArray(value)
    ? value.filter(isRecord).map(widget => {
      const widgetId = asString(widget.widget_id ?? widget.widgetId ?? widget.id)
      return {
        id: asString(widget.id, widgetId),
        widget_id: widgetId,
        type: asString(widget.type),
        name: asString(widget.name),
        action: asString(widget.action),
        action_type: asString(widget.action_type ?? widget.actionType),
        target: widget.target === null ? null : asString(widget.target),
        condition: asString(widget.condition),
        display_variants: normalizeDisplayVariants(widget.display_variants ?? widget.variants),
      }
    })
    : []
)

const resolveNodeReference = (
  value: unknown,
  nodesById: Map<string, DialogMapNode>,
  nodeIdsByName: Map<string, string>,
) => {
  if (isRecord(value)) {
    return resolveNodeReference(value.id ?? value.name, nodesById, nodeIdsByName)
  }
  const reference = asString(value)
  if (nodesById.has(reference)) return reference
  return nodeIdsByName.get(reference) ?? reference
}

const getApiNodes = (graph: DialogMapGraph) => {
  if (Array.isArray(graph.nodes)) return graph.nodes
  const entry = graph.entry
    ? { ...graph.entry, type: graph.entry.type || graph.entry.type_name || 'entry' }
    : undefined
  const pages = Array.isArray(graph.pages)
    ? graph.pages.map(page => ({ ...page, type: page.type || page.type_name || 'page' }))
    : []
  return [entry, ...pages].filter((node): node is DialogMapNode => Boolean(node))
}

const getNodeKind = (node: DialogMapNode) => asString(node.type_name || node.type).toLowerCase()

const createNodeCell = (node: DialogMapNode) => {
  const kind = getNodeKind(node)
  const isEntry = kind === 'entry' || kind === 'start'
  if (!isEntry && kind !== 'page') {
    throw new Error(`DialogMap 包含不支持的节点类型：${kind || 'unknown'}`)
  }

  return {
    id: node.id,
    shape: isEntry ? 'start-node' : 'page-node',
    x: typeof node.x === 'number' ? node.x : 80,
    y: typeof node.y === 'number' ? node.y : 80,
    width: isEntry ? 30 : 120,
    height: isEntry ? 30 : 80,
    data: isEntry
      ? {
        nodeName: node.name || 'Start',
        stroke: '#333',
        fill: '#686666',
      }
      : {
        nodeName: node.name,
        comment: asString(node.desc),
        stroke: '#333',
        fill: '#f3f4f6',
        widgets: normalizeWidgets(node.widgets),
      },
  }
}

export const importDialogMapGraph = (
  source: string | object,
  options: ModelImportOptions = {},
): object => {
  const parsed = typeof source === 'string' ? JSON.parse(source) : source
  if (!isRecord(parsed)) throw new Error('DialogMap 图数据必须是 JSON 对象')
  if (Array.isArray(parsed.cells)) return parsed

  const graph = parsed as DialogMapGraph
  const apiNodes = getApiNodes(graph)
  const entryNodes = apiNodes.filter(node => ['entry', 'start'].includes(getNodeKind(node)))
  if (entryNodes.length !== 1) {
    throw new Error(`DialogMap 必须且只能包含一个 Entry，当前为 ${entryNodes.length} 个`)
  }

  const nodesById = new Map(apiNodes.map(node => [node.id, node]))
  const nodeIdsByName = new Map(apiNodes.map(node => [node.name, node.id]))
  const nodeCells = apiNodes.map(createNodeCell)
  const edgeCells = (Array.isArray(graph.transitions) ? graph.transitions : []).map((transition, index) => {
    const source = resolveNodeReference(
      transition.source_node ?? transition.source ?? transition.from,
      nodesById,
      nodeIdsByName,
    )
    const target = resolveNodeReference(
      transition.target_node ?? transition.target ?? transition.to,
      nodesById,
      nodeIdsByName,
    )
    if (!nodesById.has(source) || !nodesById.has(target)) {
      throw new Error(`Transition ${transition.name || index + 1} 引用了不存在的节点`)
    }

    return {
      id: transition.id || `transition-${index + 1}`,
      shape: 'edge',
      source,
      target,
      attrs: {
        line: {
          stroke: '#1890ff',
          strokeWidth: 2,
          targetMarker: { name: 'block', width: 12, height: 8 },
        },
      },
      router: { name: 'manhattan' },
      connector: { name: 'rounded', args: { radius: 8 } },
      data: {
        edgeName: transition.name || `Transition_${index + 1}`,
        trigger: asString(transition.trigger),
        trigger_type: asString(transition.trigger_type, 'click'),
        condition: asString(transition.condition),
        data_carried: Array.isArray(transition.data_carried)
          ? transition.data_carried.filter((item): item is string => typeof item === 'string')
          : [],
      },
    }
  })

  return {
    cells: [...nodeCells, ...edgeCells],
    canvasData: {
      id: asString(graph.id),
      name: asString(graph.name) || options.modelName || 'DialogMap',
      desc: asString(graph.desc),
    },
  }
}

const requireName = (value: unknown, label: string) => {
  const name = asString(value).trim()
  if (!name) throw new Error(`${label}不能为空`)
  return name
}

const normalizeWidgetForExport = (
  rawWidget: Record<string, any>,
  pageNames: Set<string>,
  widgetIds: Set<string>,
) => {
  const widgetId = requireName(rawWidget.widget_id ?? rawWidget.widgetId ?? rawWidget.id, 'widget_id')
  if (widgetIds.has(widgetId)) throw new Error(`widget_id “${widgetId}”在全图中重复`)
  widgetIds.add(widgetId)

  const actionType = requireName(rawWidget.action_type ?? rawWidget.actionType, `Widget ${widgetId} 的 action_type`)
  const target = rawWidget.target === null ? null : asString(rawWidget.target).trim()
  if (actionType === 'navigate' && (!target || !pageNames.has(target))) {
    throw new Error(`Widget ${widgetId} 的目标页面不存在`)
  }

  return {
    id: widgetId,
    widget_id: widgetId,
    type: requireName(rawWidget.type, `Widget ${widgetId} 的 type`),
    name: requireName(rawWidget.name, `Widget ${widgetId} 的 name`),
    action: asString(rawWidget.action),
    action_type: actionType,
    target: actionType === 'navigate' ? target : null,
    condition: asString(rawWidget.condition),
    display_variants: normalizeDisplayVariants(rawWidget.display_variants ?? rawWidget.variants),
  }
}

export const exportDialogMapGraph = (graph: Graph): object => {
  const nodes = graph.getNodes()
  const entryNodes = nodes.filter(node => node.shape === 'start-node')
  if (entryNodes.length !== 1) {
    throw new Error(`DialogMap 必须且只能包含一个 Entry，当前为 ${entryNodes.length} 个`)
  }
  const unsupportedNode = nodes.find(node => node.shape !== 'start-node' && node.shape !== 'page-node')
  if (unsupportedNode) throw new Error(`DialogMap 包含不支持的节点：${unsupportedNode.shape}`)

  const canvasData = (graph as any).canvasData || {}
  const pageNodes = nodes.filter(node => node.shape === 'page-node')
  const pageNames = new Set<string>()
  pageNodes.forEach(node => {
    const name = requireName(node.getData()?.nodeName, 'Page 名称')
    if (pageNames.has(name)) throw new Error(`Page 名称“${name}”重复`)
    pageNames.add(name)
  })

  const widgetIds = new Set<string>()
  const exportedNodes = nodes.map(node => {
    const data = node.getData() || {}
    const position = node.position()
    const isEntry = node.shape === 'start-node'
    return {
      id: node.id,
      type: isEntry ? 'entry' : 'page',
      type_name: isEntry ? 'entry' : 'page',
      name: requireName(data.nodeName, isEntry ? 'Entry 名称' : 'Page 名称'),
      ...(asString(data.comment) ? { desc: asString(data.comment) } : {}),
      x: position.x,
      y: position.y,
      ...(isEntry
        ? {}
        : {
          widgets: (Array.isArray(data.widgets) ? data.widgets : [])
            .filter(isRecord)
            .map(widget => normalizeWidgetForExport(widget, pageNames, widgetIds)),
        }),
    }
  })

  const transitions = graph.getEdges().map((edge, index) => {
    const source = edge.getSourceCell()
    const target = edge.getTargetCell()
    if (!source || !target) throw new Error(`Transition ${index + 1} 的起点或终点不存在`)
    const data = edge.getData() || {}
    const triggerType = asString(data.trigger_type, source.shape === 'start-node' ? 'auto' : 'click')
    const trigger = asString(data.trigger).trim()

    if (triggerType !== 'click' && triggerType !== 'auto') {
      throw new Error(`Transition ${data.edgeName || index + 1} 的 trigger_type 必须为 click 或 auto`)
    }

    if (source.shape === 'start-node' && (triggerType !== 'auto' || trigger)) {
      throw new Error('Entry 出边必须使用 auto 且 trigger 为空')
    }
    if (triggerType === 'click') {
      const sourceWidgetIds = new Set(
        (Array.isArray(source.getData()?.widgets) ? source.getData().widgets : [])
          .map((widget: any) => asString(widget?.widget_id ?? widget?.widgetId ?? widget?.id)),
      )
      if (!trigger || !sourceWidgetIds.has(trigger)) {
        throw new Error(`Transition ${data.edgeName || index + 1} 的 trigger 不是源 Page 的 widget_id`)
      }
    }

    return {
      id: edge.id,
      name: requireName(data.edgeName, `Transition ${index + 1} 名称`),
      trigger: triggerType === 'auto' ? '' : trigger,
      trigger_type: triggerType,
      source_node: source.id,
      target_node: target.id,
      condition: asString(data.condition),
      data_carried: Array.isArray(data.data_carried)
        ? data.data_carried.filter((item: unknown): item is string => typeof item === 'string')
        : [],
    }
  })

  return {
    id: asString(canvasData.id) || `dialog-map-${Date.now()}`,
    name: requireName(canvasData.name, 'DialogMap 名称'),
    desc: asString(canvasData.desc),
    graph_type: 'UI',
    entry_node: entryNodes[0].id,
    nodes: exportedNodes,
    transitions,
  }
}

const dialogMapStrategy: ModelStrategy = {
  exportGraphToJSON: exportDialogMapGraph,
  importGraphFromJSON: importDialogMapGraph,
  createEmptyGraphData: ({ modelName } = {}) => ({
    cells: [],
    canvasData: {
      name: modelName || 'DialogMap',
      desc: '',
    },
  }),
}

export default dialogMapStrategy
