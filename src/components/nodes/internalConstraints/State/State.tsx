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

const DURING_SYMBOL = 'during';

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
    const normal = nodeData.normal || [];
    
    const duringActions = normal?.filter((item: ActionItem) => item.symbol === DURING_SYMBOL) || [];
    const normalActions = normal?.filter((item: ActionItem) => item.symbol !== DURING_SYMBOL) || [];

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

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // 使用 borderBoxSize 或 contentRect 获取当前组件所需的实际大小
                // 这里的 div 设置为 fit-content，所以它的大小会随内容变化
                const targetBox = entry.borderBoxSize?.[0] || entry.contentRect;
                // borderBoxSize is an object with inlineSize/blockSize, contentRect has width/height
                // Using getBoundingClientRect is often safer for actual rendered pixel size including borders
                const rect = containerRef.current!.getBoundingClientRect();
                
                // 由于 x6 的缩放，getBoundingClientRect 可能包含缩放因子
                // 但 ResizeObserver 返回的 contentRect 通常是未缩放的 CSS 像素? 
                // X6 节点是在 transform 容器内的。
                // 简单做法：我们只关心 contentRect (它不包含 border) 或 offsetWidth/offsetHeight
                
                const newWidth = containerRef.current!.offsetWidth;
                const newHeight = containerRef.current!.offsetHeight;
                
                const currentSize = node.getSize();

                // 只有当尺寸发生显著变化且大于 0 时才更新
                // 允许一定的误差 (e.g. 1px) 避免浮点数死循环
                if (
                    (Math.abs(currentSize.width - newWidth) > 2 ||
                    Math.abs(currentSize.height - newHeight) > 2) &&
                    newWidth > 0 &&
                    newHeight > 0
                ) {
                     // 使用 requestAnimationFrame 或 setTimeout 避免 "ResizeObserver loop limit exceeded"
                    requestAnimationFrame(() => {
                        node.setSize({ width: newWidth, height: newHeight });
                    });
                }
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [node, isStencil]);


    return (
        <div
            ref={containerRef}
            className="state-node"
            style={{
                // 画布模式下使用 fit-content 允许内容撑开，同时设置最小尺寸
                // Stencil 模式下使用固定尺寸
                width: isStencil ? width : 'fit-content',
                height: isStencil ? height : 'fit-content',
                minWidth: isStencil ? undefined : 120, 
                minHeight: isStencil ? undefined : 80,
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
                        {/* During 动作列表（高亮显示） */}
                        {duringActions.length > 0 && (
                            <div className="state-node__detail">
                                {duringActions.map((item: ActionItem, index: number) => (
                                    <div key={`during-${index}`} className="state-node__row state-node__row--during">
                                        {joinObject(item)}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Normal 动作列表 */}
                        {normalActions.length > 0 && (
                            <div className="state-node__detail">
                                {normalActions.map((item: ActionItem, index: number) => (
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
