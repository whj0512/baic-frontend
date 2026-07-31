# 阶段一：Agent 过滤与工作流外壳

## 1. 阶段目标

本阶段只建立安全的单 Agent 入口和对话工作流展示壳，不实现任何场景表单、Skill 调用或业务门禁。

完成后页面应满足：

- 远端即使返回多个 Agent，也只能选择和使用 `tqqRiu`；
- `tqqRiu` 不可用时不会误用其他 Agent；
- 当前对话上方可看到三条流水线的进度导航和一个占位的场景引导区域；
- 原项目选择、历史会话、聊天、附件和工作区导航保持原行为。

## 2. 实施前检查

1. 阅读 [README.md](./README.md) 和 [00-boundaries-and-current-contracts.md](./00-boundaries-and-current-contracts.md)。
2. 查看工作树，记录既有未跟踪文件和无关修改。
3. 重新读取当前版本的：
   - `AgentStore.tsx`
   - `AgentSidebar.tsx`
   - `ConversationWorkspace.tsx`
   - `ConversationWorkspace/types.ts`
   - `qwenPaw/useQwenPawWorkspace.ts`
   - `qwenPaw/useQwenPawAgents.ts`
4. 若当前实现已存在 allowlist 或工作流模式，优先复用并报告差异，不重复创建平行机制。

## 3. Agent allowlist

### 3.1 Hook 接口

为 `useQwenPawWorkspace` 增加可选参数：

```ts
interface QwenPawWorkspaceOptions {
  allowedAgentIds?: readonly string[]
}

useQwenPawWorkspace(
  projectId: string | null,
  options?: QwenPawWorkspaceOptions,
)
```

实现规则：

- 将 `allowedAgentIds` 在 Hook 内转换为稳定的可查集合。
- 未传 allowlist 时保持现有选择行为，避免影响其他调用方。
- 传入 allowlist 时，先从远端 `agents` 生成 `eligibleAgents`，再执行当前 Agent 保留、默认选择和首个可用选择。
- `activeAgent`、`selectAgent`、`useQwenPawSessions` 的 Agent ID 和 Hook 返回的 `agents` 都使用 `eligibleAgents`。
- 当前 Agent 从 allowlist 消失或变为禁用时，立即停止当前流、清理会话选择并进入无可用 Agent 状态。
- `selectAgent` 收到 allowlist 外 ID 时直接返回，不改变状态。

不得采用“Hook 仍选择其他 Agent、侧栏只隐藏”的实现。

### 3.2 AgentStore 绑定

在模块级声明不可变常量：

```ts
const EXPOSED_AGENT_IDS = ['tqqRiu'] as const
```

调用工作区 Hook 时传入该 allowlist。页面的 `data-qwenpaw-agent-id`、调试信息和传给子组件的 Agent 必须因此只可能是 `tqqRiu` 或空值。

## 4. 单 Agent 侧栏

### 4.1 正常状态

当过滤后只有 `tqqRiu` 时：

- 不显示可展开的 Agent Select；
- 显示固定身份卡，内容来自远端 `name`、`description` 和 `active_model.model`；
- 使用现有 Robot 图标和当前蓝色视觉变量；
- 卡片不可触发 Agent 切换；
- “新建对话”仍根据项目、连接状态和 Agent enabled 状态启用。

### 4.2 加载和异常状态

- Agent 加载中：继续显示现有 Spin 和“正在加载智能体”。
- 请求失败：显示现有错误与重试入口。
- 请求成功但不存在 `tqqRiu`：显示“未找到本体建模智能体 tqqRiu”，允许刷新 Agent。
- `tqqRiu` 存在但禁用：展示身份和“已禁用”，禁止新建会话与发送。
- 不得把 allowlist 过滤后的空列表描述成 QwenPaw 没有任何 Agent。

保留 Agent 多项 Select 分支作为未来扩展能力：只有 allowlist 后确有两个或以上 Agent 时才展示选择器。本次运行数据正常情况下不会进入该分支。

## 5. 工作流外壳

### 5.1 Props

在 ConversationWorkspace 展示层增加：

```ts
export type ConversationWorkflowMode = 'ontology-ingestion'

interface ConversationWorkspaceProps {
  // existing props
  workflowMode?: ConversationWorkflowMode
}
```

AgentStore 仅在当前 Agent ID 为 `tqqRiu` 时传入 `ontology-ingestion`。其他或空 Agent 不渲染工作流外壳。

### 5.2 组件边界

新增独立工作流组件目录，建议位置：

```text
ConversationWorkspace/ontologyWorkflow/
├─ OntologyWorkflowPanel.tsx
├─ workflowDefinition.ts
├─ deriveWorkflowState.ts
├─ types.ts
└─ index.ts
```

本阶段只创建足够支持外壳的类型和静态定义：

- 三条流水线：文档条目化、单功能 DSL 建模、本体关系管理；
- 场景顺序：1、3、7、8、9；
- 阶段状态：`pending`、`active`、`completed`；
- 当前对话标识，用于对话变化时重置本地展开状态。

不要在本阶段实现复杂 Run、Artifact 或持久化类型。

### 5.3 布局

ConversationWorkspace 的行顺序调整为：

```text
ConversationHeader
OntologyWorkflowPanel（仅 workflowMode 启用时）
ConversationTimeline
ConversationComposer
```

工作流面板包含：

- 三阶段横向进度条；
- 当前阶段名称和简短说明；
- 展开/收起按钮；
- 展开后的场景引导占位区域，本阶段显示“场景表单将在下一阶段接入”；
- 不显示虚构产物数量、完成时间或后端运行状态。

视觉要求：

- 复用 AgentStore 的白色背景、蓝色强调色和现有边框变量；
- 面板是对话辅助栏，不遮挡或压缩消息卡片到不可读宽度；
- 桌面端保持单列对话，移动端进度条可横向滚动；
- 展开按钮有 `aria-expanded`、明确 label 和键盘焦点样式；
- 尊重 `prefers-reduced-motion`，不增加必要性不足的动画。

## 6. 状态原则

本阶段的默认状态固定为：

- 新对话或没有可识别业务消息：流水线一 active；
- 历史对话：仍先显示流水线一 active，下一阶段再接入真实消息推导；
- `conversationStatus` 只控制发送/生成提示，不把 `completed` 映射为业务 completed；
- 切换 `activeConversation` 时收起面板并重置临时 UI，但不得影响消息、附件或历史请求。

## 7. 本阶段不得实施

- 不增加场景输入字段或模板生成器。
- 不发送 `$query-project-chunks` 或其他 Skill。
- 不修改 ChunksMessagePanel、DSL 面板或本体关系面板。
- 不增加功能清单、业务完成判断、GraphDB 授权。
- 不修改远端类型或持久化任何阶段状态。

## 8. 阶段交付与停止

完成代码修改后：

1. 只查看本次改动文件和差异，确认未触碰范围外文件。
2. 不运行任何自动构建或测试命令。
3. 按 README 的阶段报告模板列出修改。
4. 请用户执行 A 组、G01-G04、H01-H03。
5. 明确停止，等待用户确认后再进入阶段二。

