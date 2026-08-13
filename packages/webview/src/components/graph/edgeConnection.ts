import { Graph as X6Graph } from '@antv/x6'
import type { Edge, EdgeView, Graph, Node } from '@antv/x6'
import type { GraphStrategy } from './strategies/types'
import { isPreConnectionPreview } from './flowGraph/preConnectionData'
import { isSequenceConnectionPreview } from './flowGraph/sequenceConnectionData'

type Terminal = {
  cell?: string
  port?: string
  x?: number
  y?: number
}

type RawTerminal = Terminal | string | null | undefined

type HotPortSide = 'top' | 'right' | 'bottom' | 'left'

type SequenceEdgeGeometry = {
  source: { x: number; y: number }
  target: { x: number; y: number }
  y?: number
}

const HOT_PORT_PREFIX = 'connection-hot-'
const HOT_EDGE_THICKNESS = 10
const CONNECTION_NODE_HIGHLIGHTER = 'baic-connection-node-highlight'
const CONNECTION_MAGNET_NOOP_HIGHLIGHTER = 'baic-connection-magnet-noop'

let connectionHighlightersRegistered = false

export const registerConnectionHighlighters = () => {
  if (connectionHighlightersRegistered) return

  X6Graph.registerHighlighter(CONNECTION_MAGNET_NOOP_HIGHLIGHTER, {
    highlight() {},
    unhighlight() {},
  }, true)

  X6Graph.registerHighlighter(CONNECTION_NODE_HIGHLIGHTER, {
    highlight(cellView: any, _magnet: Element | null, args: Record<string, any>) {
      cellView.highlight(null, {
        highlighter: {
          name: 'stroke',
          args,
        },
      })
    },
    unhighlight(cellView: any, _magnet: Element | null, args: Record<string, any>) {
      cellView.unhighlight(null, {
        highlighter: {
          name: 'stroke',
          args,
        },
      })
    },
  }, true)

  connectionHighlightersRegistered = true
}

export const connectionHighlighting = {
  nodeAvailable: {
    name: CONNECTION_NODE_HIGHLIGHTER,
    args: {
      connectionHighlightKey: 'nodeAvailable',
      padding: 3,
      attrs: {
        stroke: '#FFA500',
        strokeWidth: 2,
      },
    },
  },
  magnetAvailable: {
    name: CONNECTION_MAGNET_NOOP_HIGHLIGHTER,
  },
  magnetAdsorbed: {
    name: CONNECTION_NODE_HIGHLIGHTER,
    args: {
      connectionHighlightKey: 'magnetAdsorbed',
      padding: 3,
      attrs: {
        stroke: '#FFA500',
        strokeWidth: 2,
      },
    },
  },
}

export const connectionNoopHighlighting = {
  name: CONNECTION_MAGNET_NOOP_HIGHLIGHTER,
}

const hotPortGroups = {
  'connection-hot-top': {
    position: 'top',
    markup: [{ tagName: 'rect', selector: 'rect' }],
    attrs: {
      rect: {
        x: -28,
        y: -4,
        width: 56,
        height: 8,
        rx: 0,
        ry: 0,
        magnet: true,
        stroke: '#BBFFFF',
        fill: '#e6f7ff',
        strokeWidth: 1,
        opacity: 0,
        cursor: 'crosshair',
        'pointer-events': 'none',
      },
    },
  },
  'connection-hot-right': {
    position: 'right',
    markup: [{ tagName: 'rect', selector: 'rect' }],
    attrs: {
      rect: {
        x: -4,
        y: -28,
        width: 8,
        height: 56,
        rx: 0,
        ry: 0,
        magnet: true,
        stroke: '#BBFFFF',
        fill: '#e6f7ff',
        strokeWidth: 1,
        opacity: 0,
        cursor: 'crosshair',
        'pointer-events': 'none',
      },
    },
  },
  'connection-hot-bottom': {
    position: 'bottom',
    markup: [{ tagName: 'rect', selector: 'rect' }],
    attrs: {
      rect: {
        x: -28,
        y: -4,
        width: 56,
        height: 8,
        rx: 0,
        ry: 0,
        magnet: true,
        stroke: '#BBFFFF',
        fill: '#e6f7ff',
        strokeWidth: 1,
        opacity: 0,
        cursor: 'crosshair',
        'pointer-events': 'none',
      },
    },
  },
  'connection-hot-left': {
    position: 'left',
    markup: [{ tagName: 'rect', selector: 'rect' }],
    attrs: {
      rect: {
        x: -4,
        y: -28,
        width: 8,
        height: 56,
        rx: 0,
        ry: 0,
        magnet: true,
        stroke: '#BBFFFF',
        fill: '#e6f7ff',
        strokeWidth: 1,
        opacity: 0,
        cursor: 'crosshair',
        'pointer-events': 'none',
      },
    },
  },
}

