import { type FC, type PointerEvent as ReactPointerEvent, type ReactNode, useCallback } from 'react';
import type { Graph, Node } from '@antv/x6';
import { beginSequenceConnection } from '../../../graph/flowGraph/sequenceConnection';
import './BaseLifeline.css';

interface BaseLifelineProps {
    width: number;
    height: number;
    stroke: string;
    className?: string; // e.g. "seq-lifeline" or "seq-actor"
    headerContent: ReactNode;
    headerHeight: number;
    tailOffset?: number; // default: 0
    graph?: Graph;
    node?: Node;
}

const BaseLifeline: FC<BaseLifelineProps> = (props) => {
    const { width, height, stroke, className = '', headerContent, headerHeight, tailOffset = 0, graph, node } = props;

    const handleLinePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!graph || !node) return;
        if (beginSequenceConnection(graph, node, event.nativeEvent)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, [graph, node]);

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
                onPointerDown={handleLinePointerDown}
                style={{
                    height: height - headerHeight - tailOffset,
                    borderLeftColor: stroke,
                }}
            />
        </div>
    );
};

export default BaseLifeline;
