# QwenPaw Agent Session RESTful API 调用文档

## 1. 文档范围

本文根据 QwenPaw Desktop `1.1.12.post3` 的本地安装源码整理，说明如何通过
RESTful API：

- 查询所有已配置的 Agent；
- 查询指定 Agent 下的全部已登记会话；
- 按用户或渠道筛选会话；
- 查询单个会话的完整消息历史；
- 在客户端组合会话元数据与消息历史。

QwenPaw 在接口和源码中将会话注册记录命名为 `ChatSpec`，因此相关路径使用
`chats`，而不是 `sessions`。

## 2. 能力结论

| 需求 | 是否支持 | 调用方式 |
| --- | --- | --- |
| 查询指定 Agent 的全部已登记会话 | 支持 | 单次 `GET /api/agents/{agentId}/chats` |
| 查询会话名称、`session_id`、用户、渠道和时间等元数据 | 支持 | 会话列表接口直接返回 |
| 查询一个会话的完整消息历史 | 支持 | `GET /api/agents/{agentId}/chats/{chat_id}` |
| 一次返回全部会话及其完整消息历史 | 不支持 | 先获取列表，再逐个查询详情 |
| 扫描并返回 `sessions/` 下所有原始状态文件 | 不支持 | 当前接口只读取已登记的 `chats.json` |

## 3. 服务地址与认证

默认服务地址：

```text
http://localhost:7706
```

本文使用以下占位符：

```text
{baseUrl} = http://localhost:7706
{agentId} = Agent 的唯一 ID，例如 datetime_agent
{chat_id} = ChatSpec.id，即会话注册记录的 UUID
```

本机通过 `localhost`、`127.0.0.1` 或 `::1` 调用时通常不需要
`Authorization`。远程部署启用 Web 认证后，需要增加：

```http
Authorization: Bearer <TOKEN>
```

推荐把 Agent ID 放在 URL 路径中：

```http
GET /api/agents/{agentId}/chats
```

兼容接口也可以通过请求头指定 Agent：

```http
GET /api/chats
X-Agent-Id: datetime_agent
```

路径形式的 Agent ID 优先级高于 `X-Agent-Id`，因此推荐使用路径形式，避免请求
头与 URL 指向不同 Agent。

## 4. 接口总览

| 用途 | 方法 | 路径 |
| --- | --- | --- |
| 查询所有 Agent | `GET` | `/api/agents` |
| 查询指定 Agent 的会话列表 | `GET` | `/api/agents/{agentId}/chats` |
| 按用户或渠道筛选会话 | `GET` | `/api/agents/{agentId}/chats?user_id=...&channel=...` |
| 查询单个会话的消息历史 | `GET` | `/api/agents/{agentId}/chats/{chat_id}` |
| 使用请求头查询当前 Agent 的会话 | `GET` | `/api/chats`，并传入 `X-Agent-Id` |

## 5. 查询所有 Agent

### 5.1 请求

```http
GET /api/agents
```

curl 示例：

```bash
curl "http://localhost:7706/api/agents"
```

PowerShell 示例：

```powershell
$baseUrl = "http://localhost:7706"
$agents = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/agents"
$agents.agents
```

### 5.2 响应

```json
{
  "agents": [
    {
      "id": "datetime_agent",
      "name": "日期查询智能体",
      "description": "用于查询不同时区的时间",
      "workspace_dir": "C:\\Users\\user\\.qwenpaw\\workspaces\\datetime_agent",
      "enabled": true,
      "active_model": {
        "provider_id": "example-provider",
        "model": "example-model"
      }
    }
  ]
}
```

后续接口中的 `{agentId}` 应使用这里返回的 `agents[].id`，而不是 Agent 名称。

## 6. 查询指定 Agent 的全部会话

### 6.1 请求

```http
GET /api/agents/{agentId}/chats
```

curl 示例：

```bash
curl "http://localhost:7706/api/agents/datetime_agent/chats"
```

PowerShell 示例：

