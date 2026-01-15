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
      isStencil = false,
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

    // 获取尺寸
    const nodeSize = node?.getSize?.() || {};
    let width = propWidth || nodeSize.width || 120;
    let height = propHeight || nodeSize.height || 60;

    // Stencil 面板使用固定尺寸
    if (isStencil) {
      width = 80;
      height = 50;
    }

    // 格式化显示名称
    const displayName = nodeName || '';

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

  ---
  NodeWrapper.css

  /* ============================================
     NodeWrapper 组件样式
     适用于 antv/x6
     ============================================ */

  /* CSS 变量定义 - 可根据主题自定义 */
  :root {
    --node-bg-color: #ffffff;
    --node-border-color: #333333;
    --node-text-color: #333333;
    --node-badge-bg: #f5f5f5;
    --node-badge-text: #666666;
    --node-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* 深色主题 */
  [data-theme="dark"] {
    --node-bg-color: #1e1e1e;
    --node-border-color: #555555;
    --node-text-color: #cccccc;
    --node-badge-bg: #2d2d2d;
    --node-badge-text: #999999;
    --node-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  /* 容器 */
  .node-wrapper {
    display: flex;
    position: relative;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    user-select: none;
  }

  /* SVG 图标通用样式 */
  .node-wrapper svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    fill: var(--node-text-color);
    pointer-events: none;
  }

  /* ============================================
     画布模式样式
     ============================================ */

  /* 主矩形背景 */
  .node-wrapper__rect {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--node-bg-color);
    border-radius: 4px;
    border: 2px solid var(--node-border-color);
    box-sizing: border-box;
    box-shadow: var(--node-shadow);
  }

  /* 右下角标识 */
  .node-wrapper__badge {
    position: absolute;
    bottom: -8px;
    right: 10px;
    min-width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--node-badge-bg);
    border-radius: 2px;
    padding: 0 4px;
    box-sizing: border-box;
  }

  .node-wrapper__badge-text {
    font-size: 12px;
    font-style: italic;
    font-weight: 500;
    color: var(--node-badge-text);
    text-align: center;
    line-height: 1;
    white-space: nowrap;
  }

  /* 节点内容区 */
  .node-wrapper__content {
    position: relative;
    z-index: 1;
    max-width: calc(100% - 16px);
    padding: 4px 8px;
    text-align: center;
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ============================================
     Stencil 面板模式样式
     ============================================ */

  .node-wrapper__stencil {
    position: relative;
    width: 100%;
    height: 70%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--node-bg-color);
    border-radius: 4px;
    border: 2px solid var(--node-border-color);
    box-sizing: border-box;
  }

  /* Stencil 内容文字 */
  .node-wrapper__stencil-content {
    font-size: 12px;
    font-style: italic;
    color: var(--node-text-color);
    text-align: center;
    padding: 0 4px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Stencil 右下角标识 */
  .node-wrapper__stencil-badge {
    position: absolute;
    bottom: -8px;
    right: 5px;
    min-width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--node-badge-bg);
    border-radius: 2px;
    padding: 0 3px;
  }

  .node-wrapper__stencil-badge-text {
    font-size: 11px;
    font-style: italic;
    font-weight: 500;
    color: var(--node-badge-text);
    text-align: center;
    line-height: 1;
  }

  /* ============================================
     节点状态样式
     ============================================ */

  /* 选中状态 */
  .node-wrapper.is-selected .node-wrapper__rect,
  .node-wrapper.is-selected .node-wrapper__stencil {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }

  /* 悬停状态 */
  .node-wrapper:hover .node-wrapper__rect,
  .node-wrapper:hover .node-wrapper__stencil {
    border-color: #40a9ff;
  }

  /* 禁用状态 */
  .node-wrapper.is-disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  /* 错误状态 */
  .node-wrapper.is-error .node-wrapper__rect,
  .node-wrapper.is-error .node-wrapper__stencil {
    border-color: #ff4d4f;
  }

  /* 成功状态 */
  .node-wrapper.is-success .node-wrapper__rect,
  .node-wrapper.is-success .node-wrapper__stencil {
    border-color: #52c41a;
  }

  ---
  X6 中注册和使用示例

  import { Graph, Node } from '@antv/x6';
  import { register } from '@antv/x6-react-shape';
  import NodeWrapper from './NodeWrapper';

  // 1. 注册 React 节点
  register({
    shape: 'custom-rect-node',
    width: 120,
    height: 60,
    component: NodeWrapper,
  });

  // 2. 创建具体节点类型 (如 Call 节点)
  const CallNode = (props: any) => (
    <NodeWrapper {...props} defaultContent="fx" nodeType="call" />
  );

  register({
    shape: 'call-node',
    width: 120,
    height: 60,
    component: CallNode,
  });

  // 3. 在 Graph 中使用
  const graph = new Graph({
    container: document.getElementById('container')!,
    // ...其他配置
  });

  // 添加节点
  graph.addNode({
    shape: 'call-node',
    x: 100,
    y: 100,
    data: {
      nodeName: '计算函数',
      stroke: '#1890ff',
      fill: '#e6f7ff',
    },
  });

  // 4. Stencil 面板中使用
  const stencil = new Stencil({
    target: graph,
    groups: [
      { name: 'basic', title: '基础节点' },
    ],
  });

  stencil.load([
    {
      shape: 'call-node',
      data: { isStencil: true },
    },
  ], 'basic');

  ---
  CSS 变量替换对照表

  | 原 VSCode 变量             | 替换后                      |
  |----------------------------|-----------------------------|
  | --vscode-menu-foreground   | --node-text-color (#333333) |
  | --vscode-editor-background | --node-badge-bg (#f5f5f5)   |
  | --vscode-menu-background   | --node-badge-bg (#f5f5f5)   |
  | --default-background-color | --node-bg-color (#ffffff)   |