const hotPorts = [
  { id: 'connection-hot-top', group: 'connection-hot-top', data: { connectionHotPort: true } },
  { id: 'connection-hot-right', group: 'connection-hot-right', data: { connectionHotPort: true } },
  { id: 'connection-hot-bottom', group: 'connection-hot-bottom', data: { connectionHotPort: true } },
  { id: 'connection-hot-left', group: 'connection-hot-left', data: { connectionHotPort: true } },
]

export const isSequenceEdgeMode = (strategy: GraphStrategy) => {
  return !strategy.edgeRules && strategy.edgeMode === 'sequence'
}

const withDefaultEdgeData = (strategy: GraphStrategy, data: Record<string, any> = {}) => ({
  ...(strategy.getDefaultEdgeData?.() || {}),
  ...data,
})

const getPortGroup = (node: Node, portId?: string | null) => {
  if (!portId) return undefined
  return node.getPorts().find((port) => port.id === portId)?.group
}

const getPortsByGroup = (node: Node, group: string) => {
  return node.getPorts().filter((port) => port.group === group)
}

const isHotPortGroup = (group?: string | null) => {
  return Boolean(group?.startsWith(HOT_PORT_PREFIX))
}

const isHotPortId = (portId?: string | null) => {
  return Boolean(portId?.startsWith(HOT_PORT_PREFIX))
}

const getHotPortSide = (portId?: string | null): HotPortSide | null => {
  if (!isHotPortId(portId)) return null
  return portId?.replace(HOT_PORT_PREFIX, '') as HotPortSide
}

const getHotPortRectAttrs = (node: Node, portId: string, visible: boolean) => {
  const { width, height } = node.getSize()
  const side = getHotPortSide(portId)
  const horizontal = side === 'top' || side === 'bottom'
  let x = -width / 2
  let y = -height / 2

  if (side === 'top') {
    y = -HOT_EDGE_THICKNESS
  } else if (side === 'bottom') {
    y = 0
  } else if (side === 'left') {
    x = -HOT_EDGE_THICKNESS
  } else if (side === 'right') {
    x = 0
  }

  return {
    x,
    y,
    width: horizontal ? width : HOT_EDGE_THICKNESS,
    height: horizontal ? HOT_EDGE_THICKNESS : height,
    rx: 0,
    ry: 0,
    stroke: '#00BFFF',
    fill: '#00BFFF',
    strokeWidth: 0,
    opacity: visible ? 0.95 : 0,
    magnet: true,
    cursor: 'crosshair',
    'pointer-events': visible ? 'all' : 'none',
  }
}

const addPortIfMissing = (node: Node, port: Record<string, any>) => {
  if (node.getPorts().some((item) => item.id === port.id)) return
  node.addPort(port)
}

const mergePortGroups = (node: Node, groups: Record<string, any>) => {
  const existingGroups = (node.prop('ports/groups') || {}) as Record<string, any>
  const nextGroups = {
    ...existingGroups,
    ...groups,
  }

  if (JSON.stringify(existingGroups) !== JSON.stringify(nextGroups)) {
    node.prop('ports/groups', nextGroups)
  }
}

const normalizeRulePortGroups = (groups: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(groups).map(([groupName, groupConfig]) => {
      const attrs = groupConfig.attrs || {}
      const selector = attrs.circle ? 'circle' : attrs.rect ? 'rect' : null
      if (!selector) return [groupName, groupConfig]

      return [
        groupName,
        {
          ...groupConfig,
          attrs: {
            ...attrs,
            [selector]: {
              ...attrs[selector],
              magnet: groupName === 'in' ? 'passive' : true,
            },
          },
        },
      ]
    })
  )
}

const ensureRulePortGroups = (node: Node, strategy: GraphStrategy) => {
  const portGroups = strategy.edgeRules?.getPortGroups?.(node.shape)
  if (!portGroups) return
  mergePortGroups(node, normalizeRulePortGroups(portGroups))
}

const ensureRuleInitialPorts = (node: Node, strategy: GraphStrategy) => {
  const initialPorts = strategy.edgeRules?.getInitialPorts?.(node.shape) || []
  initialPorts.forEach((port) => addPortIfMissing(node, port))
}

