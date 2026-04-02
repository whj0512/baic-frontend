import { type FC, type ReactNode, useEffect } from 'react';
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
    const nodeSize = node?.getSize?.() || {};

    const width = propWidth || nodeSize.width || nodeData.width || 200;
    const height = propHeight || nodeSize.height || nodeData.height || 120;
    const stroke = propStroke || nodeData.stroke || '#666';
    const fill = propFill || nodeData.fill || 'rgba(245, 245, 245, 0.5)';

    const fragmentType = nodeData.fragmentType || '';
    const fragmentName = nodeData.fragmentName || '';
    const condition = nodeData.condition || '';

    useEffect(() => {
        const currentData = node?.getData?.() || {};
        if (currentData.fragmentType === undefined || currentData.fragmentName === undefined) {
            node?.setData?.({ fragmentType: '', fragmentName: '', ...currentData });
        }
    }, [node]);

    useEffect(() => {
        node?.setZIndex?.(-1);
    }, [node]);

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
                {children || `${fragmentType} ${fragmentName}`}
            </div>

            {/* 条件区（如果存在） */}
            {Boolean(condition) && (
                <div
                    className="seq-fragment__condition"
                    style={{ color: stroke }}
                >
                    [{condition}]
                </div>
            )}

            {/* 内容区（用于放置内部交互） */}
            <div className="seq-fragment__body" />
        </div>
    )
}

export default CombinedFragment;
