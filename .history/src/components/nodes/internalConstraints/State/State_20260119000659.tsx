import { Node } from '@antv/x6';
  import { register } from '@antv/x6-react-shape';
  import React, { FC, useEffect, useRef } from 'react';
  import './state-node.css';

  interface ActionItem {
    name: string;
    value: string;
    symbol: string;
    isStandard: boolean;
  }

  interface StateNodeProps {
    node?: Node;
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

  const StateNodeComponent: FC<StateNodeProps> = ({ node }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const data = node?.getData() || {};
    const {
      nodeName = 'State',
      stroke = '#333',
      fill = '#fff',
      fontFill = '#333',
      fontSize = 12,
      normal = [],
      during = [],
    } = data;

    // 响应式尺寸调整
    useEffect(() => {
      if (!containerRef.current || !node) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: newWidth, height: newHeight } = entry.contentRect;
          const currentSize = node.getSize();

          if (
            currentSize.width !== newWidth &&
            currentSize.height !== newHeight &&
            newWidth > 0 &&
            newHeight > 0
          ) {
            setTimeout(() => {
              node.setSize({ width: newWidth, height: newHeight });
            }, 0);
          }
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }, [node]);

    // 分离 during 和 normal 动作
    const duringActions = normal?.filter((item: ActionItem) => item.symbol === DURING_SYMBOL) || [];
    const normalActions = normal?.filter((item: ActionItem) => item.symbol !== DURING_SYMBOL) || [];

    return (
      <div
        ref={containerRef}
        className="state-container"
        style={{
          borderColor: stroke,
          backgroundColor: fill,
          color: fontFill,
          fontSize,
        }}
      >
        {/* 背景矩形框 */}
        <div className="state-rect" style={{ borderColor: stroke }}>
          {/* 右下角 S 标识 */}
          <div className="state-small-rect" style={{ backgroundColor: fill }}>
            <div className="state-description" style={{ color: stroke }}>
              S
            </div>
          </div>
        </div>

        {/* 节点名称 */}
        <div className="state-header" style={{ borderColor: stroke }}>
          {nodeName}
        </div>

        {/* During 动作列表（高亮显示） */}
        {duringActions.length > 0 && (
          <div className="state-detail">
            {duringActions.map((item: ActionItem, index: number) => (
              <div key={index} className="state-row">
                {joinObject(item)}
              </div>
            ))}
          </div>
        )}

        {/* Normal 动作列表 */}
        {normalActions.length > 0 && (
          <div className="state-detail">
            {normalActions.map((item: ActionItem, index: number) => (
              <div key={index}>{joinObject(item)}</div>
            ))}
          </div>
        )}
      </div>
    );
  };