import { PlusCircleOutlined } from '@ant-design/icons'
import type { Graph, Node } from '@antv/x6'
import { type FC, type MouseEvent } from 'react'
import './Branch.css'

interface BranchProps {
    node?: Node
    graph?: Graph
    data?: Record<string, unknown>
    width?: number
    height?: number
    stroke?: string
    fill?: string
    fontFill?: string
    fontColor?: string
    fontSize?: number
    onAddBranch?: (args: { node?: Node; graph?: Graph; data: Record<string, unknown>; childNode?: Node }) => void
}

const SUB_BRANCH_SHAPE = 'sub-branch-node'
const SUB_BRANCH_WIDTH = 80
const SUB_BRANCH_HEIGHT = 40
const SUB_BRANCH_GAP = 40
const SUB_BRANCH_OFFSET_Y = 20

const createSubBranchName = (index: number) => `${String.fromCharCode(0x5206, 0x652f)}${index}`

const getSubBranchCount = (graph: Graph, parentId: string) => {
    return graph
        .getNodes()
        .filter((item) => item.shape === SUB_BRANCH_SHAPE && item.getData<Record<string, unknown>>()?.parentId === parentId)
        .length
}

const Branch: FC<BranchProps> = (props) => {
    const {
        node,
        graph,
        data: propData,
        width: propWidth,
        height: propHeight,
        stroke: propStroke,
        fill: propFill,
        fontFill: propFontFill,
        fontColor: propFontColor,
        fontSize: propFontSize,
        onAddBranch,
    } = props

    const nodeData = node?.getData?.() || {}
    const data = { ...nodeData, ...propData }
    const nodeSize = node?.getSize()

    const width = propWidth ?? nodeSize?.width ?? 120
    const height = propHeight ?? nodeSize?.height ?? 100
    const stroke = propStroke ?? data.stroke ?? '#333'
    const fill = propFill ?? data.fill ?? '#fff'
    const fontFill = propFontFill ?? propFontColor ?? data.fontFill ?? data.fontColor ?? '#333'
    const fontSize = propFontSize ?? data.fontSize ?? 12

    const handleAddBranch = (event: MouseEvent<HTMLSpanElement>) => {
        event.stopPropagation()
        event.preventDefault()

        let childNode: Node | undefined

        const isStencilNode = Boolean(event.currentTarget.closest('.x6-widget-stencil'))

        if (!isStencilNode && graph && node) {
            const parentId = node.id
            const subBranchCount = getSubBranchCount(graph, parentId)
            const nextIndex = subBranchCount + 1
            const name = createSubBranchName(nextIndex)
            const parentPosition = node.getPosition()
            const parentSize = node.getSize()

            childNode = graph.addNode({
                id: `sub_branch_${Date.now()}_${nextIndex}`,
                shape: SUB_BRANCH_SHAPE,
                x: parentPosition.x + subBranchCount * SUB_BRANCH_GAP,
                y: parentPosition.y + parentSize.height + SUB_BRANCH_OFFSET_Y,
                width: SUB_BRANCH_WIDTH,
                height: SUB_BRANCH_HEIGHT,
                data: {
                    renderKey: 'subBranch',
                    nodeName: name,
                    label: name,
                    parentId,
                    conditionalExpression: '',
                    stroke: data.stroke ?? '#333',
                    fill: data.fill ?? '#fff',
                    fontFill: data.fontFill ?? data.fontColor ?? '#333',
                    fontSize: data.fontSize ?? 12,
                },
            })

            node.resize(Math.max(parentSize.width, width) + SUB_BRANCH_GAP, parentSize.height)
            node.setData({
                ...data,
                subBranchCount: nextIndex,
            })
        }

        onAddBranch?.({ node, graph, data, childNode })
    }

    return (
        <div
            className="branch-node"
            style={{
                width,
                height,
                borderColor: stroke as string,
                background: fill as string,
                color: fontFill as string,
                fontSize: Number(fontSize),
            }}
        >
            <div className="branch-node__add">
                <PlusCircleOutlined onClick={handleAddBranch} />
            </div>
            <div className="branch-node__rect">
                <div className="branch-node__badge">
                    <div className="branch-node__badge-text">B</div>
                </div>
            </div>
        </div>
    )
}

export default Branch
