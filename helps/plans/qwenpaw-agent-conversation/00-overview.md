# QwenPaw 智能体对话接入总览

## 1. 目标

将以下三个静态区域替换为 QwenPaw 的真实数据和交互：

1. `AgentSidebar.tsx` 的 `.agent-list`
   - 从 `GET /api/agents` 获取真实 Agent。
   - 选择 Agent 后驱动会话列表和后续聊天请求。
2. `AgentSidebar.tsx` 的 `.agent-sidebar__section--history`
   - 从 `GET /api/agents/{agentId}/chats` 获取真实 `ChatSpec`。
   - 点击记录后加载该会话的完整消息历史。
3. `ConversationWorkspace.tsx` 的 `.conversation-canvas`
   - 从 `GET /api/agents/{agentId}/chats/{chatSpec.id}` 渲染真实历史。
   - 通过 `POST /api/console/chat` 消费 SSE，实时展示新消息。

同时启用现有“新建对话”、文本输入、发送和附件入口，并把侧栏 AI 引擎状态、标题栏保存状态改为真实连接/会话状态。

## 2. 当前问题

当前实现完全是展示态：

- `AGENTS` 和 `CONVERSATION_MESSAGES` 来自 `agentWorkspaceData.ts` 静态常量。
- 历史对话数量、标题和时间写死在 `AgentSidebar.tsx`。
- “新建对话”、输入框、附件和发送按钮全部禁用。
- `activeAgentId` 只能在三条本地 Agent 定义中切换。
- `ConversationWorkspace` 不接收会话、消息、加载状态或发送回调。
- “Agent 服务待接入”和“已保存至本地工作区”接通后会成为错误提示。

`AgentStore.tsx` 已经拥有项目选择和页面级协调职责，适合作为 Agent、会话和当前对话状态的组合入口；网络细节和 SSE 解析应下沉到独立客户端/Hook，避免页面组件直接解析协议。

## 3. 目标组件边界

```text
AgentStore
├─ useQwenPawAgents
│  └─ agents / agentsLoading / agentsError / retry
├─ useQwenPawSessions(activeAgentId)
│  └─ sessions / selectedChat / sessionsLoading / retry
├─ useQwenPawConversation(activeAgentId, selectedChat)
│  └─ messages / send / stop / historyLoading / streaming / error
├─ AgentSidebar
│  ├─ 纯渲染真实 Agent
│  ├─ 纯渲染真实 ChatSpec
│  └─ 触发 Agent、会话、新会话选择
└─ ConversationWorkspace
   ├─ 渲染标准化消息
   ├─ 管理输入框与待上传文件
   └─ 调用 send / stop，不直接拼装 HTTP
```

职责原则：

- `qwenPawClient.ts`：URL、请求头、响应校验、SSE 读取。
- `types.ts`：远端原始类型和 UI 标准化类型。
- Hook/状态层：请求生命周期、选择状态、竞态保护和历史刷新。
- 组件：加载/错误/空态和用户交互，不解析原始 SSE。

## 4. 会话标识原则

QwenPaw 同时存在两个不同标识，必须在命名和类型中保持区分：

| 字段 | 用途 | 前端命名建议 |
| --- | --- | --- |
| `ChatSpec.id` | `GET .../chats/{chat_id}` 的路径参数 | `chatId` |
| `ChatSpec.session_id` | `POST /api/console/chat` 延续上下文 | `sessionId` |

历史详情只能使用 `chatId`；续聊只能复用该记录的 `sessionId + userId + channel`。不得把二者合并为一个模糊的 `id` 状态。

## 5. 历史记录范围

首版按当前 Agent 读取所有已登记 `ChatSpec`，不依赖服务端返回顺序，在前端按以下规则排序：

1. `pinned === true` 优先；
2. 其余按 `updated_at` 降序；
3. 无有效时间时稳定落到列表尾部。