```powershell
$baseUrl = "http://localhost:7706"
$agentId = [Uri]::EscapeDataString("datetime_agent")

$sessions = Invoke-RestMethod `
  -Method Get `
  -Uri "$baseUrl/api/agents/$agentId/chats"

$sessions
```

### 6.2 可选查询参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| `user_id` | string | 否 | 按 `ChatSpec.user_id` 精确筛选 |
| `channel` | string | 否 | 按渠道精确筛选，例如 `console` |

筛选示例：

```http
GET /api/agents/default/chats?user_id=user-001&channel=console
```

curl 示例：

```bash
curl --get "http://localhost:7706/api/agents/default/chats" \
  --data-urlencode "user_id=user-001" \
  --data-urlencode "channel=console"
```

两个参数都不传时，返回该 Agent 的 `chats.json` 中全部已登记会话。当前接口没有
分页、数量上限或排序参数。

### 6.3 成功响应

状态码：

```text
200 OK
```

响应体是 `ChatSpec` 数组：

```json
[
  {
    "id": "f0ff4a67-e4bf-4229-a74c-dc5701365ce0",
    "name": "曼彻斯特当前时间",
    "session_id": "1784879828472-8vpjdp5",
    "user_id": "default",
    "channel": "console",
    "created_at": "2026-07-24T07:57:08.668230Z",
    "updated_at": "2026-07-24T10:06:33.549957Z",
    "meta": {},
    "status": "idle",
    "pinned": false,
    "source": "chat"
  }
]
```

### 6.4 响应字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | Chat UUID；查询详情时作为 `{chat_id}` |
| `name` | string | 会话显示名称 |
| `session_id` | string | AgentScope/QwenPaw 底层会话标识 |
| `user_id` | string | 用户标识 |
| `channel` | string | 会话渠道，例如 `console` |
| `created_at` | ISO 8601 string | 创建时间，通常为 UTC |
| `updated_at` | ISO 8601 string | 最后更新时间，通常为 UTC |
| `meta` | object | 附加元数据 |
| `status` | string | 当前状态，源码定义为 `idle` 或 `running` |
| `pinned` | boolean | 是否置顶 |
| `source` | string | 会话来源，当前枚举为 `chat` 或 `cron` |

### 6.5 `id` 与 `session_id` 的区别

这是调用时最容易混淆的两个字段：

- `id` 是 `ChatSpec.id`，通常是 UUID，用于 REST 详情路径；
- `session_id` 是底层会话状态标识，服务端会结合 `user_id` 和 `channel` 定位
  AgentScope session。

正确的详情请求：

```http
GET /api/agents/{agentId}/chats/{id}
```

不要把列表中的 `session_id` 直接放到 `{chat_id}` 位置，否则通常会得到
`404 Chat not found`。

## 7. 查询单个会话的完整消息历史

### 7.1 请求

```http
GET /api/agents/{agentId}/chats/{chat_id}
```

其中 `{chat_id}` 必须使用列表响应中的 `id`。

curl 示例：

```bash
curl \
  "http://localhost:7706/api/agents/datetime_agent/chats/f0ff4a67-e4bf-4229-a74c-dc5701365ce0"
```

PowerShell 示例：

```powershell
$baseUrl = "http://localhost:7706"
$agentId = [Uri]::EscapeDataString("datetime_agent")
$chatId = "f0ff4a67-e4bf-4229-a74c-dc5701365ce0"

$history = Invoke-RestMethod `
  -Method Get `
  -Uri "$baseUrl/api/agents/$agentId/chats/$chatId"

$history.messages
```

### 7.2 成功响应

下面是为便于阅读而简化的消息示例；实际 `Message` 和 `Content` 还可能包含
`sequence_number`、`object`、`type`、`status`、`usage`、`metadata`、
`index`、`delta` 和 `msg_id` 等 AgentScope Runtime 协议字段。

```json
{
  "messages": [
    {
      "id": "message-id",
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "曼彻斯特现在几点？"
        }
      ]
    }
  ],
  "status": "idle"
}
```

