import { type FC, type ReactNode, useEffect, useCallback } from 'react';
import './BaseLifeline.css';

interface BaseLifelineProps {
    width: number;
    height: number;
    stroke: string;
    className?: string; // e.g. "seq-lifeline" or "seq-actor"
    headerContent: ReactNode;
    headerHeight: number;
    tailOffset?: number; // default: 0
    node?: any; // X6 node 实例，用于自动延长生命线
}

const BaseLifeline: FC<BaseLifelineProps> = (props) => {
    const { width, height, stroke, className = '', headerContent, headerHeight, tailOffset = 0, node } = props;

    // 自动延长生命线：监听画布边的增删，根据连接到当前节点的边的最大 dy 偏移自动调整节点高度
    // const updateNodeHeight = useCallback(() => {
    //     if (!node) return;
    //     const graph = (node as any).model?.graph;
    //     if (!graph) return;

    //     const edges = graph.getConnectedEdges(node);
    //     let maxDy = 0;

    //     for (const edge of edges) {
    //         const src = edge.getSource();
    //         const tgt = edge.getTarget();
    //         // 检查该边在当前节点侧的 anchor dy
    //         if (src?.cell === node.id && src?.anchor?.args?.dy != null) {
    //             maxDy = Math.max(maxDy, Math.abs(src.anchor.args.dy));
    //         }
    //         if (tgt?.cell === node.id && tgt?.anchor?.args?.dy != null) {
    //             maxDy = Math.max(maxDy, Math.abs(tgt.anchor.args.dy));
    //         }
    //     }

    //     // 边的锚点位于 center + dy，即 nodeHeight/2 + dy
    //     // 需要确保锚点在节点区域内且在头部下方：nodeHeight > 2 * (dy + buffer)
    //     const baseHeight = 300;
    //     const minHeight = Math.max(baseHeight, 2 * (maxDy + 60));
    //     const currentSize = node.size();

    //     // 只在必要时自动撑长生命线，绝不擅自缩小以覆盖用户的 Transform 放大操作
    //     if (minHeight > currentSize.height) {
    //         node.resize(currentSize.width, minHeight);
    //         node.setData({ ...node.getData(), height: minHeight });
    //     }
    // }, [node]);

    // useEffect(() => {
    //     if (!node) return;
    //     const graph = (node as any).model?.graph;
    //     if (!graph) return;

    //     graph.on('edge:added', updateNodeHeight);
    //     graph.on('edge:removed', updateNodeHeight);

    //     return () => {
    //         graph.off('edge:added', updateNodeHeight);
    //         graph.off('edge:removed', updateNodeHeight);
    //     };
    // }, [node, updateNodeHeight]);

    return (
        <div
            className={`seq-base-lifeline ${className}`}
            style={{ width, height }}
        >
            {/* 头部区域（自定义渲染内容） */}
            {headerContent}

            {/* 生命线（虚线） */}
            <div
                className="seq-base-lifeline__line"
                style={{
                    height: height - headerHeight - tailOffset,
                    borderLeftColor: stroke,
                }}
            />
        </div>
    );
};

export default BaseLifeline;
