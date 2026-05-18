import React, { FC, ReactNode } from 'react';
import './Goto.css';

interface GotoNodeProps {
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

const Goto: FC<GotoNodeProps> = (props) => {
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

    // 从 x6 node 中获取数据 (如果存在)
    const nodeData = node?.getData?.() || {};

    const stroke = propStroke || nodeData.stroke || '#333';
    const fill = propFill || nodeData.fill || '#fff';
    const fontColor = propFontColor || nodeData.fontColor || '#333';
    const fontSize = propFontSize || nodeData.fontSize || 14;
    const nodeName = propNodeName || nodeData.nodeName || '';

    // 获取尺寸
    const nodeSize = node?.getSize?.() || {};
    let width = propWidth || nodeSize.width || 120;
    let height = propHeight || nodeSize.height || 60;

    // Stencil 面板使用固定尺寸
    if (isStencil) {
        width = 80;
        height = 40;
    }

    // 格式化显示名称
    const displayName = nodeName || 'Goto';

    return (
        <div
            className="goto-node"
            style={{
                width,
                height,
                color: fontColor,
                fontSize,
                ['--goto-stroke' as any]: stroke,
                ['--goto-fill' as any]: fill,
            }}
        >
            {/* Stencil 面板模式 */}
            {isStencil && (
                <div className="goto-node__stencil">
                    <div className="goto-node__stencil-inner">
                        <span className="goto-node__stencil-text">Goto</span>
                    </div>
                </div>
            )}

            {/* 画布模式 */}
            {!isStencil && (
                <>
                    <div className="goto-node__shape">
                        <div className="goto-node__shape-inner"></div>
                    </div>
                    <div className="goto-node__content">
                        {children || displayName}
                    </div>
                </>
            )}
        </div>
    );
};

export default Goto;