const showPreviouslyHiddenDynamicPorts = (node: Node) => {
  node.getPorts().forEach((port) => {
    if (!port.id || (port.group !== 'in' && port.group !== 'out')) return

    const data = (node.getPortProp(port.id, 'data') || {}) as Record<string, any>
    if (!data.autoHiddenPort) return

    node.setPortProp(port.id, 'attrs', {})
    node.setPortProp(port.id, 'data', {
      ...data,
      autoHiddenPort: false,
      dynamicPort: true,
    })
  })
}

const ensureHotPorts = (node: Node) => {
  mergePortGroups(node, hotPortGroups)
  hotPorts.forEach((port) => addPortIfMissing(node, port))
  setNodeConnectionHotAreaVisible(node, false)
}

export const ensureNodeConnectionPorts = (node: Node, strategy: GraphStrategy) => {
  if (isSequenceEdgeMode(strategy)) return

  if (strategy.edgeRules) {
    ensureRulePortGroups(node, strategy)
    ensureRuleInitialPorts(node, strategy)
    showPreviouslyHiddenDynamicPorts(node)
    ensureHotPorts(node)
    return
  }

  ensureHotPorts(node)
}

export const toSerializableGraphJSON = (graph: Graph) => {
  const json = graph.toJSON() as any
  const canvasData = (graph as any).canvasData

  return {
    ...json,
    ...(canvasData && typeof canvasData === 'object' ? { canvasData } : {}),
    cells: json.cells
      ?.filter((cell: any) => !isPreConnectionPreview(cell) && !isSequenceConnectionPreview(cell))
      .map((cell: any) => {
        if (!cell.ports) return cell

        const groups = Object.fromEntries(
          Object.entries(cell.ports.groups || {}).filter(([groupName]) => !isHotPortGroup(groupName))
        )
        const items = (cell.ports.items || []).filter((port: any) => !isHotPortId(port.id) && !isHotPortGroup(port.group))

        return {
          ...cell,
          ports: {
            ...cell.ports,
            groups,
            items,
          },
        }
      }),
  }
}

export const setNodeConnectionHotAreaVisible = (node: Node, visible: boolean) => {
  hotPorts.forEach((port) => {
    if (!port.id || !node.getPorts().some((item) => item.id === port.id)) return
    const existingAttrs = (node.getPortProp(port.id, 'attrs/rect') || {}) as Record<string, any>
    node.setPortProp(port.id, 'attrs/rect', {
      ...existingAttrs,
      ...getHotPortRectAttrs(node, port.id, visible),
    })
  })
}

const canUseNodeAsSource = (node: Node, strategy: GraphStrategy) => {
  if (!strategy.edgeRules) return true
  ensureNodeConnectionPorts(node, strategy)
  const supportsMultiple = strategy.edgeRules.supportsMultiplePorts?.(node.shape) ?? false
  if (supportsMultiple) return true

  return node.getPorts().some((port) => {
    const group = port.group || ''
    return group === 'out' || group.startsWith('out-')
  })
}

const canUseNodeAsTarget = (node: Node, strategy: GraphStrategy) => {
  if (!strategy.edgeRules) return true
  ensureNodeConnectionPorts(node, strategy)
  const supportsMultiple = strategy.edgeRules.supportsMultiplePorts?.(node.shape) ?? false
  if (supportsMultiple) return true

  return node.getPorts().some((port) => port.group === 'in')
}

export const validateNodeConnection = (args: any, strategy: GraphStrategy) => {
  const sourceNode = args.sourceCell as Node | null | undefined
  const targetNode = args.targetCell as Node | null | undefined

  if (isSequenceEdgeMode(strategy) && (!sourceNode || !targetNode)) return true
  if (!sourceNode?.isNode?.() || !targetNode?.isNode?.()) return false
  if (sourceNode === targetNode && !isSequenceEdgeMode(strategy)) return false
  if (!canUseNodeAsSource(sourceNode, strategy)) return false
  if (!canUseNodeAsTarget(targetNode, strategy)) return false

  if (strategy.edgeRules) {
    const sourcePortId = args.sourcePort || args.sourceMagnet?.getAttribute?.('port')
    const sourcePortGroup = getPortGroup(sourceNode, sourcePortId)
    if (sourcePortGroup === 'in') return false
    if (sourcePortGroup && !isHotPortGroup(sourcePortGroup) && sourcePortGroup !== 'out' && !sourcePortGroup.startsWith('out-')) {
      return false
    }
  }

  return true
}