这样可以直接展示 QwenPaw 中已经存在的真实记录。新建于 BAIC Webview 的会话使用：

```text
user_id = baic-project:{selectedProject.id}
channel = console
```

首版不强制用 `user_id` 过滤历史，以免把 QwenPaw 已有真实记录全部隐藏。若后续确认历史必须严格按项目隔离，再启用 `user_id` 精确筛选；此项属于产品数据范围决策，不在实现中静默改变。

## 6. 消息来源与一致性

- 历史详情接口是已持久化消息的最终事实来源。
- SSE 是当前发送过程的实时来源。
- 发送时先插入本地用户消息和 assistant 草稿。
- 收到 `content/message` 增量事件时更新草稿。
- 收到 `completed` 后重新读取当前会话详情并刷新会话列表，用服务端结果替换临时消息。
- 收到 `failed`、网络错误或用户中止时保留用户输入和已接收文本，并显示可重试状态，不伪装成已保存。

该策略避免依赖未知数量的 SSE 事件，也避免在增量事件与历史接口之间产生重复消息。

## 7. 分阶段实施

### 阶段一：连接与契约基线

- 增加 QwenPaw 运行时地址设计。
- 在浏览器环境验证 CORS、JSON GET、SSE 和上传预检。
- 保存最小真实 Agent、ChatSpec、历史和 SSE 事件样例作为开发依据。

### 阶段二：只读数据层

- 实现类型、运行时校验、API 客户端和 SSE 读取器。
- 加载真实 Agent、真实 ChatSpec 和按需历史详情。
- 完成取消、错误翻译和前端排序。

### 阶段三：会话状态编排

- 建立 Agent/Chat 选择、空会话、新会话和历史恢复状态机。
- 明确切换时的取消和旧响应丢弃规则。
- 打通 `chatId` 与 `sessionId` 的独立生命周期。

### 阶段四：文本流式对话 UI

- 替换三个目标静态区域。
- 启用新建、输入、发送、停止生成和流式渲染。
- 终态后重新拉取服务端历史。

### 阶段五：附件与韧性

- 实装文件上传与 `FileContent.file_url`。
- 补齐连接失败、空 SSE、超时、错误恢复和长列表性能。

### 阶段六：验收与交付

- 使用本地真实 QwenPaw 完成多 Agent、多会话、多轮和文件验证。
- 回归项目创建/选择/删除及移动端侧栏。
- 完成环境配置和部署说明。

## 8. 不在首版范围

- 修改 QwenPaw 服务端、`chats.json` 或底层 `sessions/` 文件。
- 新增会话删除、重命名、置顶 API；文档未给出这些写接口。
- 一次性加载所有会话的完整历史。
- 依赖未登记的底层 session 文件。
- 将 Bearer Token 写入 `VITE_*` 并打包进浏览器产物。
- 将 Agent 回复自动写入 BAIC 项目、需求模型或图数据。
- 对插件调用、工具调用结果提供专用复杂可视化；首版可用安全的通用事件卡片降级展示。
- 改动现有项目 CRUD 契约。

## 9. 完成定义

1. 页面不再从 `AGENTS` 或 `CONVERSATION_MESSAGES` 渲染目标区域。
2. QwenPaw 不可用时显示可重试错误，不回退到伪造数据。
3. 切换 Agent 后只显示该 Agent 的真实 ChatSpec。
4. 点击历史记录时使用 `ChatSpec.id` 加载真实消息。
5. 续聊时复用 `ChatSpec.session_id/user_id/channel`。
6. 新对话第一次发送完成后能在真实会话列表中定位并选中。
7. 文本回复按 SSE 实时显示，`completed/failed/abort` 均有明确终态。
8. 文件使用“上传 → `file_url` → 聊天”的真实链路。
9. 切换 Agent、会话或项目时，旧请求和旧流不能污染新视图。
10. 每阶段均通过人工验收后再继续实施。

