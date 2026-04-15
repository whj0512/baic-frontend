import type { IBD, Connect } from './exportTypes'
import environmentStrategy from '../../../components/graph/strategies/environment'

/**
 * 将 API 节点转换为 X6 节点数据
 */
const convertNode = (apiNode: any, index: number): any => {
    let shape = 'custom-rect-node'
    const data: any = {
        // 基础节点样式，与 environmentStrategy 中的配置保持一致
        stroke: '#333',
        fill: '#fff'
    }

    // 根据组件类型转换为对应的 shape 和特有数据
    switch (apiNode.type?.toLowerCase()) {
        case 'device':
            shape = 'device-node'
            data.deviceName = apiNode.name
            data.ports = apiNode.ports
            break
        case 'control-unit':
            shape = 'control-unit-node'
            data.ctrlUnitName = apiNode.name
            data.ports = apiNode.ports
            data.ctrlUnitTimer = apiNode.timer
            data.ctrlUnitPeriod = apiNode.controlPeriod
            break
        case 'human':
            shape = 'human-node'
            data.humanName = apiNode.name
            break
        case 'machine':
            shape = 'machine-node'
            data.machineName = apiNode.name
            data.requirementID = apiNode.requirementID
            break
        case 'controller':
            shape = 'controller-node'
            data.ctrlName = apiNode.name
            data.requirementID = apiNode.requirementID
            break
        case 'functional-module':
            shape = 'functional-module-node'
            data.fmName = apiNode.name
            data.requirementID = apiNode.requirementID
            break
        default:
            data.nodeName = apiNode.name // custom rect node 的回退兜底
    }

    // 计算初始坐标。DSL返回的模型若无坐标信息，提供简单的网格布局算法，防止重叠
    const x = apiNode.render_config?.x ?? (index % 5) * 150 + 100
    const y = apiNode.render_config?.y ?? Math.floor(index / 5) * 180 + 100

    // 基础节点配置，参考 sidebarItems 中的 defaultAttrs 尺寸：80x120
    const width = apiNode.render_config?.width ?? 80
    const height = apiNode.render_config?.height ?? 120

    const nodeCell: any = {
        id: apiNode.id,
        shape,
        x,
        y,
        width,
        height,
        data,
    }

    return nodeCell
}

/**
 * 将 API 边转换为 X6 边数据结构雏形
 */
const convertEdge = (apiConnect: Connect): any => {
    // Edge 表单绑定组件 'EdgeConnect' 需要的数据结构
    const edgeData = {
        connect: {
            interactions: apiConnect.interactions || []
        }
    }

    let sourceNodeId = ''
    let targetNodeId = ''

    // 图中连线方向由 interaction 定义推测提取
    if (apiConnect.interactions && apiConnect.interactions.length > 0) {
        sourceNodeId = apiConnect.interactions[0].sender || ''
        targetNodeId = apiConnect.interactions[0].receiver || ''
    }

    return {
        id: apiConnect.id,
        shape: 'edge', // 默认线
        source: sourceNodeId ? { cell: sourceNodeId } : undefined,
        target: targetNodeId ? { cell: targetNodeId } : undefined,
        attrs: {
            line: {
                stroke: '#1890ff',
                strokeWidth: 2,
                targetMarker: null
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
    const apiData: IBD = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString

    const cells: any[] = []
    const nodesMap = new Map<string, any>()

    // 1. 转换节点 (Component)
    if (apiData.components && Array.isArray(apiData.components)) {
        apiData.components.forEach((component, index) => {
            const nodeCell = convertNode(component, index)

            // 注入 port groups 配置和连接桩列表
            const portGroups = environmentStrategy.edgeRules?.getPortGroups?.(nodeCell.shape) || {}
            nodeCell.ports = {
                groups: portGroups,
                items: []
            }

            // 若包含后端特有的渲染 port 信息，合并其 items
            if (component.render_config?.ports?.items) {
                nodeCell.ports.items = component.render_config.ports.items
            }

            nodesMap.set(nodeCell.id, nodeCell)
        })
    }

    // 2. 转换连线 (Connect) 并分配连接桩
    if (apiData.connects && Array.isArray(apiData.connects)) {
        apiData.connects.forEach(connect => {
            // 过滤掉缺失端点关联的脏数据（若 source 和 target 未能解析）
            const edge = convertEdge(connect)
            if (edge.source?.cell && edge.target?.cell) {
                const sourceNode = nodesMap.get(edge.source.cell)
                const targetNode = nodesMap.get(edge.target.cell)

                if (sourceNode && targetNode) {
                    // 为源节点动态分配 out group 端口
                    const outPortItems = sourceNode.ports.items.filter((p: any) => p.group === 'out')
                    const newOutPortId = `out-${outPortItems.length}`
                    sourceNode.ports.items.push({ id: newOutPortId, group: 'out' })

                    // 为目标节点动态分配 in group 端口
                    const inPortItems = targetNode.ports.items.filter((p: any) => p.group === 'in')
                    const newInPortId = `in-${inPortItems.length}`
                    targetNode.ports.items.push({ id: newInPortId, group: 'in' })

                    // 将端点绑定至刚才计算分配好的端口
                    edge.source.port = newOutPortId
                    edge.target.port = newInPortId

                    cells.push(edge)
                }
            }
        })
    }

    // 按顺序把组装好的节点推入最前面
    cells.unshift(...Array.from(nodesMap.values()))

    return { cells }
}

export default importGraphFromJSON
