import type { ESD, Componenet, Interaction, InteractionRelation } from './exportTypes'

type ComponentLayout = {
    x: number
    y: number
    width: number
    height: number
}

type InteractionLayout = {
    source: { x: number; y: number }
    target: { x: number; y: number }
}

type ScopeMetric = {
    minY: number
    maxY: number
    centerY: number
}

type FragmentSection = {
    condition: string
    interactions: Interaction[]
}

type LabelParam = {
    name?: string
    type?: string
}

type LabelData = {
    stereotype?: string
    message?: string
    params?: LabelParam[]
    returnType?: string
}

type EdgeData = {
    name?: string
    message?: string
    params: LabelParam[]
    stereotype?: string
    returnType?: string
    msgType?: string
    isReturn?: boolean
    sourceId?: string
    targetId?: string
}

type GraphCell = {
    id: string
    shape: string
    x?: number
    y?: number
    width?: number
    height?: number
    source?: { x: number; y: number }
    target?: { x: number; y: number }
    labels?: Array<{ attrs: { text: { text: string } } }>
    attrs?: {
        line: {
            stroke: string
            strokeWidth: number
            targetMarker: { name: string; width: number; height: number }
        }
    }
    data?: Record<string, unknown>
}

const COMPONENT_START_X = 100
const COMPONENT_Y = 100
const COMPONENT_GAP = 200
const COMPONENT_DEFAULT_WIDTH = 120
const COMPONENT_DEFAULT_HEIGHT = 300
const HEADER_HEIGHT = 50
const EDGE_START_Y_OFFSET = 80
const EDGE_Y_GAP = 80

const FRAGMENT_DEFAULT_X = 100
const FRAGMENT_DEFAULT_WIDTH = 200
const FRAGMENT_DEFAULT_HEIGHT = 120
const FRAGMENT_TAG_HEIGHT = 28

const isInteraction = (value: unknown): value is Interaction => {
    if (!value || typeof value !== 'object') {
        return false
    }

    const candidate = value as Partial<Interaction>
    return typeof candidate.id === 'string'
}

const normalizeFragmentSections = (relation: InteractionRelation): FragmentSection[] => {
    const rawScope = Array.isArray(relation.scope) ? (relation.scope as unknown[]) : []

    if (rawScope.length === 0) {
        return [{ condition: '', interactions: [] }]
    }

    return rawScope.map(entry => {
        if (Array.isArray(entry)) {
            return {
                condition: '',
                interactions: entry.filter(isInteraction),
            }
        }

        if (entry && typeof entry === 'object') {
            const scopeEntry = entry as {
                condition?: string | null
                interactions?: unknown
            }

            if (Array.isArray(scopeEntry.interactions)) {
                return {
                    condition: scopeEntry.condition ?? '',
                    interactions: scopeEntry.interactions.filter(isInteraction),
                }
            }
        }

        return {
            condition: '',
            interactions: isInteraction(entry) ? [entry] : [],
        }
    })
}

const formatLabel = (data: LabelData) => {
    const parts = []
    if (data.stereotype && data.stereotype !== 'base') {
        parts.push(`<<${data.stereotype}>>`)
    }

    const msg = data.message || ''
    const prm = data.params && Array.isArray(data.params)
        ? data.params.map(item => `${item.name}: ${item.type}`).join(', ')
        : ''
    const ret = data.returnType ? `: ${data.returnType}` : ''

    const mainPart = `${msg}(${prm})${ret}`
    if (mainPart !== '()') {
        parts.push(mainPart)
    }

    return parts.join('\n')
}

const convertComponentNode = (component: Componenet, index: number): GraphCell => {
    let shape = 'seq-object-node'
    const data: Record<string, unknown> = {
        stroke: '#1890ff',
        fill: '#fff'
    }

    if (component.type === 'human') {
        shape = 'seq-actor-node'
        data.actorName = component.name
        delete data.stroke
        delete data.fill
    } else {
        data.className = component.name
        data.type = component.type
    }

    const x = component.x ?? (index % 5) * COMPONENT_GAP + COMPONENT_START_X
    const y = component.y ?? COMPONENT_Y
    const width = component.width ?? COMPONENT_DEFAULT_WIDTH
    const height = component.height ?? COMPONENT_DEFAULT_HEIGHT

    return {
        id: component.id,
        shape,
        x,
        y,
        width,
        height,
        data,
    }
}

const buildScopeMetrics = (
    sections: FragmentSection[],
    interactionPositionMap: Map<string, InteractionLayout>
) => {
    return sections.map(section => {
        const yValues = section.interactions
            .map(interaction => {
                const layout = interactionPositionMap.get(interaction.id)
                return layout ? (layout.source.y + layout.target.y) / 2 : null
            })
            .filter((value): value is number => value !== null)
            .sort((a, b) => a - b)

        if (yValues.length === 0) {
            return null
        }

        return {
            minY: yValues[0],
            maxY: yValues[yValues.length - 1],
            centerY: (yValues[0] + yValues[yValues.length - 1]) / 2,
        } satisfies ScopeMetric
    })
}

