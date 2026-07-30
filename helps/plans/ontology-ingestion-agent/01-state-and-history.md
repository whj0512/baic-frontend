# 第一阶段：统一状态与历史聚合

## 阶段目标

先建立稳定且与业务智能体无关的数据边界，让“一个前端任务”能够关联其工作流产生的多个 QwenPaw 会话，并在刷新、项目切换、业务智能体切换后恢复。本体入库作为首个定义验证三条流水线。此阶段不重做页面主体，只提供可被 UI 消费的聚合状态。

## 当前代码依据

- `AgentStore.tsx` 管理项目加载、选择、创建、删除和工作区导航。
- `useQwenPawAgents` 负责 Agent 列表与连接状态。
- `useQwenPawSessions` 当前一次只加载一个 Agent 的 ChatSpec 和历史。
- `useQwenPawConversation` 已处理单会话 SSE、草稿会话注册、停止和重试。
- `QwenPawChatSpec` 已包含 `id`、`session_id`、`user_id`、`channel`、时间和状态。
- `fetchChats` 支持按 `user_id`、`channel` 过滤；首次发现聚合任务时仍需读取当前业务智能体定义的入口 Agent ChatSpec，再按前缀过滤。
- QwenPaw 没有单独的 Session 创建接口；新 `session_id` 的首次聊天请求会促成 ChatSpec 登记。
- ChatSpec 列表没有分页、排序或 `user_id` 前缀筛选，详情接口一次只读取一个 `ChatSpec.id`。

## 建议新增目录

```text
packages/webview/src/components/AgentWorkspace/
├─ workflowCore/
│  ├─ types.ts
│  ├─ registry.ts
│  ├─ workflowIdentity.ts
│  ├─ workflowReducer.ts
│  ├─ useAgentTaskRuns.ts
│  └─ useAgentTaskWorkflow.ts
└─ workflows/
   └─ ontologyIngestion/
      ├─ definition.ts
      ├─ constants.ts
      └─ prompt.ts
```

不要继续把任务状态、会话聚合和协议解析堆进 `AgentStore.tsx`。页面只负责项目级动作、业务智能体选择和组合子组件。

## 业务智能体注册与 Agent 检查

通用 `registry.ts` 注册 `BusinessAgentDefinition`。每个定义声明 `requiredAgentIds` 和 `entryAgentIds`；本体定义在自己的 `constants.ts` 固定手册中的 12 个 Agent ID，并标注所属流水线和职责。加载 Agent 列表后，仅针对当前业务智能体生成健康检查：

- 是否存在。
- 是否 `enabled`。
- 是否有活动模型。
- QwenPaw 连接是否为 `online`。

只有当前定义所需 Agent 全部可用时，该业务智能体的新任务才允许开始。本体错误面板按三条流水线列出缺失项，重试复用现有 `reloadAgents`。本体 Agent 缺失不能阻断另外两个业务智能体。

## 统一任务标识

每个新任务生成：

```text
businessAgentId = ontology-ingestion
runId = crypto.randomUUID()
user_id = baic-project:{projectId}:agent:{businessAgentId}:run:{runId}
channel = console
```

会话 ID 按工作单元区分：

```text
通用格式：baic-agent:{businessAgentId}:{runId}:{jobId}
本体流水线一：baic-agent:ontology-ingestion:{runId}:itemize
本体流水线二：baic-agent:ontology-ingestion:{runId}:model:{functionKey}
本体流水线三：baic-agent:ontology-ingestion:{runId}:ontology
```

每个业务智能体自行定义 Job 到 session 的映射。本体聚合任务包含 `2 + N` 个 ChatSpec：条目化 1 个、N 个功能建模会话、本体关系 1 个。相同 Run 的会话共享 `user_id`，并通过 `businessAgentId` 与另外两个智能体隔离。

## QwenPaw 标识语义

计划必须严格区分：

- `Agent.id`：来自 `GET /api/agents`，用于 URL 路径或聊天/上传的 `X-Agent-Id`。
- `ChatSpec.id`：服务端登记记录的 UUID，只用于 `GET /api/agents/{agentId}/chats/{chat_id}`。
- `session_id`：底层会话上下文标识，用于首次聊天和后续多轮继续，不能放到历史详情 URL。
- `user_id`：本计划用作跨入口 Agent 的 Run 关联键；服务端只支持精确匹配，不支持前缀查询。
- `channel`：统一使用 `console`，并与 `session_id / user_id` 一起复用。

ChatSpec 的 `status` 仅表示 `idle / running` 等会话状态，不能代表业务步骤完成。本体的“条目化完成”“DSL 完成”或“本体入库完成”必须从历史中的结构化业务协议重建。

## 核心类型

```ts
type AgentTaskRunStatus =
  | 'draft'
  | 'running'
  | 'awaiting_confirmation'
  | 'partially_failed'
  | 'completed'
  | 'failed'

interface AgentTaskRun {
  businessAgentId: string
  runId: string
  projectId: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
  status: AgentTaskRunStatus
  activeStepId: string
  jobs: WorkflowJob[]
  artifacts: WorkflowArtifact[]
  warnings: WorkflowWarning[]
  workflowData: unknown
}

interface WorkflowArtifact {
  id: string
  jobId: string
  kind: string
  status: 'declared' | 'ready' | 'partial' | 'invalid' | 'unavailable'
  queryBindingId: string
  payloadKey: string
  source?: {
    chatSpecId: string
    sessionId: string
    messageId: string
    partKey: string
    handlerId: string
    variantId?: string
  }
}
```