详情接口只返回：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `messages` | array | 从底层 session memory 恢复的消息列表 |
| `status` | string | 当前会话状态 |

它不会重复返回 `name`、`session_id`、`created_at` 等 `ChatSpec` 元数据。如果
客户端需要完整视图，应把列表中的 `ChatSpec` 与详情响应合并。

如果 Chat 注册记录存在，但底层 session 状态不存在，接口仍返回 `200`，其中
`messages` 是空数组。

## 8. 查询全部会话及其消息历史

QwenPaw 当前没有“一次返回全部会话完整历史”的批量接口。客户端需要：

1. 调用会话列表接口；
2. 读取每条记录的 `id`；
3. 逐个调用会话详情接口；
4. 合并元数据和详情。

### 8.1 TypeScript 完整示例

```ts
type SessionSource = "chat" | "cron";
type SessionStatus = "idle" | "running" | string;

interface SessionSummary {
  id: string;
  name: string;
  session_id: string;
  user_id: string;
  channel: string;
  created_at: string;
  updated_at: string;
  meta: Record<string, unknown>;
  status: SessionStatus;
  pinned: boolean;
  source: SessionSource;
}

interface SessionHistory {
  messages: unknown[];
  status: SessionStatus;
}

interface SessionWithHistory extends SessionSummary {
  messages: unknown[];
}

const baseUrl = process.env.QWENPAW_BASE_URL ?? "http://localhost:7706";
const agentId = process.env.QWENPAW_AGENT_ID ?? "default";
const token = process.env.QWENPAW_TOKEN;

const headers: Record<string, string> = {
  Accept: "application/json",
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "GET", headers });
  if (!response.ok) {
    throw new Error(
      `QwenPaw request failed: ${response.status} ${await response.text()}`,
    );
  }
  return (await response.json()) as T;
}

async function listSessions(): Promise<SessionSummary[]> {
  const encodedAgentId = encodeURIComponent(agentId);
  return requestJson<SessionSummary[]>(
    `${baseUrl}/api/agents/${encodedAgentId}/chats`,
  );
}

async function getSessionHistory(chatId: string): Promise<SessionHistory> {
  const encodedAgentId = encodeURIComponent(agentId);
  const encodedChatId = encodeURIComponent(chatId);
  return requestJson<SessionHistory>(
    `${baseUrl}/api/agents/${encodedAgentId}/chats/${encodedChatId}`,
  );
}

async function listSessionsWithHistory(): Promise<SessionWithHistory[]> {
  const sessions = await listSessions();
  const result: SessionWithHistory[] = [];

  // 顺序读取可避免会话很多时瞬间产生大量请求。
  for (const session of sessions) {
    const history = await getSessionHistory(session.id);
    result.push({
      ...session,
      status: history.status,
      messages: history.messages,
    });
  }

  return result;
}

const sessions = await listSessionsWithHistory();
console.log(JSON.stringify(sessions, null, 2));
```

### 8.2 PowerShell 完整示例

```powershell
$baseUrl = "http://localhost:7706"
$agentId = [Uri]::EscapeDataString("default")

$sessions = @(
  Invoke-RestMethod `
    -Method Get `
    -Uri "$baseUrl/api/agents/$agentId/chats"
)

$result = foreach ($session in $sessions) {
  $history = Invoke-RestMethod `
    -Method Get `
    -Uri "$baseUrl/api/agents/$agentId/chats/$($session.id)"

  [PSCustomObject]@{
    id         = $session.id
    name       = $session.name
    session_id = $session.session_id
    user_id    = $session.user_id
    channel    = $session.channel
    created_at = $session.created_at
    updated_at = $session.updated_at
    status     = $history.status
    messages   = $history.messages
  }
}

$result | ConvertTo-Json -Depth 20
```

## 9. 兼容调用：使用 `X-Agent-Id`

全局 `/api/chats` 路由也会根据 `X-Agent-Id` 选择 Agent：

```bash
curl "http://localhost:7706/api/chats" \
  -H "X-Agent-Id: datetime_agent"
```

