import type { IBD, Connect } from './exportTypes'
import environmentStrategy from '../../../components/graph/strategies/environment'

const LAYOUT_ORIGIN_X = 100
const LAYOUT_ORIGIN_Y = 100
const RANK_GAP = 140
const NODE_GAP = 80
const COMPONENT_GAP = 140
const ISOLATED_COLUMN_GAP = 100
const ISOLATED_ROW_GAP = 80

interface LayoutNode {
    id: string
    shape: string
    x?: number
    y?: number
    width: number
    height: number
    data: Record<string, any>
    ports?: {
        groups: Record<string, any>
        items: any[]
    }
}

interface EdgeEndpoints {
    source: string
    target: string
}

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
)

const isPositiveNumber = (value: unknown): value is number => (
    isFiniteNumber(value) && value > 0
)

const getShape = (type: unknown) => {
    switch (typeof type === 'string' ? type.toLowerCase() : '') {
        case 'device': return 'device-node'
        case 'control-unit': return 'control-unit-node'
        case 'human': return 'human-node'
        case 'machine': return 'machine-node'
        case 'controller': return 'controller-node'
        case 'functional-module': return 'functional-module-node'
        default: return 'custom-rect-node'
    }
}

const defaultSizeByShape = new Map(
    environmentStrategy.sidebarItems.map(item => [
        item.shape,
        {
            width: item.defaultAttrs?.width ?? 80,
            height: item.defaultAttrs?.height ?? 120,
        },
    ])
)

/** 将 API 节点转换为 X6 节点数据。 */
const convertNode = (apiNode: any): LayoutNode => {
    const shape = getShape(apiNode.type)
    const defaultSize = defaultSizeByShape.get(shape) ?? { width: 80, height: 120 }
    const data: Record<string, any> = {
        stroke: '#333',
        fill: '#fff',
        nodeName: apiNode.name,
    }

    switch (shape) {
        case 'device-node':
            data.ports = apiNode.ports
            break
        case 'control-unit-node':
            data.ports = apiNode.ports
            data.ctrlUnitTimer = apiNode.timer
            data.ctrlUnitPeriod = apiNode.controlPeriod
            break
        case 'machine-node':
        case 'controller-node':
        case 'functional-module-node':
            data.requirementID = apiNode.requirementID
            break
    }

    const node: LayoutNode = {
        id: apiNode.id,
        shape,
        width: isPositiveNumber(apiNode.render_config?.width)
            ? apiNode.render_config.width
            : defaultSize.width,
        height: isPositiveNumber(apiNode.render_config?.height)
            ? apiNode.render_config.height
            : defaultSize.height,
        data,
    }

    if (isFiniteNumber(apiNode.render_config?.x) && isFiniteNumber(apiNode.render_config?.y)) {
        node.x = apiNode.render_config.x
        node.y = apiNode.render_config.y
    }

    return node
}

const getEdgeEndpoints = (apiConnect: Connect): EdgeEndpoints | null => {
    const interaction = apiConnect.interactions?.find(item => (
        typeof item.sender === 'string' && item.sender
        && typeof item.receiver === 'string' && item.receiver
    ))

    if (!interaction?.sender || !interaction.receiver) return null
    return { source: interaction.sender, target: interaction.receiver }
}

const stableSort = <T,>(items: T[], compare: (left: T, right: T) => number) => (
    items
        .map((item, index) => ({ item, index }))
        .sort((left, right) => compare(left.item, right.item) || left.index - right.index)
        .map(({ item }) => item)
)

