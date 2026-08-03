# 当前边界与既有契约

## 1. 本文目的

本文记录实施前必须遵守的代码事实、数据契约和范围边界。后续 Agent 若发现当前代码与本文不一致，应先停止并向用户报告差异，不得自行扩大范围或重新设计协议。

## 2. 当前 AgentStore 基线

### 2.1 Agent allowlist

`packages/webview/src/pages/AgentStore.tsx` 当前已包含：

```ts
const EXPOSED_AGENT_IDS = ['tqqRiu', 'ontology_qa'] as const
```

这是用户已有修改，属于本计划实施基线：

- 不得将 allowlist 恢复为仅包含 `tqqRiu`；
- 不得覆盖或重新格式化该文件中的无关内容；
- 不得改为前端硬编码的模拟 Agent 数据；
- Agent 的名称、描述、启用状态和模型仍以 QwenPaw 返回结果为准。

### 2.2 既有 Agent 选择链路

- `useQwenPawWorkspace` 已支持可选 `allowedAgentIds`。
- 过滤发生在默认 Agent 选择、历史会话加载、新建对话和发送上下文之前。
- `AgentSidebar` 在 allowlist 后存在多个 Agent 时使用现有选择器。
- 切换 Agent 后，会话列表、选中历史和当前对话均应属于新 Agent。
- 本次不得另写平行的 Agent 请求、会话缓存或发送入口。

## 3. 两种展示模式的职责

### `tqqRiu`

- 继续使用 `workflowMode = "ontology-ingestion"`。
- 继续渲染现有 `OntologyWorkflowPanel`、功能选择、检查点和阶段门禁。
- 本次不修改其提示词、阶段推导、localStorage 检查点或 Renderer 绑定。
- `tqqRiu` 的回归验证属于本计划必测项，但不是实施内容。

### `ontology_qa`

- 使用新的纯展示模式 `workflowMode = "ontology-qa"`。
- 不渲染 `OntologyWorkflowPanel`。
- 不建立场景 9 到场景 10 的顺序关系。
- 不建立阶段状态、完成门禁、Run/Job、Artifact 或检查点。
- 不使用 localStorage、sessionStorage 或远端消息保存仓库输入与授权状态。
- 用户可以在任何时候自由聊天、使用附件或选择任一快捷模板。

## 4. ConversationWorkspace 与 Composer 边界

- `ConversationWorkspace` 继续组合 Header、Timeline、Composer 和可选右侧辅助面板。
- 原消息时间线仍是对话主体，不能因新面板改变消息数据结构或排序。
- `ConversationComposer` 继续拥有自由文本草稿、附件、发送和停止能力。
- 快捷模板只负责生成草稿文本；实际发送仍调用现有 `onSend`。
- 快捷模板不得直接调用 QwenPaw client、GraphDB API 或本地脚本。
- 普通自由聊天不得被误判为场景 9 或场景 10，也不得改变面板状态。

## 5. 本体关系图既有契约

### 5.1 `ReqRelationShip`

目录：`packages/webview/src/components/ReqRelationShip/`

- 使用现有 `fetchGraphDBGraph` 发起真实只读图查询。
- 已具备聚焦节点、展开深度、关系来源、节点类型、边文字、刷新、图例、节点继续展开和错误展示。
- 已具备 AbortController 和请求序列保护；新增外壳不得绕过这些能力。
- `initialRequest`、`initialGraph` 和 `embedded` 是现有嵌入能力入口。
- 本次不修改 GraphDB 请求或响应模型。

### 5.2 `OntologyInstancesPanel`

文件：`packages/webview/src/components/AgentWorkspace/ConversationWorkspace/toolMessage/ontologyInstances/OntologyInstancesPanel.tsx`

- 现有工具卡片由 `plugin_call`、`plugin_call_output` 和同一 `call_id` 配对后渲染。
- handler 通过 Skill 的可执行脚本特征识别卡片类型，不能使用 `call_id` 判断卡片类型。
- v1 marker 固定为 `panel = "req-relationship"`、`status = "ready"`。
- 工具卡片从当前对话上下文获取项目 ID，并按视口懒加载需求与图数据。
- 现有 loading、parse-error、项目缺失、重试、全屏和焦点管理行为必须保留。

### 5.3 右侧面板与工具卡片的关系

- 右侧面板是 `ontology_qa` 的页面级展示外壳，不是聊天消息。
- 不得伪造 `plugin_call`、`plugin_call_output`、`call_id`、tool payload 或 assistant 消息来显示右侧面板。
- 可以抽取 `OntologyInstancesPanel` 内部的通用关系浏览视图，由工具卡片和右侧面板分别提供真实上下文。
- 工具卡片仍由现有 handler 注册表驱动；右侧面板由 `workflowMode = "ontology-qa"` 驱动。

## 6. GraphDB 查询与刷新边界

右侧面板首次加载使用固定只读概览请求：

```ts
{
  root: null,
  depth: 1,
  origin: 'all',
  node_limit: 200,
  edge_limit: 500,
  include_properties: false,
}
```

规则：

- 默认收起时不得发起 GraphDB 请求或初始化 G6。
- 用户首次展开后才开始加载。
- 收起再展开复用当前已加载实例，不重复初始化。
- 切换项目、Agent 或对话时卸载旧面板并终止未完成请求。
- Assistant 自然语言中的“完成”“已推理”或“已查询”不能触发刷新。
- `ChatSpec.status` 不能证明 GraphDB 内容已经改变。
- 图谱更新只能由用户点击现有“刷新关系图”按钮触发。

## 7. 场景 9 安全边界

- 仓库名称由用户填写，`requirement` 只是可修改默认值。
- 仓库名称 trim 后为空时，不能生成模板。
- 不从 GraphDB 地址、历史消息、项目名或后端配置猜测仓库名称。
- 推理授权必须与仓库输入同时可见，并由用户单独勾选。
- 授权未勾选时不得生成包含“明确授权”的草稿。
- 生成草稿后立即清除授权；仓库输入可在当前上下文保留。
- 切换项目、Agent 或对话时，仓库恢复 `requirement`，授权恢复未勾选。
- 生成模板不等于发送，不等于推理已经执行。

## 8. 场景 10 只读边界

- 场景 10 不需要推理授权。
- 固定包含“只读，不上传、不推理、不修改仓库”。
- `<功能名>` 必须保留为用户可编辑占位符，不自动选择图节点或功能。
- 本计划不为场景 10 增加结果 Schema、Tool handler 或导出协议。

## 9. 不修改的数据结构与系统

- `QwenPawAgent`
- `QwenPawChatSpec`
- `ActiveConversationRef`
- `ConversationMessageView`
- `ConversationPart`
- GraphDB 请求和响应模型
- 三个现有 Skill 的 payload、marker 和 protocol version
- fence/tool handler 注册方式
- 后端、数据库、GraphDB 仓库配置和 Extension 打包链

允许新增的结构仅限前端展示层，例如新的 workflow mode、快捷模板配置、关系浏览组件 Props 和局部表单状态。