查询详情：

```bash
curl \
  "http://localhost:7706/api/chats/f0ff4a67-e4bf-4229-a74c-dc5701365ce0" \
  -H "X-Agent-Id: datetime_agent"
```

如果路径和请求头都没有提供 Agent ID，服务端会回退到当前配置中的 active
Agent；若仍无法确定，则使用 `default`。

## 10. 状态码与错误处理

| 状态码 | 场景 | 典型响应 |
| ---: | --- | --- |
| `200` | 列表或详情查询成功 | JSON 数组或对象 |
| `403` | Agent 已禁用 | `{"detail":"Agent '...' is disabled"}` |
| `404` | Agent 不存在 | `{"detail":"Agent '...' not found"}` |
| `404` | `chat_id` 不存在 | `{"detail":"Chat not found: ..."}` |
| `500` | Agent 管理器未初始化或加载失败 | `{"detail":"..."}` |

调用端至少应检查：

```ts
if (!response.ok) {
  const body = await response.text();
  throw new Error(`${response.status}: ${body}`);
}
```

## 11. 数据范围与已知边界

### 11.1 列表只包含已登记会话

会话列表读取的是指定 Agent 工作区中的 `chats.json`。它保存
`chat_id -> session_id` 映射和会话元数据。

因此：

- `chats.json` 中存在的记录会出现在列表中；
- 只有底层 `sessions/` 状态文件、但没有 `ChatSpec` 注册记录的会话不会出现；
- 删除 `ChatSpec` 不等于删除底层 session 状态；
- 当前 REST API 没有扫描 `sessions/` 原始文件的接口。

### 11.2 没有批量历史接口

列表接口返回 `list[ChatSpec]`，不会加载每个会话的消息。详情接口一次只接收一个
`chat_id`。会话数量较多时，建议顺序请求或设置有限并发，不要无上限并发读取。

### 11.3 没有分页和排序契约

当前列表接口没有 `limit`、`offset`、`cursor` 或排序参数。返回顺序来自
`chats.json` 中的存储顺序，调用端不应依赖该顺序；如需按更新时间展示，应在
客户端根据 `updated_at` 排序。

### 11.4 `/openapi.json` 可能返回 404

QwenPaw 仅在 `DOCS_ENABLED` 启用时提供 `/docs`、`/redoc` 和
`/openapi.json`。因此 OpenAPI 地址返回 404 不代表上述业务接口不存在。

## 12. 当前实例验证结果

验证日期：2026-07-25。

运行版本：

```http
GET /api/version
```

```json
{
  "version": "1.1.12.post3"
}
```

只读调用结果：

| Agent | `GET /api/agents/{agentId}/chats` |
| --- | ---: |
| `default` | 24 条 |
| `QwenPaw_QA_Agent_0.2` | 0 条 |
| `datetime_agent` | 1 条 |

对 `datetime_agent` 的会话继续调用详情接口，响应字段为 `messages` 和
`status`，验证时返回 21 条消息。

## 13. 源码对应关系

本文结论来自以下安装源码：

| 能力 | 源码位置 |
| --- | --- |
| Agent 列表及 `AgentSummary` | `qwenpaw/app/routers/agents.py` |
| Agent ID 路径/请求头解析 | `qwenpaw/app/routers/agent_scoped.py` |
| Agent 选择优先级与校验 | `qwenpaw/app/agent_context.py` |
| `/api/agents/{agentId}` 路由挂载 | `qwenpaw/app/_app.py` |
| 会话列表和详情接口 | `qwenpaw/app/runner/api.py` |
| `ChatSpec`、`ChatHistory` 模型 | `qwenpaw/app/runner/models.py` |
| 会话筛选逻辑 | `qwenpaw/app/runner/repo/base.py` |
| `chats.json` 持久化 | `qwenpaw/app/runner/repo/json_repo.py` |

本机对应的完整安装目录为：

```text
E:\QwenPaw\Lib\site-packages\qwenpaw
```
