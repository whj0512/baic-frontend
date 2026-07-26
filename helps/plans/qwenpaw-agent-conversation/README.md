# QwenPaw 智能体对话接入计划

本目录描述如何将 Agent Workspace 中的静态智能体、静态历史对话和静态消息画布替换为 QwenPaw 的真实数据，并实装文本与文件对话能力。

## 文档索引

| 顺序 | 文档 | 内容 |
| --- | --- | --- |
| 0 | [00-overview.md](./00-overview.md) | 目标、范围、架构、阶段和已锁定原则 |
| 1 | [01-contract-and-connectivity.md](./01-contract-and-connectivity.md) | 浏览器连通性、运行时配置、QwenPaw 类型和接口边界 |
| 2 | [02-data-and-session-state.md](./02-data-and-session-state.md) | Agent、ChatSpec、历史消息、选中态和新会话状态机 |
| 3 | [03-streaming-conversation-ui.md](./03-streaming-conversation-ui.md) | 侧栏替换、消息渲染、SSE 聚合、发送和中止 |
| 4 | [04-attachments-and-resilience.md](./04-attachments-and-resilience.md) | 文件上传、错误恢复、竞态处理和性能边界 |
| 5 | [05-verification-and-rollout.md](./05-verification-and-rollout.md) | 分阶段人工验收、回归矩阵和交付条件 |

## 实施与交付记录

- [阶段四：流式对话 UI 验收报告](./phase-4-streaming-ui-report.md)
- [阶段五：附件与韧性验收报告](./phase-5-attachments-resilience-report.md)
- [QwenPaw 部署配置说明](./deployment.md)
- [阶段六：验证与交付报告](./phase-6-verification-rollout-report.md)

## 推荐实施顺序

```text
阶段一：确认浏览器连通性与真实事件契约
  ↓ 人工确认
阶段二：建立 QwenPaw 客户端与只读 Agent / Chat 数据流
  ↓ 人工确认
阶段三：建立会话选择、新会话和历史恢复状态机
  ↓ 人工确认
阶段四：替换 UI 并接通文本 SSE 对话
  ↓ 人工确认
阶段五：接通文件上传并补齐错误恢复
  ↓ 人工确认
阶段六：完整回归与配置交付
```

每个阶段完成后停止继续实施，保留可独立检查的结果，等待人工验收后再进入下一阶段。

## 核心数据流

```text
GET /api/agents
  └─ AgentSidebar.agent-list
       └─ activeAgentId
            ├─ GET /api/agents/{agentId}/chats
            │    └─ AgentSidebar.history
            │         └─ activeChat
            │              └─ GET /api/agents/{agentId}/chats/{chatSpec.id}
            │                   └─ ConversationWorkspace.canvas
            └─ POST /api/console/chat
                 ├─ X-Agent-Id = activeAgentId
                 ├─ session_id = activeChat.session_id 或新生成值
                 ├─ user_id / channel = 当前会话上下文
                 └─ SSE → 正在生成的 assistant 消息
```

文件消息增加一步：

```text
本地文件
  → POST /api/console/upload
  → { url, file_name, size }
  → TextContent + FileContent.file_url
  → POST /api/console/chat
```

## 主要改造区域

```text
packages/webview/src/config/runtime.ts
packages/webview/src/config/api.ts
packages/webview/.env.development
packages/webview/.env.platform
packages/webview/.env.production
packages/webview/src/pages/AgentStore.tsx
packages/webview/src/components/AgentWorkspace/
├─ qwenPaw/
├─ AgentSidebar/
└─ ConversationWorkspace/
```

实际实现时可以根据现有目录习惯微调 `qwenPaw/` 名称，但 API 类型、请求函数、SSE 解析与 React 视图状态不得重新混回静态展示数据文件。

## 接口依据

- [QwenPaw RESTful API 调用指南](../../QwenPaw%20RESTful%20API%20调用指南.md)
- [QwenPaw Agent Session RESTful API 调用文档](../../QwenPaw%20Agent%20Session%20RESTful%20API%20调用文档.md)
