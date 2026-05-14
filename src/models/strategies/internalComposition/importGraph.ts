import type { BDD, Relation } from './exportTypes'

/**
 * 将 API 节点转换为 X6 节点数据
 */
const convertNode = (apiNode: any, index: number): any => {
    let shape = 'custom-rect-node'
    const data: any = {
        // 基础节点样式，与 internalCompositionStrategy 中的配置保持一致
        stroke: '#333',
        fill: '#fff'
    }

    // 根据组件类型转换为对应的 shape 和特有数据
    switch (apiNode.type?.toLowerCase()) {
        case 'machine':
            shape = 'machine-node'
            data.nodeName = apiNode.name
            data.requirementID = apiNode.requirementID
            break
        case 'controller':
            shape = 'controller-node'
            data.nodeName = apiNode.name
            data.requirementID = apiNode.requirementID
            break
        case 'functional-module':
            shape = 'functional-module-node'
            data.nodeName = apiNode.name
            data.requirementID = apiNode.requirementID
            break
        default:
            data.nodeName = apiNode.name // custom rect node 的回退兜底
    }

    // 计算初始坐标。DSL返回的模型若无坐标信息，提供简单的网格布局算法，防止重叠
    const x = apiNode.render_config?.x ?? (index % 5) * 150 + 100
    const y = apiNode.render_config?.y ?? Math.floor(index / 5) * 120 + 100

    // 基础节点配置，参考 sidebarItems 中的 defaultAttrs 尺寸：120x60
    const width = apiNode.render_config?.width ?? 120
    const height = apiNode.render_config?.height ?? 60

    return {
        id: apiNode.id,
        shape,
        x,
        y,
        width,
        height,
        data,
    }
}

/**
 * 将 API 边转换为 X6 边数据结构雏形
 */
const convertEdge = (apiRelation: Relation): any => {
    // Edge 数据结构
    const edgeData = {
        relationType: apiRelation.type // 记录组合关系的类别，如 Include
    }

    // 获取 source 和 target ID，兼顾 API 可能传对象或直接传 ID 的情况
    const sourceNodeId = apiRelation.source?.id ?? apiRelation.source ?? ''
    const targetNodeId = apiRelation.target?.id ?? apiRelation.target ?? ''

    return {
        id: apiRelation.id,
        shape: 'edge', // 默认线
        source: sourceNodeId ? { cell: sourceNodeId } : undefined,
        target: targetNodeId ? { cell: targetNodeId } : undefined,
        attrs: {
            line: {
                stroke: '#1890ff',
                strokeWidth: 2,
                sourceMarker: {
                    name: 'circlePlus',
                    r: 4,
                    fill: '#fff'
                },
                targetMarker: null,
            },
        },
        router: { name: 'orth' },
        connector: { name: 'rounded', args: { radius: 8 } },
        data: edgeData,
    }
}

/**
 * 将 dsl-to-rbg API 返回的 JSON 字符串解析为 X6 图数据格式
 * @param jsonString API 返回的 JSON 字符串
 * @returns X6 图数据格式 { cells: [...] }
 */
export const importGraphFromJSON = (jsonString: string): any => {
    // 有时后端可能直接返回对象，为了鲁棒性做一次判断
    const apiData: BDD = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString

    const cells: any[] = []

    // 1. 转换节点 (Component)
    if (apiData.components && Array.isArray(apiData.components)) {
        apiData.components.forEach((component, index) => {
            cells.push(convertNode(component, index))
        })
    }

    // 2. 转换连线 (Relation)
    if (apiData.relations && Array.isArray(apiData.relations)) {
        apiData.relations.forEach((relation: any) => {
            // 过滤掉缺失端点关联的脏数据（若 source 和 target 未能解析）
            const edge = convertEdge(relation)
            if (edge.source && edge.target) {
                cells.push(edge)
            }
        })
    }

    return { cells }
}

export default importGraphFromJSON
