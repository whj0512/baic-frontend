import { internalConstraintsCanvasLayout as layoutConfig } from '../../../components/graph/strategies/internalConstraints'
import type { ModelImportOptions } from '../types'

interface RenderConfig {
  x?: number
  y?: number
  width?: number
  height?: number
  color?: string
  visible?: boolean
}

interface ApiPortItem {
  id: string
  group: string
}

interface ApiPorts {
  items: ApiPortItem[]
}

interface ApiNode {
  id: string
  type_name: string
  desc?: string
  render_config?: RenderConfig
  ports?: ApiPorts
  branch_yes?: string
  branch_no?: string
  pre_think_time?: number
  post_think_time?: number
  entry_action_list?: any[]
  exit_action_list?: any[]
  during_action_list?: any[]
  normal_test_action_list?: any[]
  dynamic_test_action_list?: any[]
  forward_propagation?: boolean
  condition?: string
  time_tolerance?: any
  params_list?: any[]
  in_list?: string[]
  return_list?: string[]
  script?: string
  enable_inverse?: boolean
  comment?: string
  graph_id?: string
  has_return_val?: boolean
  return_val?: string
  truthTable?: any
  friend?: { id: string; name: string }
}

interface ApiTransition {
  id: string
  source_node: string
  target_node: string
  sourcePort?: string
  targetPort?: string
  source_port_name?: string
  target_port_name?: string
  desc?: string
  condition?: string
  loop_times?: number
  time_tolerance?: any
  action_list?: any[]
  event_list?: any[]
  test_layer?: any
  test_coverage?: any
}

interface ApiGraphData {
  id: string
  desc?: string
  graph_type?: string
  local_variable_list?: any[]
  variable_action_list?: any[]
  test_coverage?: any
  h_function?: string
  entry_action_list?: any[]
  exit_action_list?: any[]
  nodes?: ApiNode[]
  transitions?: ApiTransition[]
}

interface X6PortItem {
  id: string
  group: string
}

interface ImportedNode {
  id: string
  shape: string
  x?: number
  y?: number
  width: number
  height: number
  data: Record<string, any>
  ports: {
    groups: Record<string, any>
    items: X6PortItem[]
  }
}

interface ValidTransition {
  transition: ApiTransition
  source: string
  target: string
}

const typeNameToShape: Record<string, string> = {
  start: 'start-node',
  then: 'then-node',
  state: 'state-node',
  condition: 'condition-node',
  call: 'call-node',
  comment: 'comment-node',
  'graph-ref': 'graph-node',
  truth: 'truth-node',
  goto: 'goto-node',
}

const defaultNodeSize: Record<string, { width: number; height: number }> = {
  'start-node': { width: 30, height: 30 },
  'then-node': { width: 30, height: 30 },
  'state-node': { width: 120, height: 80 },
  'condition-node': { width: 120, height: 80 },
  'call-node': { width: 120, height: 60 },
  'comment-node': { width: 120, height: 60 },
  'graph-node': { width: 120, height: 60 },
  'truth-node': { width: 120, height: 60 },
  'goto-node': { width: 120, height: 60 },
}

const defaultNodeStyle: Record<string, { stroke: string; fill: string }> = {
  'start-node': { stroke: '#333', fill: '#686666' },
  'then-node': { stroke: '#333', fill: '#fff' },
  'state-node': { stroke: '#333', fill: '#fff' },
  'condition-node': { stroke: '#333', fill: '#fff' },
  'call-node': { stroke: '#1890ff', fill: '#e6f7ff' },
  'comment-node': { stroke: '#1890ff', fill: '#e6f7ff' },
  'graph-node': { stroke: '#1890ff', fill: '#e6f7ff' },
  'truth-node': { stroke: '#1890ff', fill: '#e6f7ff' },
  'goto-node': { stroke: '#333', fill: '#fff' },
}

const basePortStyle = {
  r: 4,
  magnet: true,
  stroke: '#1890ff',
  fill: '#fff',
  strokeWidth: 1,
}

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
)

const isPositiveNumber = (value: unknown): value is number => (
  isFiniteNumber(value) && value > 0
)

const stableSort = <T,>(items: T[], compare: (left: T, right: T) => number) => (
  items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => compare(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item)
)

