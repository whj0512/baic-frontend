import { type FC, type ReactNode } from 'react';
import './BaseLifeline.css';

interface BaseLifelineProps {
    width: number;
    height: number;
    stroke: string;
    className?: string; // e.g. "seq-lifeline" or "seq-actor"
    headerContent: ReactNode;
    headerHeight: number;
    tailOffset?: number; // default: 0
}

const BaseLifeline: FC<BaseLifelineProps> = (props) => {
    const { width, height, stroke, className = '', headerContent, headerHeight, tailOffset = 0 } = props;

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