const getUsedPortIds = (graph: Graph, node: Node, nodeId: string, direction: 'source' | 'target', excludingEdgeId?: string) => {
  return new Set(
    graph
      .getConnectedEdges(node)
      .filter((edge) => edge.id !== excludingEdgeId)
      .map((edge) => {
        const terminal = (direction === 'source' ? edge.getSource() : edge.getTarget()) as Terminal
        return terminal?.cell === nodeId ? terminal.port : undefined
      })
      .filter((portId): portId is string => Boolean(portId))
  )
}

const nextPortId = (ports: Array<{ id?: string | null }>, prefix: string) => {
  let index = ports.length
  let portId = `${prefix}-${index}`
  const existingIds = new Set(ports.map((port) => port.id))
  while (existingIds.has(portId)) {
    index += 1
    portId = `${prefix}-${index}`
  }
  return portId
}

const createDynamicPort = (id: string, group: 'in' | 'out') => ({
  id,
  group,
  data: {
    dynamicPort: true,
  },
})

const getBusinessPortsByGroup = (node: Node, group: 'in' | 'out') => {
  return getPortsByGroup(node, group)
}

const findOrCreateOutputPort = (graph: Graph, strategy: GraphStrategy, node: Node, nodeId: string, currentPortId?: string | null, excludingEdgeId?: string) => {
  const nodeShape = node.shape
  const currentGroup = getPortGroup(node, currentPortId)

  if (nodeShape === 'condition-node') {
    const hotSide = getHotPortSide(currentPortId)
    if (hotSide === 'left') return 'out-yes'
    if (hotSide === 'right') return 'out-no'
    return currentGroup?.startsWith('out-') ? currentPortId || null : 'out-yes'
  }

  const supportsMultiple = strategy.edgeRules?.supportsMultiplePorts?.(nodeShape) ?? false
  let outPorts = getBusinessPortsByGroup(node, 'out')

  if (outPorts.length === 0 && supportsMultiple) {
    const newPortId = 'out-0'
    node.addPort(createDynamicPort(newPortId, 'out'))
    return newPortId
  }

  if (outPorts.length === 0) return null

  if (!supportsMultiple) return outPorts[0]?.id || null

  const usedOutputPortIds = getUsedPortIds(graph, node, nodeId, 'source', excludingEdgeId)
  if (currentPortId && currentGroup === 'out' && !usedOutputPortIds.has(currentPortId)) {
    return currentPortId
  }

  const freePort = outPorts.find((port) => port.id && !usedOutputPortIds.has(port.id))
  if (freePort?.id) return freePort.id

  outPorts = getBusinessPortsByGroup(node, 'out')
  const newPortId = nextPortId(outPorts, 'out')
  node.addPort(createDynamicPort(newPortId, 'out'))
  return newPortId
}

const findOrCreateInputPort = (graph: Graph, strategy: GraphStrategy, node: Node, nodeId: string, excludingEdgeId?: string) => {
  const supportsMultiple = strategy.edgeRules?.supportsMultiplePorts?.(node.shape) ?? false
  let inPorts = getBusinessPortsByGroup(node, 'in')

  if (inPorts.length === 0 && supportsMultiple) {
    const newPortId = 'in-0'
    node.addPort(createDynamicPort(newPortId, 'in'))
    return newPortId
  }

  if (inPorts.length === 0) return null

  if (!supportsMultiple) return inPorts[0]?.id || null

  const usedInputPortIds = getUsedPortIds(graph, node, nodeId, 'target', excludingEdgeId)
  const freePort = inPorts.find((port) => port.id && !usedInputPortIds.has(port.id))
  if (freePort?.id) return freePort.id

  inPorts = getBusinessPortsByGroup(node, 'in')
  const newPortId = nextPortId(inPorts, 'in')
  node.addPort(createDynamicPort(newPortId, 'in'))
  return newPortId
}

const applyConditionLabel = (edge: Edge, sourcePortId: string | null) => {
  if (sourcePortId !== 'out-yes' && sourcePortId !== 'out-no') return

  const conditionText = sourcePortId === 'out-yes' ? '[Yes]' : '[No]'
  edge.setData({
    ...edge.getData(),
    condition: conditionText,
    sourceOutput: sourcePortId,
  })
  edge.setLabels([{ attrs: { text: { text: conditionText } } }])
}

