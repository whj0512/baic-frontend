import React, { FC, useEffect, useRef, ReactNode } from 'react';
import './State.css';

interface ActionItem {
    name: string;
    value: string;
    symbol: string;
    isStandard: boolean;
}

interface StateNodeProps {
    /** x6 节点实例 */
    node?: any;
    /** 节点尺寸 */
    width?: number;
    height?: number;
    /** 样式配置 */
    stroke?: string;
    fill?: string;
    fontColor?: string;
    fontSize?: number;
    /** 节点名称 */
    nodeName?: string;
    /** 是否在 Stencil 面板中显示 */
    isStencil?: boolean;
    /** 子内容 */
    children?: ReactNode;
}

// 将动作对象转换为表达式字符串
const joinObject = (obj: ActionItem): string => {
    const { name, symbol, value } = obj;
    if (symbol === '()') {
        return `${name}(${value})`;
    }
    return `${name} ${symbol} ${value}`.trim();
};

const State: FC<StateNodeProps> = (props) => {
    const {
        node,
        width: propWidth,
        height: propHeight,
        stroke: propStroke,
        fill: propFill,
        fontColor: propFontColor,
        fontSize: propFontSize,
        nodeName: propNodeName,
        isStencil = false,
        children,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);

    // 从 x6 node 中获取数据 (如果存在)
    const nodeData = node?.getData?.() || {};

    const stroke = propStroke || nodeData.stroke || '#333';
    const fill = propFill || nodeData.fill || '#fff';
    const fontColor = propFontColor || nodeData.fontColor || '#333';
    const fontSize = propFontSize || nodeData.fontSize || 12;
    const nodeName = propNodeName || nodeData.nodeName || 'State';
    const normal = nodeData.normal || [];  // 动作-常规
    const dynamic = nodeData.dynamic || []; // 动作-动态

    // 获取尺寸
    const nodeSize = node?.getSize?.() || {};
    let width = propWidth || nodeSize.width || 120;
    let height = propHeight || nodeSize.height || 80;

    // Stencil 面板使用固定尺寸
    if (isStencil) {
        width = 100;
        height = 60;
    }

    // 响应式尺寸调整 (仅在非 Stencil 模式下启用)
    useEffect(() => {
        if (!containerRef.current || !node || isStencil) return;
    }, [node, isStencil]);


    return (
        <div
            ref={containerRef}
            className="state-node"
            style={{
                // 画布模式下使用 100% 响应 Transform 缩放，内容溢出时由 ResizeObserver 撑开
                width,
                height,
                minWidth: 120,
                minHeight: 80,
                color: fontColor,
                fontSize,
                ['--state-stroke' as any]: stroke,
                ['--state-fill' as any]: fill,
            }}
        >
            {/* Stencil 面板模式 */}
            {isStencil && (
                <div className="state-node__stencil">
                    <div className="state-node__stencil-text">{nodeName}</div>
                    <div className="state-node__stencil-badge">S</div>
                </div>
            )}

            {/* 画布模式 */}
            {!isStencil && (
                <>
                    {/* 节点名称头部 */}
                    <div className="state-node__header">
                        {nodeName}
                    </div>

                    {/* 内容区域 */}
                    <div className="state-node__content">
                        {/* Dynamic 动作列表（动态动作，高亮显示） */}
                        {dynamic.length > 0 && (
                            <div className="state-node__detail">
                                {dynamic.map((item: ActionItem, index: number) => (
                                    <div key={`dynamic-${index}`} className="state-node__row state-node__row--during">
                                        {joinObject(item)}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Normal 动作列表（常规动作） */}
                        {normal.length > 0 && (
                            <div className="state-node__detail">
                                {normal.map((item: ActionItem, index: number) => (
                                    <div key={`normal-${index}`} className="state-node__row">
                                        {joinObject(item)}
                                    </div>
                                ))}
                            </div>
                        )}
                        {children}
                    </div>

                    {/* 右下角 Badge (S) */}
                    <div className="state-node__badge">
                        <span className="state-node__badge-text">S</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default State;