通用 reducer 事件至少包括：创建、恢复、会话注册、消息追加、协议接收、步骤确认、Job 重试、停止、失败和完成。所有异步回调携带 `businessAgentId + runId + jobId + requestId`，避免项目或业务智能体切换后的旧请求覆盖新任务。本体特有的功能队列保存在其 adapter 管理的 `workflowData`，不扩充通用 reducer 的专用字段。

`WorkflowArtifact.source` 指向已经解析成功的 fenced/tool 消息位置，不保存
`project_root`、`output_root`、本地绝对路径或 `file://` URL。查询 Skill 与入口 Agent
的绑定由 `BusinessAgentDefinition.artifactQueries` 声明，详细契约见
[07-skill-artifact-integration.md](./07-skill-artifact-integration.md)。

## 历史发现与聚合算法

1. 当前项目和业务智能体被选中后，并行请求该定义 `entryAgentIds` 的全部 ChatSpec；由于 API 不支持前缀筛选，此处不能传项目级前缀给服务端。
2. 只保留 `channel === 'console'` 且 `user_id` 以 `baic-project:{projectId}:agent:{businessAgentId}:run:` 开头的记录。
3. 从 `user_id` 提取 `runId`，跨 Agent 分组。
4. 由当前定义的 identity adapter 解析 `session_id` 与 Job；本体定义识别条目化、具体功能建模和本体关系会话。
5. 聚合更新时间取组内最大 `updated_at`，侧栏按该值倒序。
6. 只有用户打开某个任务时，才以有限并发加载该组需要的 ChatHistory；建议并发上限为 2，列表页不预取全部消息。
7. 历史详情通过 `ChatSpec.id` 请求；继续对话使用对应 `session_id / user_id / channel`。
8. 不符合新前缀的旧独立会话保持服务端原样，只从聚合任务侧栏隐藏。
9. API 返回顺序不是排序契约，前端必须自行按 `updated_at` 排序。

使用 `Promise.allSettled` 加载当前定义的入口 Agent 列表。单个入口失败时保留其他结果，并把任务索引标记为“历史不完整”，而不是清空已加载数据。

## 新任务与恢复

- 引导表单提交后先在 reducer 建立本地 draft run，再启动当前定义的第一个步骤。
- 首条消息至少包含一个非空 `TextContent` 和定义生成的结构化 `DataContent`；是否需要 `FileContent` 由当前业务智能体的 starter 定义决定，本体需要两个文件。
- 使用新 `session_id` 发出首次 `POST /api/console/chat`，而不是调用 Session 创建接口。
- 首次 SSE 完成后按精确 `user_id + channel` 刷新对应入口 Agent 的 ChatSpec；在登记出现前保持 `registrationState = pending`。
- QwenPaw 注册 ChatSpec 后，用服务端 `ChatSpec.id` 替换本地临时引用；任务标题由前端输入/协议派生，不依赖不可用的远端重命名接口。
- 页面刷新后，任务状态完全从 ChatSpec 与历史中的结构化消息重建；本地存储只允许保存未提交表单草稿，不作为任务真相源。
- 恢复历史时重新执行现有 fenced/tool 提取器：有效 payload 恢复为 `ready`；只有
  `agent-workflow` 索引而没有有效 payload 时恢复为 `declared/unavailable`，由用户
  继续原 Job 会话重新调用查询 Skill。
- 若发现同一 `session_id` 的重复 ChatSpec，保留更新时间最新者并显示诊断警告。
- 如果 ChatSpec 存在但详情返回 `200 + messages: []`，标记为“历史不可恢复/尚未落盘”，不能当作新任务或已完成任务。
- 只有已登记 ChatSpec 能被历史接口发现；QwenPaw REST API 不扫描未登记的底层 `sessions/` 文件。

## 本体流水线二调度策略

首版采用队列串行执行：

1. 用户确认所选功能后建立 N 个 `FunctionModelingJob`。
2. 按条目化产物顺序启动第一个功能会话。
3. 收到结构化终态后启动下一个。
4. 单项失败不会丢失已完成项；队列可以继续，也可由用户暂停。
5. 重试只创建/继续失败功能的会话，不重跑其他功能。

串行策略能复用现有单流会话能力，并避免多个 SSE 流竞争同一个消息画布。并发执行可作为后续优化，不进入本轮范围。

## 本阶段预计修改

- `packages/webview/src/pages/AgentStore.tsx`
- `packages/webview/src/components/AgentWorkspace/qwenPaw/qwenPawClient.ts`
- `packages/webview/src/components/AgentWorkspace/qwenPaw/types.ts`
- 新增 `workflowCore/` 与 `workflows/ontologyIngestion/` 状态和定义文件

现有 `fetchAgents`、`fetchChats`、`fetchChatHistory`、`streamChat` 保持通用，不复制第二套 HTTP 客户端。

## 第一阶段验收

1. 当前项目可发现并聚合新协议任务。
2. 同一个 `businessAgentId + Run` 的跨 Agent ChatSpec 被正确归为一条侧栏记录，不同业务智能体不会串线。
3. 流水线二的多个功能会话按功能拆分，并能恢复顺序和状态。
4. 旧会话不显示但没有删除、改名或覆盖。
5. 项目切换会停止当前流并清空可见状态，返回项目后可恢复。
6. 本体定义的 12 Agent 任一缺失或禁用时，仅本体新建任务给出明确阻断信息。
7. `ChatSpec.id` 和 `session_id` 在详情读取与继续对话时没有混用。
8. 大 Run 历史以有限并发加载，没有一次性无上限请求。
9. 两个仅测试可见的不同步骤数 fixture 能复用同一 reducer 和身份规则。
10. 本阶段完成后暂停，等待人工确认历史聚合方式。
