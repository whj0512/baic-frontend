import { type FC, type ReactNode } from 'react';
import './CombinedFragment.css'

interface CombinedFragmentProps {
    width?: number;
    height?: number;
    stroke?: string;
    fill?: string;
    node?: any;
    children?: ReactNode;
}

const CombinedFragment: FC<CombinedFragmentProps> = (props) => {
    const { width: propWidth, height: propHeight, stroke: propStroke, fill: propFill, node, children } = props;
    const nodeData = node?.getData?.() || {};

    const width = propWidth || nodeData.width || 200;
    const height = propHeight || nodeData.height || 120;
    const stroke = propStroke || nodeData.stroke || '#666';
    const fill = propFill || nodeData.fill || 'rgba(245, 245, 245, 0.5)';
    const nodeName = nodeData.nodeName || 'alt';

    return (
        <div
            className="seq-fragment"
            style={{
                width,
                height,
                borderColor: stroke,
                backgroundColor: fill,
            }}
        >
            {/* 左上角操作符标签 */}
            <div
                className="seq-fragment__tag"
                style={{ borderColor: stroke, color: stroke }}
            >
                {children || nodeName}
            </div>

            {/* 内容区（用于放置内部交互） */}
            <div className="seq-fragment__body" />
        </div>
    )
}

export default CombinedFragment;