const getPortGroupsForShape = (shape: string): Record<string, any> => {
  if (shape === 'condition-node') {
    return {
      in: {
        position: 'top',
        attrs: { circle: { ...basePortStyle } },
      },
      'out-yes': {
        position: 'left',
        attrs: { circle: { ...basePortStyle, stroke: '#52c41a' } },
      },
      'out-no': {
        position: 'right',
        attrs: { circle: { ...basePortStyle, stroke: '#ff4d4f' } },
      },
    }
  }

  return {
    in: {
      position: 'top',
      attrs: { circle: { ...basePortStyle } },
    },
    out: {
      position: 'bottom',
      attrs: { circle: { ...basePortStyle } },
    },
  }
}

const getX6PortGroup = (shape: string, item: ApiPortItem) => {
  if (shape === 'condition-node' && item.group === 'condition') {
    return item.id === 'no' ? 'out-no' : 'out-yes'
  }

  if (item.group === 'top') return 'in'
  if (item.group === 'bottom') return 'out'
  if (item.group === 'left') return 'out-yes'
  if (item.group === 'right') return 'out-no'
  return item.group
}

const normalizeConditionPortId = (portId: string | undefined, group?: string) => {
  if (group === 'in' || portId === 'in' || portId === 'in-0' || /_top_\d+$/.test(portId || '') || /^top_?\d*$/.test(portId || '')) {
    return 'in-0'
  }
  if (group === 'out-yes' || portId === 'yes' || portId === 'left' || portId === 'out-yes') {
    return 'out-yes'
  }
  if (group === 'out-no' || portId === 'no' || portId === 'right' || portId === 'out-no') {
    return 'out-no'
  }
  return portId
}

const createNodeData = (apiNode: ApiNode, shape: string) => {
  const nodeData: Record<string, any> = {
    nodeName: apiNode.desc || apiNode.type_name,
    ...(defaultNodeStyle[shape] || { stroke: '#333', fill: '#fff' }),
  }

  switch (apiNode.type_name) {
    case 'state':
      nodeData.pre_think_time = apiNode.pre_think_time ?? 0
      nodeData.post_think_time = apiNode.post_think_time ?? 0
      nodeData.entry_action_list = apiNode.entry_action_list ?? []
      nodeData.exit_action_list = apiNode.exit_action_list ?? []
      nodeData.during_action_list = apiNode.during_action_list ?? []
      nodeData.normal_test_action_list = apiNode.normal_test_action_list ?? []
      nodeData.dynamic_test_action_list = apiNode.dynamic_test_action_list ?? []
      nodeData.forward_propagation = apiNode.forward_propagation ?? false
      break
    case 'condition':
      nodeData.condition = apiNode.condition ?? ''
      nodeData.time_tolerance = apiNode.time_tolerance
      break
    case 'call':
      nodeData.params_list = apiNode.params_list ?? []
      nodeData.in_list = apiNode.in_list ?? []
      nodeData.return_list = apiNode.return_list ?? []
      nodeData.script = apiNode.script ?? ''
      nodeData.enable_inverse = apiNode.enable_inverse ?? false
      break
    case 'comment':
      nodeData.comment = apiNode.comment ?? ''
      break
    case 'graph-ref':
      nodeData.graph_id = apiNode.graph_id ?? ''
      nodeData.params_list = apiNode.params_list ?? []
      nodeData.has_return_val = apiNode.has_return_val ?? false
      nodeData.return_val = apiNode.return_val ?? ''
      break
    case 'truth':
      nodeData.truthTable = apiNode.truthTable
      break
    case 'goto':
      nodeData.friend = apiNode.friend ?? { id: '', name: '' }
      break
  }

  return nodeData
}

const convertNode = (apiNode: ApiNode): ImportedNode => {
  const shape = typeNameToShape[apiNode.type_name] || 'custom-rect-node'
  const fallbackSize = defaultNodeSize[shape] || { width: 120, height: 60 }
  const groups = getPortGroupsForShape(shape)
  const items: X6PortItem[] = []
  const portIds = new Set<string>()

  apiNode.ports?.items?.forEach(item => {
    const group = getX6PortGroup(shape, item)
    const id = shape === 'condition-node'
      ? normalizeConditionPortId(item.id, group)
      : item.id
    if (!id || !groups[group] || portIds.has(id)) return

    portIds.add(id)
    items.push({ id, group })
  })

  if (shape === 'condition-node') {
    ;[
      { id: 'in-0', group: 'in' },
      { id: 'out-yes', group: 'out-yes' },
      { id: 'out-no', group: 'out-no' },
    ].forEach(port => {
      if (portIds.has(port.id)) return
      portIds.add(port.id)
      items.push(port)
    })
  }

  const node: ImportedNode = {
    id: apiNode.id,
    shape,
    width: isPositiveNumber(apiNode.render_config?.width) ? apiNode.render_config.width : fallbackSize.width,
    height: isPositiveNumber(apiNode.render_config?.height) ? apiNode.render_config.height : fallbackSize.height,
    data: createNodeData(apiNode, shape),
    ports: { groups, items },
  }

  if (isFiniteNumber(apiNode.render_config?.x) && isFiniteNumber(apiNode.render_config?.y)) {
    node.x = apiNode.render_config.x
    node.y = apiNode.render_config.y
  }

  return node
}

