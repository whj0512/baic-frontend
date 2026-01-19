import React, { FC, ReactNode } from 'react';
import './NodeWrapper.css';

interface NodeWrapperProps {
    /** 节点数据 */
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
    /** 节点右下角标识内容 (如 "fx", "G", "tf") */
    defaultContent?: string;
    /** 节点类型名称 (如 "call", "graph") */
    nodeType?: string;
    /** 子内容 */
    children?: ReactNode;
}

const NodeWrapper: FC<NodeWrapperProps> = (props) => {
    const {
        node,
        width: propWidth,
        height: propHeight,
        stroke: propStroke,
        fill: propFill,
        fontColor: propFontColor,
        fontSize: propFontSize,
        nodeName: propNodeName,
        isStencil: propIsStencil,
        defaultContent = 'N',
        nodeType = 'node',
        children,
    } = props;

    // 从 x6 node 中获取数据 (如果存在)
    const nodeData = node?.getData?.() || {};

    const stroke = propStroke || nodeData.stroke || '#333';
    const fill = propFill || nodeData.fill || '#fff';
    const fontColor = propFontColor || nodeData.fontColor || '#333';
    const fontSize = propFontSize || nodeData.fontSize || 14;
    const nodeName = propNodeName || nodeData.nodeName || '';
    const isStencil = propIsStencil || nodeData.isStencil || false;

    // 格式化显示名称
    const displayName = nodeName || '';

    // 获取尺寸
    const nodeSize = node?.getSize?.() || {};
    let width = propWidth || nodeSize.width || 120;
    

    // Stencil 面板使用固定尺寸                                                                                                                                                                                  │
    if (isStencil) {                                                                                                                                                                                             │
        width = 80;                                                                                                                                                                                              │
        height = 50;                                                                                                                                                                                             │
    }

    return (
        <div
            className="node-wrapper"
            style={{
                width,
                height,
                borderColor: stroke,
                backgroundColor: fill,
                color: fontColor,
                fontSize,
            }}
        >
            {/* Stencil 面板模式 */}
            {isStencil && (
                <div className="node-wrapper__stencil">
                    <div className="node-wrapper__stencil-content">
                        {nodeType}
                    </div>
                    <div className="node-wrapper__stencil-badge">
                        <span className="node-wrapper__stencil-badge-text">
                            {defaultContent}
                        </span>
                    </div>
                </div>
            )}

            {/* 画布模式 */}
            {!isStencil && (
                <>
                    <div className="node-wrapper__rect">
                        <div className="node-wrapper__badge">
                            <span className="node-wrapper__badge-text">
                                {defaultContent}
                            </span>
                        </div>
                    </div>
                    <div className="node-wrapper__content">
                        {children || displayName}
                    </div>
                </>
            )}
        </div>
    );
};

export default NodeWrapper;