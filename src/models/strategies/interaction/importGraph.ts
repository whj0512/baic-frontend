import type { ESD, Componenet, Interaction, InteractionRelation } from './exportTypes'

// 辅助函数：根据表单数据格式化连线的标签显示
const formatLabel = (data: any) => {
    const parts = []
    if (data.stereotype && data.stereotype !== 'base') {
        parts.push(`<<${data.stereotype}>>`)
    }
    const msg = data.message || ''
    const prm = data.params && Array.isArray(data.params)
        ? data.params.map((item: any) => `${item.name}: ${item.type}`).join(', ')
        : ''
    const ret = data.returnType ? `: ${data.returnType}` : ''

    const mainPart = `${msg}(${prm})${ret}`
    if (mainPart !== '()') {
        parts.push(mainPart)
    }
    return parts.join('\n')
}

/**
 * 将 Component 解析并转化为 X6 节点 (对象与参与者生命线)
 */
const convertComponentNode = (component: Componenet, index: number): any => {
    let shape = 'seq-object-node'
    const data: any = {
        stroke: '#1890ff',
        fill: '#fff'
    }

    if (component.type === 'human') {
        shape = 'seq-actor-node'
        data.actorName = component.name
        delete data.stroke
        delete data.fill // 参照 defaultAttrs 移除不必要的边框背景
    } else {
        shape = 'seq-object-node'
        data.className = component.name
        data.type = component.type
    }

    // 后端如果抹除了坐标，提供一个默认初始基于 index 的横向排布防堆叠
    const x = component.x ?? (index % 5) * 200 + 100
    const y = component.y ?? 100
    // 参照 sidebarItems defaultAttrs 的初始尺寸
    const width = component.width ?? 120
    const height = component.height ?? 300

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

/**
 * 将 InteractionRelation (作为组合片段 fragment) 解析转化为 X6 节点
 */
const convertFragmentNode = (relation: InteractionRelation): any => {
    // scope 数组中包含区域片段需要的 conditions
    const conditions = relation.scope ? relation.scope.map(s => s.condition || '') : []
    const data = {
        fragmentType: relation.type,
        fragmentName: relation.id, // 若无名字回退到 id
        conditions
    }

    return {
        id: relation.id,
        shape: 'seq-fragment-node',
        x: relation.x ?? 100,
        y: relation.y ?? 100,
        width: relation.width ?? 200,
        height: relation.height ?? 120,
        data
    }
}

/**
 * 将 Interaction 转化为 X6 坐标连线 (Sequence Diagram 直连坐标)
 */
const convertEdge = (interaction: Interaction): any => {
    // 根据 Message 类型展开映射，以回填表单
    const edgeData: any = {
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
        shape: 'edge', // 时序图连线基础类型，sequence mode 处理路由
        source: interaction.source, // 依赖 Interaction 直接保存的 {x,y} 坐标
        target: interaction.target, // 同上
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

/**
 * 将 dsl-to-rbg API 返回的 JSON 字符串解析为 X6 图数据格式 (时序图 / 交互图)
 * @param jsonString API 返回的 JSON 字符串
 * @returns X6 图数据格式 { cells: [...] }
 */
export const importGraphFromJSON = (jsonString: string): any => {
    // 鲁棒性确保，防止直接传入 object
    const apiData: ESD = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
    const cells: any[] = []

    // 统一收集所有的不重复对象/参与者节点 (由于它们嵌套挂载在 interaction.sender / receiver)
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

    // 1. 转换 Component 转对象/生命线节点
    let nodeIndex = 0
    uniqueNodes.forEach(component => {
        cells.push(convertComponentNode(component, nodeIndex++))
    })

    // 2. 转换 InteractionRelation 为组合片段节点
    if (apiData.interactionRelations && Array.isArray(apiData.interactionRelations)) {
        apiData.interactionRelations.forEach(relation => {
            cells.push(convertFragmentNode(relation))
        })
    }

    // 3. 转换 Interactions 为连线
    if (apiData.interactions && Array.isArray(apiData.interactions)) {
        apiData.interactions.forEach(interaction => {
            // 在时序图中坐标连线对 source / target 的坐标本身有要求
            if (interaction.source && interaction.target) {
                cells.push(convertEdge(interaction))
            }
        })
    }

    return { cells }
}

export default importGraphFromJSON
