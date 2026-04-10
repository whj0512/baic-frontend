import type { Graph } from "@antv/x6"
import type { Component, ExportComponent, Relation } from "./exportTypes"

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
        case 'machine-node':
            return {
                ...component,
                name: nodeData.machineName,
                type: 'machine',
                requirementID: nodeData.requirementID
            }
        case 'controller-node':
            return {
                ...component,
                name: nodeData.ctrlName,
                type: 'controller',
                requirementID: nodeData.requirementID
            }
        case 'functional-module-node':
            return {
                ...component,
                name: nodeData.fmName,
                type: 'functional-module',
                requirementID: nodeData.requirementID
            }
    }

    return component
}

export const exportGraphTOJSON = (graph: Graph, graphId?: string, graphDesc?: string) => {
    const components: Component[] = []
    const relations: Relation[] = []

    graph.getNodes().forEach(node => {
        const nodeData = node.getData() || {}
        const converted = convertNode(nodeData, node.id, node.shape)
        if (converted) {
            components.push(converted)
        }
    })

    graph.getEdges().forEach(edge => {
        const sourceCell = edge.getSourceCell()
        const targetCell = edge.getTargetCell()
        if (sourceCell && targetCell) {
            const relation: Relation = {
                id: edge.id,
                type: 'Include',
                source: components.find((component) => component.id === sourceCell.id),
                target: components.find((component) => component.id === targetCell.id),
            }
            relations.push(relation)
        }
    })

    return {
        id: graphId || generateId(),
        desc: graphDesc || '',
        graph_type: 'IBD',
        components,
        relations
    }
}