const formatSequenceLabel = (data: Record<string, any>) => {
  const parts = []
  if (data.stereotype && data.stereotype !== 'base') {
    parts.push(`<<${data.stereotype}>>`)
  }
  const msg = data.message || ''
  const prm = data.params ? data.params.map((item: any) => `${item.name}: ${item.type}`).join(', ') : ''
  const ret = data.returnType ? `: ${data.returnType}` : ''
  const mainPart = `${msg}(${prm})${ret}`
  if (mainPart !== '()') {
    parts.push(mainPart)
  }
  return parts.join('\n')
}

export const ensureSequenceEdgeVerticesTool = (edge: Edge) => {
  if (edge.hasTool('vertices')) return

  edge.addTools([
    {
      name: 'vertices',
      args: {
        modifiers: 'shift',
        attrs: {
          fill: '#1890ff',
          stroke: '#fff',
          strokeWidth: 2,
          r: 5,
        },
      },
    },
  ])
}

const countSequenceEdgesBetween = (graph: Graph, edge: Edge, sourceId: string, targetId: string) => {
  return graph.getEdges().filter((item) => {
    if (item.id === edge.id) return false

    const source = item.getSource() as Terminal
    const target = item.getTarget() as Terminal
    const data = item.getData() || {}
    const itemSourceId = source?.cell || data.sourceId
    const itemTargetId = target?.cell || data.targetId

    return (itemSourceId === sourceId || itemTargetId === targetId) ||
      (itemSourceId === targetId || itemTargetId === sourceId)
  }).length
}

const finalizeRuleEdge = (graph: Graph, strategy: GraphStrategy, edge: Edge, sourceNode: Node, targetNode: Node) => {
  ensureNodeConnectionPorts(sourceNode, strategy)
  ensureNodeConnectionPorts(targetNode, strategy)

  const sourcePortId = findOrCreateOutputPort(graph, strategy, sourceNode, sourceNode.id, edge.getSourcePortId(), edge.id)
  const targetPortId = findOrCreateInputPort(graph, strategy, targetNode, targetNode.id, edge.id)
  if (!sourcePortId || !targetPortId) return false

  edge.setSource({ cell: sourceNode.id, port: sourcePortId })
  edge.setTarget({ cell: targetNode.id, port: targetPortId })
  const nextEdgeData = {
    ...withDefaultEdgeData(strategy, edge.getData()),
    sourceOutput: sourcePortId,
  }
  edge.setData(strategy.finalizeEdgeData
    ? strategy.finalizeEdgeData(nextEdgeData, sourceNode, targetNode, graph)
    : nextEdgeData)
  applyConditionLabel(edge, sourcePortId)

  return true
}

const isValidRuleOutputPort = (node: Node, portId?: string | null) => {
  const group = getPortGroup(node, portId)
  return Boolean(group && !isHotPortGroup(group) && (group === 'out' || group.startsWith('out-')))
}

const isValidRuleInputPort = (node: Node, portId?: string | null) => {
  return getPortGroup(node, portId) === 'in'
}

const shouldRepairRuleEdgePorts = (edge: Edge, sourceNode: Node, targetNode: Node) => {
  const sourcePortId = edge.getSourcePortId()
  const targetPortId = edge.getTargetPortId()

  return !isValidRuleOutputPort(sourceNode, sourcePortId) || !isValidRuleInputPort(targetNode, targetPortId)
}

const repairExistingRuleEdgePorts = (graph: Graph, strategy: GraphStrategy) => {
  graph.getEdges().forEach((edge) => {
    const sourceNode = (edge.getSourceCell() || graph.getCellById(edge.getSourceCellId() || '')) as Node | null
    const targetNode = (edge.getTargetCell() || graph.getCellById(edge.getTargetCellId() || '')) as Node | null

    if (!sourceNode?.isNode?.() || !targetNode?.isNode?.()) return
    if (!shouldRepairRuleEdgePorts(edge, sourceNode, targetNode)) return

    finalizeRuleEdge(graph, strategy, edge, sourceNode, targetNode)
  })
}

const normalizeDirectTerminal = (terminal: RawTerminal): Terminal | null => {
  if (!terminal) return null
  if (typeof terminal === 'string') return { cell: terminal }
  if (terminal.cell || terminal.x != null || terminal.y != null) return terminal

  return null
}

