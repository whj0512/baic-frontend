import { type FC, type ReactNode } from 'react'
import NodeWrapper from '../NodeWrapper'
import * as utils from '../Assignment/utils'

interface SubBranchProps {
    node?: any
    data?: Record<string, unknown>
    width?: number
    height?: number
    stroke?: string
    fill?: string
    fontFill?: string
    fontColor?: string
    fontSize?: number
    nodeName?: string
    children?: ReactNode
}

const SubBranch: FC<SubBranchProps> = (props) => {
    const { node, data: propData, nodeName: propNodeName, children } = props
    const nodeData = node?.getData?.() || {}
    const data = { ...nodeData, ...propData }
    const name = utils.normalizeValue(propNodeName ?? data.nodeName ?? data.name ?? 'subBranch')

    return (
        <NodeWrapper {...props} nodeName={name} defaultContent="sb">
            {children}
        </NodeWrapper>
    )
}

export default SubBranch
