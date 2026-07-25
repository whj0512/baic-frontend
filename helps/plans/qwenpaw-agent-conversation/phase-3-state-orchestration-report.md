# 阶段三状态编排验收记录

验证日期：2026-07-25。

## 实现范围

本阶段新增：

```text
conversationReducer.ts
useQwenPawConversation.ts
useQwenPawWorkspace.ts
```

并将 `useQwenPawWorkspace(selectedProject?.id)` 挂载到 `AgentStore`。当前可见
侧栏、历史卡片和消息画布仍保持静态，阶段四才会替换这些区域。

开发环境可通过以下位置观察当前状态：

- `AgentStore` 根节点的 `data-qwenpaw-*` 属性；
- Console 中的 `[QwenPaw workspace state]` 日志。

## 状态边界

```text
Agent 层
  agents / activeAgentId / connectionState

Session 层
  sessions / selectedChat / history
  list requestId 与 history requestId 相互独立

Conversation 层
  activeConversation / messages / status / registrationState
  stream AbortController 与 stream requestId
```

会话状态：

```text
idle
loading
ready
generating
completed
failed
stopped
```

draft 登记状态：

```text
idle
syncing
synced
pending
```

## draft 与项目上下文

项目切换后创建新的 draft：

```text
sessionId = baic-{crypto.randomUUID()}
userId = baic-project:{projectId}
channel = console
chatId = null
```

纯状态验证使用固定 UUID 得到：

```json
[
  {
    "sessionId": "baic-project-a-session",
    "userId": "baic-project:project-a"
  },
  {
    "sessionId": "baic-project-b-session",
    "userId": "baic-project:project-b"
  }
]
```

项目、Agent 或历史会话切换前会先中止当前流。空 draft 不调用 QwenPaw，
因此不会产生空历史记录。

## persisted 与续聊边界

历史详情始终使用：

```text
ChatSpec.id -> chatId
```

发送上下文始终使用：

```text
ChatSpec.session_id -> sessionId
ChatSpec.user_id -> userId
ChatSpec.channel -> channel
```

非 `console` 渠道的 persisted 会话保留只读状态，`send` 会返回
“该渠道会话当前仅支持查看”，不会静默改写渠道。

## 首次发送后的登记匹配

draft 首次完成后采用最多四次有限刷新：

```text
0ms -> 250ms -> 500ms -> 1000ms
```

只接受以下三个字段同时匹配：

```text
session_id === draft.sessionId
user_id === draft.userId
channel === draft.channel
```

匹配成功后：

1. 取得真实 `ChatSpec.id`；
2. draft 升级为 persisted；
3. ChatSpec 加入并选中当前 sessions；
4. 加载服务端历史，用持久化结果替换临时消息。

超过上限仍未找到时保持 draft，标记 `registrationState=pending`，不创建假
`chatId`。后续会话列表刷新如果出现精确匹配，会自动完成升级。

本次使用真实 ChatSpec 验证得到：

```json
{
  "chatId": "e64ecfea-2d33-470e-aadd-0ec200004271",
  "sessionId": "baic-phase1-20260725-0643",
  "userId": "baic-connectivity-check",
  "channel": "console"
}
```

## 竞态验证

- history action 必须携带当前 conversation key。
- 用其他 `chatId` 构造的旧 history action 被原样忽略。
- Agent 变化时旧 session/history 的 request ID 立即失效。
- 选中新 Chat 时，旧 history 没有对应 `historyChatId`，不会闪回。
- stop 会先递增 stream request ID，再 abort reader；残留 chunk 无法提交。
- 组件卸载会中止当前 stream。
- 同一会话存在流或登记请求时拒绝第二次发送。

流文本验证覆盖 append 和 completed 全量 replace，结果为 `hello`。完成后用户
与 assistant 临时标记均被清理。停止时用户消息保留为 `sent`，assistant 草稿
标记为 `stopped`。

## AgentStore 接入边界

本阶段只挂载状态机和诊断属性：

```text
data-qwenpaw-connection
data-qwenpaw-agent-id
data-qwenpaw-conversation-kind
data-qwenpaw-status
data-qwenpaw-registration
```

没有删除 `AGENTS` 或 `CONVERSATION_MESSAGES`，因为这些静态 UI 要在阶段四
整体替换，避免本阶段同时改变数据流和视觉交互。

## 待人工检查

1. 进入 Agent Store 后确认 Agent 请求完成，默认选择真实 `default`。
2. 选择项目后确认根节点变为 `conversation-kind=draft`。
3. 切换两个项目，确认 Console 中的 draft `sessionId/userId` 均变化。
4. 在阶段四接入历史点击后，再复核快速 Chat 1/2 切换的 Network cancelled
   状态和消息不闪回。

人工确认后再进入阶段四的真实侧栏、历史画布和文本 SSE UI 替换。