const repairExistingDirectEdgeTerminals = (graph: Graph) => {
  graph.getEdges().forEach((edge) => {
    const source = normalizeDirectTerminal(edge.prop('source') as RawTerminal)
    const target = normalizeDirectTerminal(edge.prop('target') as RawTerminal)

    if (source?.cell) {
      edge.setSource(source)
    }
    if (target?.cell) {
      edge.setTarget(target)
    }
  })
}

export const ensureGraphConnectionPorts = (graph: Graph, strategy: GraphStrategy) => {
  graph.getNodes().forEach((node) => ensureNodeConnectionPorts(node, strategy))

  if (strategy.edgeRules) {
    repairExistingRuleEdgePorts(graph, strategy)
  } else if (!isSequenceEdgeMode(strategy)) {
    repairExistingDirectEdgeTerminals(graph)
  }
}

const queueAfterPaint = (callback: () => void) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(callback)
    })
    return
  }

  setTimeout(callback, 0)
}

const refreshConnectionViews = (graph: Graph, strategy: GraphStrategy) => {
  if (!strategy.edgeRules) {
    graph.getNodes().forEach((node) => {
      const view = graph.findViewByCell(node)
      view?.update?.()
    })

    graph.getEdges().forEach((edge) => {
      const view = graph.findViewByCell(edge)
      view?.update?.()
    })
    return
  }

  graph.getEdges().forEach((edge) => {
    const view = graph.findViewByCell(edge) as EdgeView | null
    if (!view) return

    const sourceReady = view.updateTerminalProperties('source')
    const targetReady = view.updateTerminalProperties('target')
    if (sourceReady && targetReady) {
      view.update()
    }
  })
}

export const scheduleGraphConnectionViewRefresh = (graph: Graph, strategy: GraphStrategy) => {
  queueAfterPaint(() => refreshConnectionViews(graph, strategy))
  graph.once('render:done', () => {
    queueAfterPaint(() => refreshConnectionViews(graph, strategy))
  })
}

export const finalizeSequenceEdge = (
  graph: Graph,
  edge: Edge,
  sourceNode: Node,
  targetNode: Node,
  geometry?: SequenceEdgeGeometry,
) => {
  const sourceId = sourceNode.id
  const targetId = targetNode.id
  const offsetY = countSequenceEdgesBetween(graph, edge, sourceId, targetId) * 40
  const edgeData = {
    ...edge.getData(),
    sourceId,
    targetId,
  }

  edge.setData(edgeData)

  if (sourceId === targetId) {
    const bbox = sourceNode.getBBox()
    const rightX = bbox.x + bbox.width
    const centerY = geometry?.y ?? geometry?.source.y ?? bbox.center.y + offsetY
    const loopOffset = 40

    edge.setSource({ x: rightX, y: centerY })
    edge.setTarget({ x: rightX, y: centerY + 20 })
    edge.setVertices([
      { x: rightX + loopOffset, y: centerY },
      { x: rightX + loopOffset, y: centerY + 20 },
    ])
    edge.prop('router', null)
    edge.prop('connector', {
      name: 'rounded',
      args: { radius: 8 },
    })
  } else if (geometry) {
    edge.setSource(geometry.source)
    edge.setTarget(geometry.target)
    edge.prop('router', null)
    edge.setVertices([])
  } else {
    const sourceCenter = sourceNode.getBBox().center
    const targetCenter = targetNode.getBBox().center

    edge.setSource({
      x: sourceCenter.x,
      y: sourceCenter.y + offsetY,
    })
    edge.setTarget({
      x: targetCenter.x,
      y: targetCenter.y + offsetY,
    })
  }

  const labelText = formatSequenceLabel(edgeData)
  if (labelText) {
    const displayLabel = labelText.length > 25 ? `${labelText.substring(0, 25)}...` : labelText
    edge.setLabels([{ attrs: { text: { text: displayLabel } } }])
  }

  ensureSequenceEdgeVerticesTool(edge)

  return true
}

export const finalizeNewEdgeConnection = (graph: Graph, strategy: GraphStrategy, edge: Edge) => {
  const sourceNode = edge.getSourceCell() as Node | null
  const targetNode = edge.getTargetCell() as Node | null

  if (!sourceNode?.isNode?.() || !targetNode?.isNode?.()) return false

  if (strategy.edgeRules) {
    return finalizeRuleEdge(graph, strategy, edge, sourceNode, targetNode)
  }

  if (isSequenceEdgeMode(strategy)) {
    return finalizeSequenceEdge(graph, edge, sourceNode, targetNode)
  }

  edge.setSource({ cell: sourceNode.id })
  edge.setTarget({ cell: targetNode.id })
  return true
}