const calculateFragmentSectionHeight = (scopeMetrics: Array<ScopeMetric | null>) => {
    const heightCandidates = [EDGE_Y_GAP]

    scopeMetrics.forEach(metric => {
        if (metric) {
            heightCandidates.push(metric.maxY - metric.minY + EDGE_Y_GAP)
        }
    })

    let previousCenterY: number | undefined
    scopeMetrics.forEach(metric => {
        if (!metric) return
        if (previousCenterY !== undefined) {
            heightCandidates.push(metric.centerY - previousCenterY)
        }
        previousCenterY = metric.centerY
    })

    return Math.max(...heightCandidates)
}

const calculateFragmentHorizontalBounds = (
    sections: FragmentSection[],
    componentPositionMap: Map<string, ComponentLayout>,
    interactionPositionMap: Map<string, InteractionLayout>
) => {
    const scopedInteractions = sections.flatMap(section => section.interactions)
    const involvedComponentIds = new Set<string>()

    scopedInteractions.forEach(interaction => {
        if (interaction.sender?.id) {
            involvedComponentIds.add(interaction.sender.id)
        }
        if (interaction.receiver?.id) {
            involvedComponentIds.add(interaction.receiver.id)
        }
    })

    const involvedComponents = Array.from(involvedComponentIds)
        .map(componentId => componentPositionMap.get(componentId))
        .filter((component): component is ComponentLayout => Boolean(component))

    if (involvedComponents.length > 0) {
        const left = Math.min(...involvedComponents.map(component => component.x))
        const right = Math.max(...involvedComponents.map(component => component.x + component.width))
        return {
            x: left,
            width: Math.max(FRAGMENT_DEFAULT_WIDTH, right - left),
        }
    }

    const scopedLayouts = scopedInteractions
        .map(interaction => interactionPositionMap.get(interaction.id))
        .filter((layout): layout is InteractionLayout => Boolean(layout))

    if (scopedLayouts.length > 0) {
        const points = scopedLayouts.flatMap(layout => [layout.source.x, layout.target.x])
        const left = Math.min(...points) - COMPONENT_DEFAULT_WIDTH / 2
        const right = Math.max(...points) + COMPONENT_DEFAULT_WIDTH / 2
        return {
            x: left,
            width: Math.max(FRAGMENT_DEFAULT_WIDTH, right - left),
        }
    }

    return {
        x: FRAGMENT_DEFAULT_X,
        width: FRAGMENT_DEFAULT_WIDTH,
    }
}

const calculateFragmentVerticalBounds = (
    relation: InteractionRelation,
    sections: FragmentSection[],
    interactionPositionMap: Map<string, InteractionLayout>
) => {
    const sectionCount = Math.max(1, sections.length)
    const scopeMetrics = buildScopeMetrics(sections, interactionPositionMap)
    const sectionHeight = calculateFragmentSectionHeight(scopeMetrics)
    const firstScopeWithInteractions = scopeMetrics.findIndex(metric => metric !== null)

    if (firstScopeWithInteractions !== -1) {
        const firstMetric = scopeMetrics[firstScopeWithInteractions] as ScopeMetric
        const bodyTop = firstMetric.centerY - sectionHeight / 2 - firstScopeWithInteractions * sectionHeight
        return {
            y: Math.max(COMPONENT_Y, bodyTop - FRAGMENT_TAG_HEIGHT),
            height: Math.max(FRAGMENT_DEFAULT_HEIGHT, FRAGMENT_TAG_HEIGHT + sectionCount * sectionHeight),
        }
    }

    return {
        y: relation.y > 0 ? relation.y : Math.max(COMPONENT_Y, COMPONENT_Y + EDGE_START_Y_OFFSET - FRAGMENT_TAG_HEIGHT),
        height: relation.height > 0
            ? relation.height
            : Math.max(FRAGMENT_DEFAULT_HEIGHT, FRAGMENT_TAG_HEIGHT + sectionCount * EDGE_Y_GAP),
    }
}

