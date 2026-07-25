# 阶段二至三：数据层与会话状态计划

## 1. 阶段目标

建立可复用、可取消、可验证的 QwenPaw 客户端，并让 `AgentStore` 使用明确状态机协调真实 Agent、ChatSpec、历史消息和新会话。此阶段先保证数据流正确，再替换交互 UI。

## 2. 建议目录

```text
packages/webview/src/components/AgentWorkspace/qwenPaw/
├─ types.ts
├─ qwenPawClient.ts
├─ qwenPawSse.ts
├─ normalizeMessages.ts
├─ useQwenPawAgents.ts
├─ useQwenPawSessions.ts
└─ useQwenPawConversation.ts
```

如果实现中发现 Hook 之间需要共享 reducer，可增加 `conversationReducer.ts`。避免创建一个同时包含所有网络、UI 和项目 CRUD 的巨大 Hook。

## 3. API 客户端

`qwenPawClient.ts` 对外提供：

```ts
fetchAgents(signal?): Promise<QwenPawAgent[]>
fetchChats(agentId, filters?, signal?): Promise<QwenPawChatSpec[]>
fetchChatHistory(agentId, chatId, signal?): Promise<QwenPawChatHistory>
uploadFile(agentId, file, signal?): Promise<QwenPawUploadResponse>
streamChat(request, signal): AsyncGenerator<QwenPawSseEvent>
```

固定行为：

- GET 使用 `Accept: application/json`。
- 聊天使用 `Content-Type: application/json`、`Accept: text/event-stream` 和 `X-Agent-Id`。
- 上传使用 `FormData`，不手动设置 multipart `Content-Type`。
- 非 2xx 优先解析 JSON `detail`，否则保留 HTTP 状态与响应文本。
- 聊天响应必须验证 `content-type` 包含 `text/event-stream`。
- 无 `response.body`、无终态或 JSON 事件损坏均产生明确错误。
- 超时与用户中止使用不同错误类型，UI 提示不得混为服务失败。

## 4. Agent 状态

`useQwenPawAgents`：

```ts
{
  agents,
  loading,
  error,
  connectionState,
  reload,
}
```

选择规则：

1. 保留仍存在且已启用的当前 Agent。
2. 否则优先选择 `id === 'default'` 的已启用 Agent。
3. 否则选择第一个已启用 Agent。
4. 只有禁用 Agent 时展示列表但不自动发起会话请求。
5. 空列表时进入真实空态。

Agent 视觉 accent 由 ID 做稳定映射，不能继续依赖本地 `AgentAccent` 数据定义。

## 5. ChatSpec 列表状态

`useQwenPawSessions(activeAgentId)`：

- Agent 变化时立即取消旧列表和旧详情请求。
- 清空属于旧 Agent 的选中会话。
- 按需请求当前 Agent 的 ChatSpec。
- 在前端执行置顶和更新时间排序。
- 不自动逐个请求全部历史，避免 N+1。
- 选择某条 ChatSpec 时才请求详情。
- 允许对当前列表和当前详情分别重试。

建议状态：

```ts
interface ActiveConversationRef {
  kind: 'persisted' | 'draft'
  agentId: string
  chatId: string | null
  sessionId: string
  userId: string
  channel: string
}
```

`persisted` 会话必须同时保存 `chatId` 和 `sessionId`；`draft` 会话在首次成功发送前没有 `chatId`。

## 6. 历史详情与消息标准化

原始 `messages: unknown[]` 通过纯函数标准化为 UI 类型：

```ts
interface ConversationMessageView {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool' | 'unknown'
  parts: ConversationPart[]
  createdAt?: string
  status?: string
  transient?: boolean
}
```

`ConversationPart` 至少支持：

- text
- file
- image
- data
- tool/plugin event
- unknown fallback

标准化规则：

- 文本按服务端顺序拼接或分段展示。
- 未识别对象用安全摘要展示，不使用 `dangerouslySetInnerHTML`。
- 不因一条未知消息让整个历史加载失败。
- 历史缺少稳定 `id` 时使用“会话 + 索引 + role”的渲染键，不用正文文本做 key。
- `messages: []` 是合法空态，不视为接口失败。

## 7. 新建对话状态机

点击“新建对话”时：

1. 取消当前历史详情请求和正在进行的流。
2. 创建 `draft` 会话：

```text
sessionId = baic-{crypto.randomUUID()}
userId = baic-project:{selectedProject.id}
channel = console
```

3. 清空消息区并聚焦输入框。
4. 不立即写 QwenPaw；空会话不会出现在历史列表。
5. 第一次发送完成后刷新 ChatSpec 列表。
6. 通过 `session_id + user_id + channel` 匹配新记录，取得真实 `chatId`。
7. 匹配成功后从 `draft` 升级为 `persisted`，并加载服务端详情。
8. 若注册记录存在短暂延迟，采用有限次数、带退避的刷新；超过上限仍保留当前会话并显示“历史登记同步中”，不得生成假 `chatId`。

## 8. 续聊规则

点击历史记录时：

```text
详情路径 chatId = ChatSpec.id
发送 sessionId = ChatSpec.session_id
发送 userId = ChatSpec.user_id
发送 channel = ChatSpec.channel
```

如果历史记录的 `channel` 不是 `console`：

- 首版仍可只读展示；
- 发送前明确判断是否允许复用；
- 未验证跨渠道续聊前，将输入区置为只读并提示“该渠道会话当前仅支持查看”，不要强行改写为 `console` 后续聊。

此项需要在阶段一用真实实例确认；若 QwenPaw 明确支持跨来源通过 Console 续聊，再解除限制。

## 9. 竞态与取消

必须防止以下旧响应覆盖当前视图：

- Agent A 会话列表晚于 Agent B 返回。
- Chat 1 详情晚于 Chat 2 返回。
- 新对话创建后，旧历史详情返回。
- 用户中止 SSE 后，残留 chunk 继续更新。
- 项目切换后，旧 draft 使用了旧项目 `userId`。

实现要求：

- 每类请求独立 `AbortController`。
- 状态提交前比较当前 `agentId/chatId/requestId`。
- 组件卸载时中止所有请求和 reader。
- 同一会话只允许一个发送流。
- 切换 Agent、会话或项目时，如正在生成，先中止并把当前消息标记为 stopped，再执行切换。

## 10. 阶段完成条件

### 阶段二：只读数据层

- 能加载真实 Agent、ChatSpec 和单条历史。
- 不再需要为数据层导入 `AGENTS` 或 `CONVERSATION_MESSAGES`。
- 会话列表不触发全量详情 N+1 请求。
- 错误、空态、取消和重试可区分。

完成后停止，人工检查网络请求、排序和 `chatId/sessionId` 使用。

### 阶段三：状态编排

- Agent、历史会话和 draft 会话切换稳定。
- 首次发送后的 ChatSpec 匹配规则确定。
- 旧请求无法污染新状态。
- 项目切换会生成新的 draft 用户上下文。

完成后停止，用状态日志或临时调试视图人工验证，再进入 UI/SSE 替换。

