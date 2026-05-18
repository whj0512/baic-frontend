import { type FC, type ReactNode } from 'react';
import "./NodeWrapper.css"

interface NodeWrapperProps {
    /** 节点尺寸 */
    width?: number;
    height?: number;
    /** 样式配置 */
    stroke?: string;
    fill?: string;
    node?: any,
    /** 子内容 */
    children?: ReactNode;
}

const NodeWrapper: FC<NodeWrapperProps> = (props) => {
    const { width: propWidth, height: propHeight, stroke: propStroke, fill: propFill, node, children } = props;
    const nodeData = node?.getData?.() || {};
    const nodeSize = node?.getSize?.() || {};

    const width = propWidth || nodeSize.width || nodeData.width || 120;
    const height = propHeight || nodeSize.height || nodeData.height || 60;
    const stroke = propStroke || nodeData.stroke || '#333';
    const fill = propFill || nodeData.fill || '#fff';
    const nodeName = nodeData.nodeName || '';

    return (
        <div
            className='node-wrapper'
            style={{
                width,
                height,
                borderColor: stroke,
                backgroundColor: fill,
            }}
        >
            <div className="node-wrapper__rect">
            </div>
            <div className="node-wrapper__content">
                {children || nodeName}
            </div>
        </div>
    )
}

export default NodeWrapper;