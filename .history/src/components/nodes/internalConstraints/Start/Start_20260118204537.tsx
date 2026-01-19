import type { FC } from "react";

interface StartNodeProps {
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

const Start: FC<StartNodeProps> = (props) => {
    const data = node?.getData() || {};
    const { nodeName, fill = '#333', fontFill = '#fff', fontSize = 12 } = data;

    return (
      <div className="start-container">
        <div className="start-circle" style={{ backgroundColor: fill }} />
        {nodeName && (
          <span className="start-label" style={{ color: fontFill, fontSize }}>
            {nodeName}
          </span>
        )}
      </div>
    );
}

export default Start;