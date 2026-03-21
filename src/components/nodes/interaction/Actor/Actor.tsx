import { type FC, type ReactNode } from 'react';
import BaseLifeline from '../common/BaseLifeline';
import './Actor.css';

interface ActorProps {
    width?: number;
    height?: number;
    stroke?: string;
    node?: any;
    children?: ReactNode;
}

const Actor: FC<ActorProps> = (props) => {
    const { width: propWidth, height: propHeight, stroke: propStroke, node, children } = props;
    const nodeData = node?.getData?.() || {};
    const nodeSize = node?.getSize?.() || {};

    const width = propWidth || nodeSize.width || nodeData.width || 80;
    const height = propHeight || nodeSize.height || nodeData.height || 300;
    const stroke = propStroke || nodeData.stroke || '#4a90d9';
    const nodeName = nodeData.nodeName || '';

    // 头部区域高度（图标 + 名称）
    const headerHeight = 80;

    const headerContent = (
        <>
            {/* 角色图标（火柴人） */}
            <div className="seq-actor__icon" style={{ height: headerHeight }}>
                <svg
                    viewBox="0 0 40 55"
                    width="36"
                    height="50"
                    fill="none"
                    stroke={stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {/* 头 */}
                    <circle cx="20" cy="8" r="7" />
                    {/* 身体 */}
                    <line x1="20" y1="15" x2="20" y2="35" />
                    {/* 手臂 */}
                    <line x1="8" y1="24" x2="32" y2="24" />
                    {/* 左腿 */}
                    <line x1="20" y1="35" x2="10" y2="52" />
                    {/* 右腿 */}
                    <line x1="20" y1="35" x2="30" y2="52" />
                </svg>
            </div>

            {/* 名称标签 */}
            <div
                className="seq-actor__label"
                style={{ color: stroke }}
            >
                {children || nodeName}
            </div>
        </>
    );

    return (
        <BaseLifeline
            width={width}
            height={height}
            stroke={stroke}
            className="seq-actor"
            headerContent={headerContent}
            headerHeight={headerHeight}
            tailOffset={20}
            node={node}
        />
    );
};

export default Actor;
