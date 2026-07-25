# 阶段四：真实侧栏与流式对话 UI 计划

## 1. 阶段目标

替换用户指定的三个静态区域，启用文本聊天，并让所有加载、空态、错误态和流式终态在现有页面风格内可见。

## 2. `AgentSidebar` Props

移除对 `agentWorkspaceData.ts` 的依赖，改为接收：

```ts
interface AgentSidebarProps {
  agents: QwenPawAgent[]
  agentsLoading: boolean
  agentsError: string | null
  activeAgentId: string | null
  sessions: QwenPawChatSpec[]
  sessionsLoading: boolean
  sessionsError: string | null
  activeChatId: string | null
  creatingDraft: boolean
  connectionState: 'checking' | 'online' | 'offline'
  onAgentChange: (agentId: string) => void
  onSessionChange: (chatId: string) => void
  onNewChat: () => void
  onAgentsRetry: () => void
  onSessionsRetry: () => void
  // 保留现有项目相关 Props
}
```

## 3. 真实 Agent 列表

`.agent-list` 展示规则：

- 加载中显示骨架或 Spin。
- 错误态显示简短原因和重试按钮。
- 空列表显示“QwenPaw 暂无已配置智能体”。
- Agent 项显示真实 `name/description`。
- 禁用 Agent 显示“已禁用”，不可选。
- 当前项显示“当前”。
- `active_model.model` 可作为次级信息或 title，不替代描述。
- 长列表保留独立滚动和键盘 focus。

切换 Agent 后：

- 移动端收起侧栏；
- 消息区先显示会话加载态；
- 不保留旧 Agent 的 Chat 和消息。

## 4. 真实历史列表

`.agent-sidebar__section--history`：

- 数量来自 `sessions.length`。
- 每项展示 `name`，空名称回退到“未命名对话”。
- 时间使用 `updated_at`，按当前 locale 格式化。
- 选中项使用 `aria-current="page"`。
- `running`、`pinned`、`cron` 等元数据用轻量标记表达。
- 加载、错误、空态都有固定高度，避免侧栏跳动。
- 列表自身滚动，不能把“当前项目”和底部 AI 引擎挤出页面。

点击历史项只触发该项详情请求，不预读全部详情。

## 5. ConversationWorkspace 输入契约

```ts
interface ConversationWorkspaceProps {
  activeAgent: QwenPawAgent
  activeConversation: ActiveConversationRef
  activeChat: QwenPawChatSpec | null
  messages: ConversationMessageView[]
  historyLoading: boolean
  historyError: string | null
  streaming: boolean
  streamError: string | null
  onSend: (draft: ConversationDraft) => Promise<void>
  onStop: () => void
  onHistoryRetry: () => void
  onOpenSidebar: () => void
}
```

组件内部只持有输入草稿、文件选择和滚动位置；远程会话与消息状态由上层管理。

## 6. 消息画布

`.conversation-canvas` 替换规则：

- history loading：显示消息骨架。
- history error：显示错误和重试。
- 空会话：显示当前 Agent 的真实名称和“开始新对话”引导，不使用伪造欢迎语。
- 有消息：按标准化后的 role/part 渲染。
- streaming：assistant 草稿末尾显示生成指示。
- failed/stopped：在对应草稿下显示终态与重试入口。

原有消息气泡样式可复用，但需要：

- 支持 system/tool/unknown 的中性样式；
- 支持长代码/长 URL 横向换行；
- 支持文本换行，禁止原始 HTML 注入；
- 使用服务端时间；缺失时不伪造时间；
- 不再固定显示“发送”或静态 sender。

滚动规则：

- 初次加载完成滚动到末尾。
- 用户在底部附近时，流式增量自动跟随。
- 用户主动向上阅读后停止自动拉回，显示“回到底部”按钮。
- 切换会话时重置滚动跟随状态。

## 7. 文本发送

输入交互：

- textarea 启用并受控。
- 空白文本不可发送。
- `Enter` 发送，`Shift+Enter` 换行。
- 输入法 composing 时不响应 Enter 发送。
- 发送中禁止重复提交；发送按钮切换为停止按钮。
- 页面离开、Agent/会话/项目切换时中止当前请求。

请求体：

```ts
{
  input: [{
    role: 'user',
    content: [{ type: 'text', text: trimmedText }],
  }],
  stream: true,
  session_id: activeConversation.sessionId,
  user_id: activeConversation.userId,
  channel: activeConversation.channel,
}
```

请求头的 `X-Agent-Id` 使用 `activeConversation.agentId`。

## 8. SSE 聚合

解析器遵循 SSE 行协议：

- 支持 CRLF/LF；
- 支持一个事件多个 `data:` 行；
- 忽略注释和未知字段；
- 保留最后一个无空行结尾的事件；
- 每个 `data:` 单独 JSON 解析并保留原始对象。

聚合器根据阶段一确认的真实字段处理：

- `response/created`：进入 generating。
- `message/content in_progress`：按 `msg_id/index/delta` 合并，不重复追加累计文本。
- `plugin_call/plugin_call_output`：更新工具事件卡片。
- `turn_usage`：可保存但首版不强制展示。
- `completed`：结束草稿，刷新 ChatSpec 和历史。
- `failed`：结束流并展示错误。

不能只看到一个 `completed` 就假设之前一定收到过文本；空 SSE、无终态和流提前关闭必须进入异常终态。

## 9. 相邻状态修正

功能接通后同步修改：

- 侧栏 AI 引擎
  - checking：正在连接 QwenPaw；
  - online：显示已连接及当前模型；
  - offline：显示连接失败和重试。
- 标题栏
  - history loading：正在加载会话；
  - idle：已同步至 QwenPaw；
  - running：智能体处理中；
  - failed/stopped：同步未完成。

删除“已保存至本地工作区”和“Agent 服务待接入”这类与真实状态冲突的固定文字。

## 10. 静态数据清理

在三个目标区域完成替换后：

- 删除不再使用的 `AGENTS`、`DEFAULT_AGENT_ID`、`CONVERSATION_MESSAGES`。
- 若 `agentWorkspaceData.ts` 已无其他使用者，删除该文件；否则只移除废弃导出。
- 删除只服务静态附件示例的类型。
- 保留与真实 Agent UI 仍相关的通用显示类型，迁移到新 `types.ts`。

## 11. 阶段完成条件

- 三个目标区域全部来自 QwenPaw。
- 新建对话和历史续聊都能完成文本 SSE 对话。
- completed 后刷新为服务端持久化历史。
- failed、空 SSE、停止生成有明确 UI。
- 切换 Agent/会话不会出现旧消息闪回。
- 不可用时不回退静态 Agent 或静态消息。
- 桌面端与移动端侧栏均可操作。

完成后停止，由人工验证真实多轮对话，再进入附件阶段。