const collectWeakComponents = (
    nodeIds: string[],
    undirected: Map<string, Set<string>>,
) => {
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

const selectCycleAnchor = (
    component: string[],
    nodesMap: Map<string, LayoutNode>,
    undirected: Map<string, Set<string>>,
    order: Map<string, number>,
) => stableSort(component, (left, right) => {
    const machineDelta = Number(nodesMap.get(right)?.shape === 'machine-node')
        - Number(nodesMap.get(left)?.shape === 'machine-node')
    if (machineDelta) return machineDelta

    const degreeDelta = (undirected.get(right)?.size ?? 0) - (undirected.get(left)?.size ?? 0)
    if (degreeDelta) return degreeDelta
    return (order.get(left) ?? 0) - (order.get(right) ?? 0)
})[0]

const buildLayers = (
    component: string[],
    nodesMap: Map<string, LayoutNode>,
    outgoing: Map<string, Set<string>>,
    incoming: Map<string, Set<string>>,
    undirected: Map<string, Set<string>>,
    order: Map<string, number>,
) => {
    const componentIds = new Set(component)
    const roots = component.filter(nodeId => (
        [...(incoming.get(nodeId) ?? [])].every(sourceId => !componentIds.has(sourceId))
    ))
    const seeds = roots.length > 0
        ? roots
        : [selectCycleAnchor(component, nodesMap, undirected, order)]
    const layerById = new Map<string, number>()
    const queue = stableSort(seeds, (left, right) => (
        (order.get(left) ?? 0) - (order.get(right) ?? 0)
    ))

    queue.forEach(nodeId => layerById.set(nodeId, 0))

    for (let index = 0; index < queue.length; index += 1) {
        const nodeId = queue[index]
        const nextLayer = (layerById.get(nodeId) ?? 0) + 1
        stableSort([...(outgoing.get(nodeId) ?? [])], (left, right) => (
            (order.get(left) ?? 0) - (order.get(right) ?? 0)
        )).forEach(targetId => {
            if (!componentIds.has(targetId) || layerById.has(targetId)) return
            layerById.set(targetId, nextLayer)
            queue.push(targetId)
        })
    }

    // Directed traversal may not reach every vertex in a cyclic component. Attach the
    // remaining vertices through their nearest already positioned weak neighbor.
    while (layerById.size < component.length) {
        const nextId = stableSort(
            component.filter(nodeId => !layerById.has(nodeId)),
            (left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0),
        ).find(nodeId => [...(undirected.get(nodeId) ?? [])].some(neighborId => layerById.has(neighborId)))

        if (!nextId) break
        const positionedNeighbors = [...(undirected.get(nextId) ?? [])]
            .filter(neighborId => layerById.has(neighborId))
        const preferredSource = positionedNeighbors.find(sourceId => outgoing.get(sourceId)?.has(nextId))
        const neighborId = preferredSource ?? positionedNeighbors[0]
        layerById.set(nextId, (layerById.get(neighborId) ?? 0) + (preferredSource ? 1 : 0))
    }

    const layers: string[][] = []
    component.forEach(nodeId => {
        const layer = layerById.get(nodeId) ?? 0
        layers[layer] ??= []
        layers[layer].push(nodeId)
    })

    // A barycenter pass keeps nodes close to their neighbors in the previous layer.
    for (let layerIndex = 1; layerIndex < layers.length; layerIndex += 1) {
        const previousPositions = new Map(layers[layerIndex - 1].map((nodeId, index) => [nodeId, index]))
        layers[layerIndex] = stableSort(layers[layerIndex], (left, right) => {
            const barycenter = (nodeId: string) => {
                const positions = [...(incoming.get(nodeId) ?? [])]
                    .map(sourceId => previousPositions.get(sourceId))
                    .filter((position): position is number => position !== undefined)
                return positions.length > 0
                    ? positions.reduce((sum, position) => sum + position, 0) / positions.length
                    : Number.POSITIVE_INFINITY
            }
            const delta = barycenter(left) - barycenter(right)
            return Number.isFinite(delta) ? delta : (order.get(left) ?? 0) - (order.get(right) ?? 0)
        })
    }

    return layers.filter(Boolean)
}

const placeLayeredComponent = (
    layers: string[][],
    nodesMap: Map<string, LayoutNode>,
    startY: number,
) => {
    const layerHeights = layers.map(layer => (
        layer.reduce((height, nodeId, index) => (
            height + (nodesMap.get(nodeId)?.height ?? 0) + (index > 0 ? NODE_GAP : 0)
        ), 0)
    ))
    const componentHeight = Math.max(...layerHeights, 0)
    let x = LAYOUT_ORIGIN_X

    layers.forEach((layer, layerIndex) => {
        const layerWidth = Math.max(...layer.map(nodeId => nodesMap.get(nodeId)?.width ?? 0), 0)
        let y = startY + (componentHeight - layerHeights[layerIndex]) / 2

        layer.forEach(nodeId => {
            const node = nodesMap.get(nodeId)
            if (!node) return
            node.x = x + (layerWidth - node.width) / 2
            node.y = y
            y += node.height + NODE_GAP
        })

        x += layerWidth + RANK_GAP
    })

    return componentHeight
}

const placeIsolatedNodes = (
    nodeIds: string[],
    nodesMap: Map<string, LayoutNode>,
    startY: number,
) => {
    if (nodeIds.length === 0) return

    const columnCount = Math.ceil(Math.sqrt(nodeIds.length))
    const rowCount = Math.ceil(nodeIds.length / columnCount)
    const columnWidths = Array.from({ length: columnCount }, () => 0)
    const rowHeights = Array.from({ length: rowCount }, () => 0)

    nodeIds.forEach((nodeId, index) => {
        const node = nodesMap.get(nodeId)
        if (!node) return
        const column = index % columnCount
        const row = Math.floor(index / columnCount)
        columnWidths[column] = Math.max(columnWidths[column], node.width)
        rowHeights[row] = Math.max(rowHeights[row], node.height)
    })

    const columnStarts: number[] = []
    const rowStarts: number[] = []
    columnWidths.forEach((width, index) => {
        columnStarts[index] = index === 0
            ? LAYOUT_ORIGIN_X
            : columnStarts[index - 1] + columnWidths[index - 1] + ISOLATED_COLUMN_GAP
    })
    rowHeights.forEach((height, index) => {
        rowStarts[index] = index === 0
            ? startY
            : rowStarts[index - 1] + rowHeights[index - 1] + ISOLATED_ROW_GAP
    })

    nodeIds.forEach((nodeId, index) => {
        const node = nodesMap.get(nodeId)
        if (!node) return
        const column = index % columnCount
        const row = Math.floor(index / columnCount)
        node.x = columnStarts[column] + (columnWidths[column] - node.width) / 2
        node.y = rowStarts[row] + (rowHeights[row] - node.height) / 2
    })
}

const applyAutomaticLayout = (
    nodesMap: Map<string, LayoutNode>,
    endpoints: EdgeEndpoints[],
) => {
    const nodeIds = [...nodesMap.keys()]
    const order = new Map(nodeIds.map((nodeId, index) => [nodeId, index]))
    const outgoing = new Map(nodeIds.map(nodeId => [nodeId, new Set<string>()]))
    const incoming = new Map(nodeIds.map(nodeId => [nodeId, new Set<string>()]))
    const undirected = new Map(nodeIds.map(nodeId => [nodeId, new Set<string>()]))

    endpoints.forEach(({ source, target }) => {
        if (!nodesMap.has(source) || !nodesMap.has(target) || source === target) return
        outgoing.get(source)?.add(target)
        incoming.get(target)?.add(source)
        undirected.get(source)?.add(target)
        undirected.get(target)?.add(source)
    })

    const weakComponents = collectWeakComponents(nodeIds, undirected)
    const connectedComponents = weakComponents.filter(component => component.length > 1)
    const isolatedNodeIds = weakComponents
        .filter(component => component.length === 1)
        .flat()
    let currentY = LAYOUT_ORIGIN_Y

    connectedComponents.forEach(component => {
        const layers = buildLayers(component, nodesMap, outgoing, incoming, undirected, order)
        currentY += placeLayeredComponent(layers, nodesMap, currentY) + COMPONENT_GAP
    })

    placeIsolatedNodes(isolatedNodeIds, nodesMap, currentY)
}

/** 将 API 边转换为 X6 边数据结构。 */
const convertEdge = (apiConnect: Connect, endpoints: EdgeEndpoints): any => ({
    id: apiConnect.id,
    shape: 'edge',
    source: { cell: endpoints.source },
    target: { cell: endpoints.target },
    attrs: {
        line: {
            stroke: '#1890ff',
            strokeWidth: 2,
            targetMarker: null,
        },
    },
    router: { name: 'manhattan' },
    connector: { name: 'rounded', args: { radius: 8 } },
    data: {
        connect: {
            interactions: apiConnect.interactions || [],
        },
    },
})

const nextAvailablePortId = (items: any[], group: 'in' | 'out') => {
    const ids = new Set(items.map(item => item?.id).filter(Boolean))
    let index = items.filter(item => item?.group === group).length
    let id = `${group}-${index}`
    while (ids.has(id)) {
        index += 1
        id = `${group}-${index}`
    }
    return id
}

/**
 * 将 dsl-to-rbg API 返回的 JSON 字符串解析为 X6 图数据格式。
 */
export const importGraphFromJSON = (jsonString: string): any => {
    const apiData: IBD = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
    const nodesMap = new Map<string, LayoutNode>()
    const components = Array.isArray(apiData.components) ? apiData.components : []
    const connects = Array.isArray(apiData.connects) ? apiData.connects : []

    components.forEach(component => {
        const nodeCell = convertNode(component)
        const portGroups = environmentStrategy.edgeRules?.getPortGroups?.(nodeCell.shape) || {}
        nodeCell.ports = {
            groups: portGroups,
            items: Array.isArray((component as any).render_config?.ports?.items)
                ? [...(component as any).render_config.ports.items]
                : [],
        }
        nodesMap.set(nodeCell.id, nodeCell)
    })

    const validConnects = connects
        .map(connect => ({ connect, endpoints: getEdgeEndpoints(connect) }))
        .filter((entry): entry is { connect: Connect, endpoints: EdgeEndpoints } => (
            Boolean(entry.endpoints)
            && nodesMap.has(entry.endpoints?.source ?? '')
            && nodesMap.has(entry.endpoints?.target ?? '')
        ))

    if (![...nodesMap.values()].every(node => isFiniteNumber(node.x) && isFiniteNumber(node.y))) {
        applyAutomaticLayout(nodesMap, validConnects.map(({ endpoints }) => endpoints))
    }

    const edges = validConnects.map(({ connect, endpoints }) => {
        const edge = convertEdge(connect, endpoints)
        const sourceNode = nodesMap.get(endpoints.source)
        const targetNode = nodesMap.get(endpoints.target)
        if (!sourceNode?.ports || !targetNode?.ports) return edge

        const sourcePortId = nextAvailablePortId(sourceNode.ports.items, 'out')
        const targetPortId = nextAvailablePortId(targetNode.ports.items, 'in')
        sourceNode.ports.items.push({ id: sourcePortId, group: 'out' })
        targetNode.ports.items.push({ id: targetPortId, group: 'in' })
        edge.source.port = sourcePortId
        edge.target.port = targetPortId
        return edge
    })

    return { cells: [...nodesMap.values(), ...edges] }
}

export default importGraphFromJSON