const collectWeakComponents = (nodeIds: string[], undirected: Map<string, Set<string>>) => {
  const components: string[][] = []
  const visited = new Set<string>()

  nodeIds.forEach(startId => {
    if (visited.has(startId)) return
    const component: string[] = []
    const queue = [startId]
    visited.add(startId)

    for (let index = 0; index < queue.length; index += 1) {
      const nodeId = queue[index]
      component.push(nodeId)
      undirected.get(nodeId)?.forEach(neighborId => {
        if (visited.has(neighborId)) return
        visited.add(neighborId)
        queue.push(neighborId)
      })
    }
    components.push(component)
  })

  return components
}

const buildComponentLayers = (
  component: string[],
  nodesById: Map<string, ImportedNode>,
  outgoing: Map<string, Set<string>>,
  incoming: Map<string, Set<string>>,
  undirected: Map<string, Set<string>>,
  order: Map<string, number>,
) => {
  const componentIds = new Set(component)
  const starts = component.filter(nodeId => nodesById.get(nodeId)?.shape === 'start-node')
  const zeroIncoming = component.filter(nodeId => (
    [...(incoming.get(nodeId) || [])].every(sourceId => !componentIds.has(sourceId))
  ))
  const seedIds = [...new Set([...starts, ...zeroIncoming])]
  const seeds = seedIds.length > 0
    ? seedIds
    : [stableSort(component, (left, right) => {
      const degreeDelta = (undirected.get(right)?.size || 0) - (undirected.get(left)?.size || 0)
      return degreeDelta || (order.get(left) || 0) - (order.get(right) || 0)
    })[0]]
  const layerById = new Map<string, number>()
  const queue = stableSort(seeds, (left, right) => (order.get(left) || 0) - (order.get(right) || 0))
  queue.forEach(nodeId => layerById.set(nodeId, 0))

  for (let index = 0; index < queue.length; index += 1) {
    const nodeId = queue[index]
    const nextLayer = (layerById.get(nodeId) || 0) + 1
    stableSort([...(outgoing.get(nodeId) || [])], (left, right) => (
      (order.get(left) || 0) - (order.get(right) || 0)
    )).forEach(targetId => {
      if (!componentIds.has(targetId) || layerById.has(targetId)) return
      layerById.set(targetId, nextLayer)
      queue.push(targetId)
    })
  }

  while (layerById.size < component.length) {
    const nextId = stableSort(
      component.filter(nodeId => !layerById.has(nodeId)),
      (left, right) => (order.get(left) || 0) - (order.get(right) || 0),
    ).find(nodeId => [...(undirected.get(nodeId) || [])].some(neighborId => layerById.has(neighborId)))
    if (!nextId) break

    const positionedNeighbors = [...(undirected.get(nextId) || [])].filter(nodeId => layerById.has(nodeId))
    const sourceId = positionedNeighbors.find(nodeId => outgoing.get(nodeId)?.has(nextId))
    const anchorId = sourceId || positionedNeighbors[0]
    layerById.set(nextId, (layerById.get(anchorId) || 0) + (sourceId ? 1 : 0))
  }

  const layers: string[][] = []
  component.forEach(nodeId => {
    const layer = layerById.get(nodeId) || 0
    layers[layer] ||= []
    layers[layer].push(nodeId)
  })

  for (let layerIndex = 1; layerIndex < layers.length; layerIndex += 1) {
    const previousPositions = new Map(layers[layerIndex - 1].map((nodeId, index) => [nodeId, index]))
    layers[layerIndex] = stableSort(layers[layerIndex], (left, right) => {
      const barycenter = (nodeId: string) => {
        const positions = [...(incoming.get(nodeId) || [])]
          .map(sourceId => previousPositions.get(sourceId))
          .filter((position): position is number => position !== undefined)
        return positions.length
          ? positions.reduce((sum, position) => sum + position, 0) / positions.length
          : Number.POSITIVE_INFINITY
      }
      const delta = barycenter(left) - barycenter(right)
      return Number.isFinite(delta) ? delta : (order.get(left) || 0) - (order.get(right) || 0)
    })
  }

  return layers.filter(Boolean)
}

