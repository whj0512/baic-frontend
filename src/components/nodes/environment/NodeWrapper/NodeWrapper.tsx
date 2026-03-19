import { type FC, type ReactNode } from 'react';
import "./NodeWrapper.css"

interface NodeWrapperProps {
    node?: any,
    /** 子内容 */
    children?: ReactNode;
}

const NodeWrapper: FC<NodeWrapperProps> = (props) => {
    const { node, children } = props;
    const nodeData = node?.getData?.() || {};

    const width = nodeData.width || 80;
    const height = nodeData.height || 120;
    const stroke = nodeData.stroke || '#333';
    const fill = nodeData.fill || '#fff';
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