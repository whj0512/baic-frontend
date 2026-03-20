import { type FC, type ReactNode } from 'react';
import './NodeWrapper.css'

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

    const width = propWidth || nodeData.width || 120;
    const height = propHeight || nodeData.height || 300;
    const stroke = propStroke || nodeData.stroke || '#4a90d9';
    const fill = propFill || nodeData.fill || '#fff';
    const nodeName = nodeData.nodeName || '';

    // 头部矩形高度（参与者名称框）
    const headerHeight = 50;

    return (
        <div
            className="seq-lifeline"
            style={{ width, height }}
        >
            {/* 参与者头部矩形 */}
            <div
                className="seq-lifeline__header"
                style={{
                    borderColor: stroke,
                    backgroundColor: fill,
                    height: headerHeight,
                }}
            >
                <span
                    className="seq-lifeline__label"
                    style={{ color: stroke }}
                >
                    {children || nodeName}
                </span>
            </div>

            {/* 生命线（虚线） */}
            <div
                className="seq-lifeline__line"
                style={{
                    height: height - headerHeight,
                    borderLeftColor: stroke,
                }}
            />
        </div>
    )
}

export default NodeWrapper;
