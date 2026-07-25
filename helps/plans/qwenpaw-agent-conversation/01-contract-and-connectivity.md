# 阶段一：接口契约与浏览器连通性计划

## 1. 阶段目标

在改动 UI 前确认“Webview 浏览器 → QwenPaw”链路真实可用，并建立前端实现采用的最小稳定契约。此阶段不替换现有静态 UI。

## 2. 运行时配置

在 `RuntimeConfig` 增加：

```ts
qwenPawBaseUrl: string
```

环境变量建议：

```text
VITE_QWENPAW_BASE_URL=http://localhost:7706
```

配置规则：

- 本地开发允许使用绝对地址 `http://localhost:7706`。
- 生产优先使用同源反向代理，例如 `/qwenpaw`，由部署层转发到 QwenPaw。
- `window.__BAIC_CONFIG__` 同样提供 `qwenPawBaseUrl`，避免平台构建后无法换地址。
- 业务代码只从 `getRuntimeConfig()` 读取，不写死端口。
- 不增加 `VITE_QWENPAW_TOKEN`；Vite 环境变量会进入浏览器产物，不可承载秘密。
- 远程认证若需要 Bearer Token，由同源服务端代理注入；若未来已有安全的运行时令牌通道，再单独设计。

建议在 `config/api.ts` 中只导出 URL 构造器，不让现有 `authFetch` 隐式承担 QwenPaw 认证：

```ts
QWENPAW_ENDPOINTS.agents
QWENPAW_ENDPOINTS.agentChats(agentId, filters?)
QWENPAW_ENDPOINTS.agentChat(agentId, chatId)
QWENPAW_ENDPOINTS.chat
QWENPAW_ENDPOINTS.upload
```

所有路径参数使用 `encodeURIComponent`，查询参数使用 `URLSearchParams`。

## 3. 浏览器连通性闸门

使用本地开发页面实际验证以下请求，而不是只用 PowerShell/curl：

1. `GET /api/version`
2. `GET /api/agents`
3. `GET /api/agents/{agentId}/chats`
4. `GET /api/agents/{agentId}/chats/{chatId}`
5. `POST /api/console/chat` 并持续读取 `ReadableStream`
6. `POST /api/console/upload` 的 multipart 预检与响应

需要记录：

- 是否产生 CORS 预检；
- `X-Agent-Id`、`Content-Type`、`Accept` 是否被允许；
- SSE 是否被代理缓冲；
- 页面 HTTPS 时是否触发对 `http://localhost:7706` 的混合内容限制；
- 上传大小是否受代理限制。

若浏览器直连失败，处理顺序为：

```text
本地开发：Vite dev proxy
生产部署：Nginx/平台同源反向代理
远程认证：代理层安全注入 Authorization
```

不得通过关闭浏览器安全策略完成正式接入。

## 4. 最小原始类型

### Agent

```ts
interface QwenPawAgent {
  id: string
  name: string
  description: string
  workspace_dir?: string
  enabled: boolean
  active_model?: {
    provider_id?: string
    model?: string
  } | null
}
```

`GET /api/agents` 的顶层结构是：

```ts
interface QwenPawAgentsResponse {
  agents: QwenPawAgent[]
}
```

### ChatSpec

```ts
interface QwenPawChatSpec {
  id: string
  name: string
  session_id: string
  user_id: string
  channel: string
  created_at: string
  updated_at: string
  meta: Record<string, unknown>
  status: 'idle' | 'running' | string
  pinned: boolean
  source: 'chat' | 'cron' | string
}
```

### 历史详情

```ts
interface QwenPawChatHistory {
  messages: unknown[]
  status: 'idle' | 'running' | string
}
```

历史详情不包含 `ChatSpec` 元数据，状态层必须用 `ChatSpec + ChatHistory` 合并，不能期待详情接口再次返回 `session_id`。

### 聊天输入

```ts
type QwenPawContent =
  | { type: 'text'; text: string }
  | { type: 'image'; image_url: string }
  | { type: 'data'; data: Record<string, unknown> }
  | { type: 'file'; filename: string; file_url: string }
```

首版 UI 直接开放文本和文件；图片/结构化数据保留类型能力，不在没有对应交互入口时暗中发送。

## 5. 运行时校验

所有外部 JSON 先按 `unknown` 接收，至少校验：

- Agent：`id/name/description/enabled`。
- ChatSpec：`id/session_id/user_id/channel` 均为非空字符串。
- 历史：顶层为对象且 `messages` 为数组。
- 上传：`url/file_name/size` 类型正确。
- SSE：`data:` 是可解析 JSON；未知字段保留，不因扩展字段失败。

单条无效 Agent 或 ChatSpec 的策略：

- 记录明确诊断；
- 整体响应结构无效时进入错误态；
- 不用静态数据填补；
- 不静默把 `session_id` 当作 `id`。

## 6. 真实事件样例

文档只给出了简化事件，实施前需从当前 QwenPaw 版本保存一轮真实文本响应样例，至少覆盖：

- `response/created`
- `message/in_progress`
- `content/in_progress`
- `plugin_call` 或 `plugin_call_output`（若该 Agent 会触发）
- `turn_usage`
- `response/completed`
- 一个 `failed` 或人为中止样例

样例只作为解析器开发夹具，不能把事件数量、自然语言内容或某个 Agent 的固定字段写成业务契约。

## 7. 阶段完成条件

- 浏览器页面能完成 JSON、SSE 和上传三类请求，或已确定可工作的同源代理方案。
- QwenPaw 地址可通过构建时和运行时配置切换。
- 没有把密钥放入 Vite 客户端变量。
- 已确认当前版本真实事件中的文本增量定位方式。
- 已明确开发、平台、生产三种部署模式的 URL。
- 本阶段不改目标 UI，不影响现有 Agent Store。

完成后停止，提交连通性结论和真实事件摘要供人工确认。

