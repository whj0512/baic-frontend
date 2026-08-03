# 阶段二：右侧可折叠本体关系面板

## 1. 阶段目标

为 `ontology_qa` 对话增加默认收起、首次展开才加载的右侧本体关系面板。面板复用现有 GraphDB 图查询和 `ReqRelationShip`，但不伪造工具消息、不自动刷新，也不改变聊天主流程。

## 2. 前置条件

- 用户已完成人工清单 A、B 组并明确确认阶段一通过。
- `ontology_qa` 模式、自由聊天和快捷模板均可正常使用。
- 现有 `query-project-ontology-instances` 工具卡片仍保持原行为。

## 3. 组件边界

新增 `OntologyQaRelationPanel`，建议放在：

```text
ConversationWorkspace/ontologyQa/
├─ OntologyQaRelationPanel.tsx
├─ OntologyQaRelationPanel.css
├─ promptTemplates.ts
├─ types.ts
└─ index.ts
```

职责：

- 维护收起/展开和“是否曾激活”这两个临时 UI 状态；
- 为关系浏览视图提供当前项目 ID、Assistant 名称和默认查询；
- 不解析聊天消息，不维护业务阶段，不调用 QwenPaw client。

允许从 `OntologyInstancesPanel` 抽取通用关系浏览组件，建议接口：

```ts
interface OntologyRelationshipBrowserProps {
  projectId: string
  assistantName: string
  query: GraphDBGraphRequest
  active: boolean
  surface: 'tool-card' | 'workspace-panel'
}
```

抽取要求：

- 工具卡片继续从现有 payload 构造 query；
- 右侧面板直接使用固定默认 query；
- 不创建虚假的 `OntologyInstancesEnvelope`、ToolPanelContext 或 call ID；
- 工具 handler、parser、registry 和 marker 不变；
- 共享组件仍复用当前 loading、error、retry、全屏和焦点管理能力。

## 4. ConversationWorkspace 接入

仅当 `workflowMode === 'ontology-qa'` 且存在当前项目上下文时渲染：

```text
ConversationHeader
Conversation content
  ├─ ConversationTimeline
  └─ OntologyQaRelationPanel（右侧浮层）
ConversationComposer
```

规则：

- `ontology-ingestion` 继续只渲染原 `OntologyWorkflowPanel`。
- 两种右侧面板不得同时出现。
- 无当前项目时不发请求，面板显示明确的项目上下文提示。
- 消息时间线保持原滚动容器和消息顺序。
- 展开面板不得改变 Timeline 的消息数据或触发对话刷新。

## 5. 收起与展开行为

### 默认状态

- 每次进入新的 Agent、项目或对话时默认收起。
- 收起入口宽度约 48px，固定在对话内容区右侧。
- 入口显示关系图图标和可理解的 tooltip/aria-label。
- 收起状态不得加载 GraphDB 或初始化 G6。

### 首次展开

- 用户点击展开后，将 `activated` 永久设置为 true，直到组件因上下文切换卸载。
- 首次展开才挂载或激活关系浏览组件。
- 展开过程中显示现有 loading 状态，不显示空白画布。

### 再次收起和展开

- 收起只隐藏面板，不销毁当前关系浏览实例。
- 再次展开继续显示当前筛选、焦点节点和图数据。
- 不因展开动作重复请求；用户需要新数据时使用图内“刷新关系图”。

## 6. 默认查询

使用模块级不可变常量：

```ts
const ONTOLOGY_QA_OVERVIEW_REQUEST: GraphDBGraphRequest = {
  root: null,
  depth: 1,
  origin: 'all',
  node_limit: 200,
  edge_limit: 500,
  include_properties: false,
}
```

- 不增加项目 ID、仓库名称或 Agent ID 到 GraphDB 请求体。
- 右侧面板与场景 9 中用户填写的仓库名称不建立隐式绑定。
- 不因为场景 9/10 模板发送或 Assistant 回复而修改 query。

## 7. 数据加载与取消

- 继续使用现有 `fetchGraphDBGraph` 和 `ReqRelationShip` 内部请求保护。
- 若共享浏览组件仍加载项目需求，保持现有并行请求和 AbortController 行为。
- 切换项目、Agent、对话或卸载工作区时取消尚未完成的请求。
- 旧请求返回时不得覆盖新上下文。
- GraphDB 错误使用现有分类文案和重试入口。
- 不把请求错误写入聊天消息或工作流状态。

## 8. 布局与响应式

### 桌面端

- 面板定位于对话内容区右侧，不覆盖 Header 和 Composer。
- 展开宽度使用 `min(760px, calc(100% - 32px))` 或等价约束。
- 高度为内容区减去上下安全间距。
- 面板具有不透明背景、边框和阴影，避免聊天文本透出影响图谱可读性。

### 窄窗口

- 在现有移动断点下，展开面板覆盖对话内容区可用宽度。
- 保留显著的收起/关闭按钮。
- 面板内部允许纵向滚动；Graph canvas 保持可用最小高度。
- 收起后必须恢复对话滚动和输入操作。

### 全屏与焦点

- 复用 `OntologyInstancesPanel` 的全屏、Esc 退出、body/canvas overflow 恢复和焦点回送逻辑。
- 全屏时使用 `role="dialog"`、`aria-modal` 和明确 label。
- Tab 焦点限制在全屏面板内；退出后返回原触发按钮。
- 不复制一套与工具卡片不同的全屏生命周期。

## 9. 图谱刷新规则

- Assistant 回复开始、结束、失败或停止时均不自动刷新。
- 场景 9/10 模板发送后不自动刷新。
- 不搜索自然语言中的“已推理”“已写入”“查询完成”。
- 用户只能通过 `ReqRelationShip` 现有“刷新关系图”按钮主动重查。
- 刷新继续使用当前图内 root、depth、origin 和 node type 过滤值。

## 10. 性能与渲染要求

- `ReqRelationShip` 和 G6 保持动态 import，不进入初始 AgentStore 主 bundle 的同步路径。
- 默认收起时不加载重型图模块。
- 不为简单布尔值添加多余 effect；展开和模板操作由事件直接更新。
- 共享 query 对象保持稳定，避免因父组件普通消息更新反复触发请求。
- 保留现有 ResizeObserver、`graph.resize` 和 `fitView` 适配能力。
- 尊重 `prefers-reduced-motion`。

## 11. 本阶段不得实施

- 不把右侧面板转换为聊天消息卡片。
- 不自动调用 `$query-project-ontology-instances`。
- 不新增 GraphDB 仓库选择、写入、推理或清库接口。
- 不把场景 9 的仓库输入写入图查询请求。
- 不修改 `tqqRiu` 工作流、DSL 面板或 chunks 卡片。
- 不新增图谱缓存或跨会话持久化。

## 12. 阶段交付与停止

完成代码修改后：

1. 只检查本次改动文件和差异范围。
2. 不运行自动构建、测试、Lint、类型检查、浏览器自动化或 Smoke 脚本。
3. 按 README 模板交付阶段报告。
4. 请用户执行 C01-C10、D01-D08。
5. 明确停止，等待用户完成最终人工验收。