const convertFragmentNode = (
    relation: InteractionRelation,
    componentPositionMap: Map<string, ComponentLayout>,
    interactionPositionMap: Map<string, InteractionLayout>
): GraphCell => {
    const sections = normalizeFragmentSections(relation)
    const conditions = sections.map(section => section.condition)
    const data = {
        fragmentType: relation.type,
        fragmentName: relation.id,
        conditions
    }

    if (relation.width > 0 && relation.height > 0) {
        return {
            id: relation.id,
            shape: 'seq-fragment-node',
            x: relation.x,
            y: relation.y,
            width: relation.width,
            height: relation.height,
            data
        }
    }

    const { x, width } = calculateFragmentHorizontalBounds(sections, componentPositionMap, interactionPositionMap)
    const { y, height } = calculateFragmentVerticalBounds(relation, sections, interactionPositionMap)

    return {
        id: relation.id,
        shape: 'seq-fragment-node',
        x,
        y,
        width,
        height,
        data
    }
}

const convertEdge = (interaction: Interaction): GraphCell => {
    const edgeData: EdgeData = {
        name: interaction.name,
        message: interaction.message?.message,
        params: interaction.message?.params || [],
        stereotype: interaction.message?.stereotype,
        returnType: interaction.message?.returnType,
        msgType: interaction.message?.msgType,
        isReturn: interaction.message?.isReturn,
        sourceId: interaction.sender?.id,
        targetId: interaction.receiver?.id
    }

    const labelText = formatLabel(edgeData)
    const labels = labelText ? [{ attrs: { text: { text: labelText } } }] : undefined

    return {
        id: interaction.id,
        shape: 'edge',
        source: interaction.source,
        target: interaction.target,
        labels,
        attrs: {
            line: {
                stroke: '#1890ff',
                strokeWidth: 2,
                targetMarker: { name: 'block', width: 12, height: 8 },
            },
        },
        data: edgeData,
    }
}

export const importGraphFromJSON = (jsonString: string): { cells: GraphCell[] } => {
    const apiData: ESD = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
    const cells: GraphCell[] = []
    const uniqueNodes = new Map<string, Componenet>()

    if (apiData.interactions && Array.isArray(apiData.interactions)) {
        apiData.interactions.forEach(interaction => {
            if (interaction.sender?.id) {
                uniqueNodes.set(interaction.sender.id, interaction.sender)
            }
            if (interaction.receiver?.id) {
                uniqueNodes.set(interaction.receiver.id, interaction.receiver)
            }
        })
    }

    if (apiData.components && Array.isArray(apiData.components)) {
        apiData.components.forEach(component => {
            if (component.id && !uniqueNodes.has(component.id)) {
                uniqueNodes.set(component.id, component)
            }
        })
    }

    const componentPositionMap = new Map<string, ComponentLayout>()
    const interactionPositionMap = new Map<string, InteractionLayout>()

    let nodeIndex = 0
    uniqueNodes.forEach(component => {
        const x = COMPONENT_START_X + nodeIndex * COMPONENT_GAP
        const y = COMPONENT_Y
        const width = component.width ?? COMPONENT_DEFAULT_WIDTH
        const height = component.height ?? COMPONENT_DEFAULT_HEIGHT

        componentPositionMap.set(component.id, { x, y, width, height })

        const repositionedComponent = { ...component, x, y, width, height }
        cells.push(convertComponentNode(repositionedComponent, nodeIndex))
        nodeIndex++
    })

    if (apiData.interactions && Array.isArray(apiData.interactions)) {
        apiData.interactions.forEach((interaction, edgeIndex) => {
            const senderId = interaction.sender?.id
            const receiverId = interaction.receiver?.id
            if (!senderId || !receiverId) return

            const senderPos = componentPositionMap.get(senderId)
            const receiverPos = componentPositionMap.get(receiverId)
            if (!senderPos || !receiverPos) return

            const edgeY = COMPONENT_Y + HEADER_HEIGHT + EDGE_START_Y_OFFSET + edgeIndex * EDGE_Y_GAP
            const sourceX = senderPos.x + senderPos.width / 2
            const targetX = receiverPos.x + receiverPos.width / 2

            const repositionedInteraction: Interaction = {
                ...interaction,
                source: { x: sourceX, y: edgeY },
                target: { x: targetX, y: edgeY },
            }

            interactionPositionMap.set(interaction.id, {
                source: repositionedInteraction.source,
                target: repositionedInteraction.target,
            })

            cells.push(convertEdge(repositionedInteraction))
        })
    }

    if (apiData.interactionRelations && Array.isArray(apiData.interactionRelations)) {
        apiData.interactionRelations.forEach(relation => {
            cells.push(convertFragmentNode(relation, componentPositionMap, interactionPositionMap))
        })
    }

    const totalInteractions = apiData.interactions?.length ?? 0
    const requiredHeight = HEADER_HEIGHT + EDGE_START_Y_OFFSET + totalInteractions * EDGE_Y_GAP + 60

    cells.forEach(cell => {
        if (cell.shape === 'seq-object-node' || cell.shape === 'seq-actor-node') {
            if (cell.height < requiredHeight) {
                cell.height = requiredHeight
            }
        }
    })

    return { cells }
}

export default importGraphFromJSON
