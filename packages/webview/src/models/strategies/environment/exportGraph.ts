import type { Graph } from "@antv/x6"
import type { Component, Connect, ExportComponent } from './exportTypes'

// 生成唯一 ID
const generateId = (): string => {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const convertNode = (
    nodeData: any,
    nodeId: string,
    shape: string,
): ExportComponent | null => {
    if (!shape) return null

    const component: Component = {
        id: nodeId,
        type: ''
    }

    switch (shape) {
        case 'device-node':
            return {
                ...component,
                name: nodeData.nodeName,
                type: 'device',
                ports: nodeData.ports
            }
        case 'control-unit-node':
            return {
                ...component,
                name: nodeData.nodeName,
                type: 'control-unit',
                ports: nodeData.ports,
                timer: nodeData.ctrlUnitTimer,
                controlPeriod: nodeData.ctrlUnitPeriod
            }
        case 'human-node':
            return {
                ...component,
                name: nodeData.nodeName,
                type: 'human'
            }
        case 'machine-node':
            return {
                ...component,
                name: nodeData.nodeName,
                type: 'machine',
                requirementID: nodeData.requirementID
            }
        case 'controller-node':
            return {
                ...component,
                name: nodeData.nodeName,
                type: 'controller',
                requirementID: nodeData.requirementID
            }
        case 'functional-module-node':
            return {
                ...component,
                name: nodeData.nodeName,
                type: 'functional-module',
                requirementID: nodeData.requirementID
            }
    }

    return component
}

export const exportGraphTOJSON = (graph: Graph, graphId?: string, graphDesc?: string) => {
    const components: Component[] = []
    const connects: Connect[] = []

    graph.getNodes().forEach(node => {
        const nodeData = node.getData() || {}
        const converted = convertNode(nodeData, node.id, node.shape)
        if (converted) {
            components.push(converted)
        }
    })

    graph.getEdges().forEach(edge => {
        const edgeData = edge.getData() || {}
        const sourceCell = edge.getSourceCell()
        const targetCell = edge.getTargetCell()
        if (sourceCell && targetCell) {
            const connection: Connect = {
                id: edge.id,
                interactions: edgeData.connect.interactions
            }
            connects.push(connection)
        }
    })

    return {
        id: graphId || generateId(),
        desc: graphDesc || '',
        graph_type: 'IBD',
        components,
        connects
    }
}