const getLayerWidth = (layer: string[], nodesById: Map<string, ImportedNode>) => (
  layer.reduce((width, nodeId, index) => (
    width + (nodesById.get(nodeId)?.width || 0) + (index > 0 ? layoutConfig.nodeGap : 0)
  ), 0)
)

const placeConnectedComponent = (
  layers: string[][],
  nodesById: Map<string, ImportedNode>,
  startY: number,
) => {
  let currentX = layoutConfig.originX
  let componentBottom = startY

  for (let bandStart = 0; bandStart < layers.length; bandStart += layoutConfig.nodesPerBand) {
    const bandLayers = layers.slice(bandStart, bandStart + layoutConfig.nodesPerBand)
    const bandWidth = Math.max(...bandLayers.map(layer => getLayerWidth(layer, nodesById)), 0)
    let currentY = startY

    bandLayers.forEach(layer => {
      const layerWidth = getLayerWidth(layer, nodesById)
      const layerHeight = Math.max(...layer.map(nodeId => nodesById.get(nodeId)?.height || 0), 0)
      let nodeX = currentX + (bandWidth - layerWidth) / 2

      layer.forEach(nodeId => {
        const node = nodesById.get(nodeId)
        if (!node) return
        node.x = nodeX
        node.y = currentY + (layerHeight - node.height) / 2
        nodeX += node.width + layoutConfig.nodeGap
      })

      currentY += layerHeight + layoutConfig.layerGap
    })

    componentBottom = Math.max(componentBottom, currentY - layoutConfig.layerGap)
    currentX += bandWidth + layoutConfig.bandGap
  }

  return componentBottom - startY
}

const placeIsolatedNodes = (
  nodeIds: string[],
  nodesById: Map<string, ImportedNode>,
  startY: number,
) => {
  if (!nodeIds.length) return
  const columns = Math.ceil(Math.sqrt(nodeIds.length))
  const cellWidth = Math.max(...nodeIds.map(nodeId => nodesById.get(nodeId)?.width || 0), 0) + layoutConfig.nodeGap
  const cellHeight = Math.max(...nodeIds.map(nodeId => nodesById.get(nodeId)?.height || 0), 0) + layoutConfig.layerGap

  nodeIds.forEach((nodeId, index) => {
    const node = nodesById.get(nodeId)
    if (!node) return
    node.x = layoutConfig.originX + (index % columns) * cellWidth
    node.y = startY + Math.floor(index / columns) * cellHeight
  })
}

const applyAutomaticLayout = (
  nodesById: Map<string, ImportedNode>,
  transitions: ValidTransition[],
) => {
  const nodeIds = [...nodesById.keys()]
  const order = new Map(nodeIds.map((nodeId, index) => [nodeId, index]))
  const outgoing = new Map(nodeIds.map(nodeId => [nodeId, new Set<string>()]))
  const incoming = new Map(nodeIds.map(nodeId => [nodeId, new Set<string>()]))
  const undirected = new Map(nodeIds.map(nodeId => [nodeId, new Set<string>()]))

  transitions.forEach(({ source, target }) => {
    if (source === target) return
    outgoing.get(source)?.add(target)
    incoming.get(target)?.add(source)
    undirected.get(source)?.add(target)
    undirected.get(target)?.add(source)
  })

  const components = collectWeakComponents(nodeIds, undirected)
  const connected = components.filter(component => component.length > 1)
  const isolated = components.filter(component => component.length === 1).flat()
  let currentY = layoutConfig.originY

  connected.forEach(component => {
    const layers = buildComponentLayers(component, nodesById, outgoing, incoming, undirected, order)
    currentY += placeConnectedComponent(layers, nodesById, currentY) + layoutConfig.componentGap
  })

  placeIsolatedNodes(isolated, nodesById, currentY)
}

const addPort = (node: ImportedNode, port: X6PortItem) => {
  if (!node.ports.items.some(item => item.id === port.id)) {
    node.ports.items.push(port)
  }
  return port.id
}

const allocateOrdinaryPort = (
  node: ImportedNode,
  direction: 'source' | 'target',
  preferredId: string | undefined,
  usedPortIds: Set<string>,
) => {
  const group = direction === 'source' ? 'out' : 'in'
  const availablePorts = node.ports.items.filter(port => port.group === group)
  const preferred = availablePorts.find(port => port.id === preferredId && !usedPortIds.has(port.id))
  const selected = preferred || availablePorts.find(port => !usedPortIds.has(port.id))
  if (selected) {
    usedPortIds.add(selected.id)
    return selected.id
  }

  const side = direction === 'source' ? 'bottom' : 'top'
  const existingIds = new Set(node.ports.items.map(port => port.id))
  let index = 0
  let id = `${node.id}_${side}_${index}`
  while (existingIds.has(id) || usedPortIds.has(id)) {
    index += 1
    id = `${node.id}_${side}_${index}`
  }

  addPort(node, { id, group })
  usedPortIds.add(id)
  return id
}

