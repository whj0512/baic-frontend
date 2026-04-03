import { type FC, type ReactNode, useEffect, useMemo } from 'react';
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
    const conditions: string[] = useMemo(
        () => (Array.isArray(nodeData.conditions) ? nodeData.conditions : []),
        [nodeData.conditions]
    );

    // Tag 区域高度（标签 + 首条件标签的大致高度）
    const TAG_AREA_HEIGHT = 28;

    useEffect(() => {
        const currentData = node?.getData?.() || {};
        if (currentData.fragmentType === undefined || currentData.fragmentName === undefined) {
            node?.setData?.({ fragmentType: '', fragmentName: '', conditions: [], ...currentData });
        }
    }, [node]);

    useEffect(() => {
        node?.setZIndex?.(-1);
    }, [node]);

    // body 区域的可用高度（去掉 tag 区域）
    const bodyHeight = height - TAG_AREA_HEIGHT;

    // 虚线分隔线数量 = conditions.length（每个 condition 前面画一条虚线，第一个 condition 的标签显示在 tag 下方，不画线）
    // 即：conditions[0] 显示在顶部条件区，conditions[1..n] 各自在虚线下方
    // 分区数 = max(1, conditions.length)，虚线数 = max(0, conditions.length - 1)
    const sectionCount = Math.max(1, conditions.length);
    const sectionHeight = bodyHeight / sectionCount;

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

            {/* 首条件标签（显示在 tag 旁边） */}
            {conditions.length > 0 && conditions[0] && (
                <div
                    className="seq-fragment__condition"
                    style={{ color: stroke }}
                >
                    [{conditions[0]}]
                </div>
            )}

            {/* 内容区（用于放置内部交互） */}
            <div className="seq-fragment__body">
                {/* 虚线分隔线 + 后续 condition 标签 */}
                {conditions.slice(1).map((cond, i) => {
                    const top = sectionHeight * (i + 1);
                    return (
                        <div key={i} className="seq-fragment__divider-group" style={{ top }}>
                            <div
                                className="seq-fragment__divider"
                                style={{ borderColor: stroke }}
                            />
                            {cond && (
                                <span
                                    className="seq-fragment__divider-label"
                                    style={{ color: stroke }}
                                >
                                    [{cond}]
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

export default CombinedFragment;
