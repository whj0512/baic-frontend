import type { ReactNode } from "react";
import NodeWrapper from "../NodeWrapper";

interface TraverseProps {
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

const Traverse = (props: TraverseProps) => {
    const { node, data: propData, nodeName: propNodeName } = props
    const nodeData = node?.getData?.() || {}
    const data = { ...nodeData, ...propData }
    const name = propNodeName ?? data.nodeName ?? 'traverse'
    return <NodeWrapper {...props} defaultContent="tr" nodeName={name} />;
};

export default Traverse;