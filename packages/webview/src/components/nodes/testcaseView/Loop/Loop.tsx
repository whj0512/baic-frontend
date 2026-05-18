import type { ReactNode } from "react";
import NodeWrapper from "../NodeWrapper";

interface LoopProps {
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

const Loop = (props: LoopProps) => {
    const { node, data: propData, nodeName: propNodeName } = props
    const nodeData = node?.getData?.() || {}
    const data = { ...nodeData, ...propData }
    const name = propNodeName ?? data.nodeName ?? 'loop'
    return <NodeWrapper {...props} defaultContent="L" nodeName={name} />;
};

export default Loop;