const getConditionSourcePort = (transition: ApiTransition, sourceNode: ApiNode) => {
  if (sourceNode.branch_no === transition.id) return 'out-no'
  if (sourceNode.branch_yes === transition.id) return 'out-yes'

  const explicit = normalizeConditionPortId(transition.sourcePort ?? transition.source_port_name)
  return explicit === 'out-no' ? 'out-no' : 'out-yes'
}

const convertEdge = (
  entry: ValidTransition,
  sourcePort: string,
  targetPort: string,
) => {
  const { transition, source, target } = entry
  return {
    id: transition.id,
    shape: 'edge',
    source: { cell: source, port: sourcePort },
    target: { cell: target, port: targetPort },
    attrs: {
      line: {
        stroke: '#1890ff',
        strokeWidth: 2,
        targetMarker: {
          name: 'block',
          width: 12,
          height: 8,
        },
      },
    },
    router: { name: 'manhattan' },
    connector: { name: 'rounded', args: { radius: 8 } },
    data: {
      edgeName: transition.desc || '',
      condition: transition.condition ?? '',
      loop_times: transition.loop_times ?? 0,
      time_tolerance: transition.time_tolerance,
      action_list: transition.action_list ?? [],
      event_list: transition.event_list ?? [],
      test_layer: transition.test_layer,
      test_coverage: transition.test_coverage,
      sourceOutput: sourcePort,
    },
  }
}

export const importGraphFromJSON = (
  jsonString: string,
  options: ModelImportOptions = {},
): any => {
  const apiData: ApiGraphData = JSON.parse(jsonString)
  const apiNodes = Array.isArray(apiData.nodes) ? apiData.nodes : []
  const apiTransitions = Array.isArray(apiData.transitions) ? apiData.transitions : []
  const nodesById = new Map<string, ImportedNode>()
  const apiNodesById = new Map<string, ApiNode>()

  apiNodes.forEach(apiNode => {
    nodesById.set(apiNode.id, convertNode(apiNode))
    apiNodesById.set(apiNode.id, apiNode)
  })

  const validTransitions = apiTransitions
    .filter(transition => nodesById.has(transition.source_node) && nodesById.has(transition.target_node))
    .map(transition => ({
      transition,
      source: transition.source_node,
      target: transition.target_node,
    }))

  if (options.autoLayout) {
    applyAutomaticLayout(nodesById, validTransitions)
  }

  const usedSourcePorts = new Map<string, Set<string>>()
  const usedTargetPorts = new Map<string, Set<string>>()
  const edges = validTransitions.map(entry => {
    const sourceNode = nodesById.get(entry.source)!
    const targetNode = nodesById.get(entry.target)!
    const apiSourceNode = apiNodesById.get(entry.source)!
    const sourceUsed = usedSourcePorts.get(entry.source) || new Set<string>()
    const targetUsed = usedTargetPorts.get(entry.target) || new Set<string>()
    usedSourcePorts.set(entry.source, sourceUsed)
    usedTargetPorts.set(entry.target, targetUsed)

    const sourcePort = sourceNode.shape === 'condition-node'
      ? getConditionSourcePort(entry.transition, apiSourceNode)
      : allocateOrdinaryPort(
        sourceNode,
        'source',
        entry.transition.sourcePort ?? entry.transition.source_port_name,
        sourceUsed,
      )
    const targetPort = targetNode.shape === 'condition-node'
      ? 'in-0'
      : allocateOrdinaryPort(
        targetNode,
        'target',
        entry.transition.targetPort ?? entry.transition.target_port_name,
        targetUsed,
      )

    return convertEdge(entry, sourcePort, targetPort)
  })

  const canvasData: Record<string, any> = {
    desc: apiData.desc || '',
    local_variable_list: apiData.local_variable_list ?? [],
    variable_action_list: apiData.variable_action_list ?? [],
    test_coverage: apiData.test_coverage,
    h_function: apiData.h_function || 'none',
    entry_action_list: apiData.entry_action_list ?? [],
    exit_action_list: apiData.exit_action_list ?? [],
  }

  return { cells: [...nodesById.values(), ...edges], canvasData }
}

export default importGraphFromJSON
