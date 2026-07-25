# 阶段二只读数据层验收记录

验证日期：2026-07-25。

## 实现范围

本阶段新增独立的 QwenPaw 数据层：

```text
packages/webview/src/components/AgentWorkspace/qwenPaw/
├─ types.ts
├─ qwenPawClient.ts
├─ qwenPawSse.ts
├─ normalizeMessages.ts
├─ useQwenPawAgents.ts
└─ useQwenPawSessions.ts
```

没有替换 `AgentSidebar` 和 `ConversationWorkspace` 的静态展示，也没有实现
draft、新建会话或发送状态机。

## 真实只读验证

临时验证入口使用当前数据层直接调用本机 QwenPaw，验证完成后已删除。结果：

```json
{
  "agentCount": 3,
  "agentIds": [
    "default",
    "QwenPaw_QA_Agent_0.2",
    "datetime_agent"
  ],
  "chatCount": 3,
  "selected": {
    "chatId": "e64ecfea-2d33-470e-aadd-0ec200004271",
    "sessionId": "baic-phase1-20260725-0643"
  },
  "historyStatus": "idle",
  "historyMessageCount": 5,
  "normalizedMessageCount": 5,
  "normalizedPartTypes": [
    "text",
    "text",
    "tool",
    "tool",
    "text"
  ],
  "abortKind": "abort",
  "missingChatStatus": 404
}
```

详情请求使用 `ChatSpec.id`：

```text
e64ecfea-2d33-470e-aadd-0ec200004271
```

对应的续聊标识仍独立保存为：

```text
baic-phase1-20260725-0643
```

两者没有互换。

## SSE 解析验证

内存流覆盖了：

- CRLF 行尾；
- 注释行；
- 一个事件包含多个 `data:` 行；
- 最后一个事件没有空行结尾；
- JSON 对象解析。

解析结果为一个 `content/in_progress` 和一个 `response/completed`。真实聊天
流仍以阶段一保存的 NDJSON 夹具为准。

## 请求与竞态边界

- Agent、会话列表和历史详情分别使用独立请求 ID。
- effect 清理时中止当前请求；状态提交前同时比较 signal 和 request ID。
- Agent 变化时立即清理旧会话选择和旧历史。
- 重新加载会话列表时保留仍存在的当前选择。
- 历史只在显式 `selectChat(chatId)` 后加载，不遍历 ChatSpec 请求详情。
- Agent 列表失败可保留已有内存快照，并把连接状态标记为 offline。
- `messages: []` 会正常标准化为空数组。

## 错误分类

客户端区分：

```text
abort
timeout
network
http
protocol
remote
```

预先取消的真实请求验证为 `abort`；不存在的 ChatSpec 验证为 HTTP `404`。
SSE 非 JSON、非对象、Content-Type 不符、空 body 和缺少 response 终态均归为
`protocol`。

## 待人工检查

1. 确认置顶优先、其余按 `updated_at` 降序，非法时间稳定落在尾部。
2. 确认 ChatSpec 列表请求后没有自动产生详情 N+1 请求。
3. 调用 `selectChat` 后只产生一条对应 `ChatSpec.id` 的详情请求。
4. 快速切换 Agent 或 Chat 时确认旧请求显示为 cancelled，且不覆盖当前状态。

人工确认后再进入阶段三的 Agent/Chat/draft 状态编排。
