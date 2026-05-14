import { type FC, type ReactNode, useEffect } from 'react';
import BaseLifeline from '../common/BaseLifeline';
import './BaseObject.css';

interface BaseObjectProps {
    /** 节点尺寸 */
    width?: number;
    height?: number;
    /** 样式配置 */
    stroke?: string;
    fill?: string;
    node?: any;
    /** 子内容 */
    children?: ReactNode;
}

const BaseObject: FC<BaseObjectProps> = (props) => {
    const { width: propWidth, height: propHeight, stroke: propStroke, fill: propFill, node, children } = props;
    const nodeData = node?.getData?.() || {};
    const nodeSize = node?.getSize?.() || {};

    const width = propWidth || nodeSize.width || nodeData.width || 120;
    const height = propHeight || nodeSize.height || nodeData.height || 300;
    const stroke = propStroke || nodeData.stroke || '#4a90d9';
    const fill = propFill || nodeData.fill || '#fff';

    const objectName = nodeData.objectName || '';
    const className = nodeData.className || '';

    useEffect(() => {
        const currentData = node?.getData?.() || {};
        if (currentData.objectName === undefined || currentData.className === undefined) {
            node?.setData?.({ objectName: '', className: '', ...currentData });
        }
    }, [node]);

    // 头部矩形高度（参与者名称框）
    const headerHeight = 50;

    const headerContent = (
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
                {children || `${objectName}:${className}`}
            </span>
        </div>
    );

    return (
        <BaseLifeline
            width={width}
            height={height}
            stroke={stroke}
            className="seq-lifeline"
            headerContent={headerContent}
            headerHeight={headerHeight}
        />
    );
};

export default BaseObject;
