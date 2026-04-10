import type { Edge, Graph, Node } from "@antv/x6"
import type { Componenet, Interaction, InterfaceRelation, Message, RelationScope } from './exportTypes'

// 生成唯一 ID
const generateId = (): string => {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const convertComponent = (node: Node) => {
    const nodeData = node.getData() || {}
    const nodeSize = node.getSize()
    const nodePosition = node.getPosition()
    const component: Componenet = {
        id: node.id,
        name: '',
        type: '',
        width: nodeSize.width,
        height: nodeSize.height,
        x: nodePosition.x,
        y: nodePosition.y,
    }

    switch (node.shape) {
        case 'seq-object-node':
            component.name = nodeData.className
            component.type = nodeData.type
            break;
        case 'seq-actor-node':
            component.name = nodeData.actorName
            component.type = 'human'
            break;
    }

    return component
}

const convertInteraction = (edge: Edge, components: Componenet[]) => {
    const edgeData = edge.getData() || {}

    const intMessage: Message = {
        message: edgeData.message,
        params: edgeData.params,
        stereotype: edgeData.stereotype,
        returnType: edgeData.returnType,
        msgType: edgeData.msgType,
        isReturn: edgeData.isReturn,
    }
    const interaction: Interaction = {
        id: edge.id,
        name: edgeData.name,
        message: intMessage,
        sender: components.find(item => item.id === edgeData.sourceId),
        receiver: components.find(item => item.id === edgeData.targetId),
        source: { x: edge.getSource().x, y: edge.getSource().y },
        target: { x: edge.getTarget().x, y: edge.getTarget().y },
    }

    return interaction
}

export const exportGraphTOJSON = (graph: Graph, graphId?: string, graphDesc?: string) => {
    const components: Componenet[] = []
    const fragments: Node[] = []
    const interactions: Interaction[] = []
    const interfaceRelations: InterfaceRelation[] = []

    graph.getNodes().forEach(node => {
        switch (node.shape) {
            case 'seq-object-node':
            case 'seq-actor-node':
                const component = convertComponent(node)
                components.push(component)
                break;
            case 'seq-fragment-node':
                fragments.push(node)
                break;
        }
    })

    graph.getEdges().forEach(edge => {
        const interaction = convertInteraction(edge, components)
        interactions.push(interaction)
    })

    fragments.forEach(fragment => {
        const fragmentData = fragment.getData() || {}
        const fragmentSize = fragment.getSize()
        const fragmentPosition = fragment.getPosition()

        // 与 CombinedFragment.tsx 组件保持一致的布局常量
        const TAG_AREA_HEIGHT = 28
        const conditions: string[] = Array.isArray(fragmentData.conditions) ? fragmentData.conditions : []
        const sectionCount = Math.max(1, conditions.length)
        const bodyHeight = fragmentSize.height - TAG_AREA_HEIGHT
        const sectionHeight = bodyHeight / sectionCount

        // 片段的绝对 Y 坐标范围
        const fragmentTop = fragmentPosition.y
        const fragmentLeft = fragmentPosition.x
        const fragmentRight = fragmentLeft + fragmentSize.width
        const bodyTop = fragmentTop + TAG_AREA_HEIGHT

        // 为每个区域计算 scope
        const scope: RelationScope[] = Array.from({ length: sectionCount }, (_, i) => {
            const regionTop = bodyTop + sectionHeight * i
            const regionBottom = bodyTop + sectionHeight * (i + 1)

            // 查找垂直中点落在当前区域内、且水平范围与片段重叠的 interaction
            const regionInteractions = interactions.filter(interaction => {
                const srcY = interaction.source?.y
                const tgtY = interaction.target?.y
                if (srcY == null || tgtY == null) return false

                const midY = (srcY + tgtY) / 2
                // 水平方向：至少有一个端点在片段的 X 范围内
                const srcX = interaction.source?.x
                const tgtX = interaction.target?.x
                const horizontalOverlap =
                    (srcX != null && srcX >= fragmentLeft && srcX <= fragmentRight) ||
                    (tgtX != null && tgtX >= fragmentLeft && tgtX <= fragmentRight)

                return midY >= regionTop && midY < regionBottom && horizontalOverlap
            })

            return {
                condition: conditions[i] || undefined,
                interactions: regionInteractions,
            }
        })

        const interactionRelation: InterfaceRelation = {
            id: fragment.id,
            type: fragmentData.fragmentType,
            scope,
            x: fragmentPosition.x,
            y: fragmentPosition.y,
            width: fragmentSize.width,
            height: fragmentSize.height,
        }
        interfaceRelations.push(interactionRelation)
    })

    return {
        id: graphId || generateId(),
        desc: graphDesc || '',
        graph_type: 'ESD',
        interactions,
        interfaceRelations
    }
}