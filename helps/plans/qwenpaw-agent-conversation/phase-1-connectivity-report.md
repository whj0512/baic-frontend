# 阶段一连通性结论

验证日期：2026-07-25。

## 当前实例

- QwenPaw 版本：`1.1.12.post3`
- Agent：`default`、`QwenPaw_QA_Agent_0.2`、`datetime_agent`
- 文本 SSE 验证 Agent：`datetime_agent`
- 成功会话：`baic-phase1-20260725-0643`
- 人为中止会话：`baic-phase1-abort-20260725-0644`

## 连通性结论

QwenPaw 当前实例未启用浏览器跨域预检处理。对 agents、chat 和 upload
端点发送带开发页面 Origin 的 `OPTIONS` 请求均返回 `405 Method Not
Allowed`，且没有 `Access-Control-Allow-*` 响应头。因此浏览器不能从 Vite
页面直接请求 `http://localhost:7706`。

开发环境已采用 Vite 同源代理：

```text
Webview /qwenpaw/* -> http://localhost:7706/*
```

经代理验证：

- `GET /qwenpaw/api/version`：`200`
- `GET /qwenpaw/api/agents`：`200`
- `GET /qwenpaw/api/agents/{agentId}/chats`：`200`
- `GET /qwenpaw/api/agents/{agentId}/chats/{chatId}`：`200`
- `POST /qwenpaw/api/console/chat`：`200 text/event-stream`
- `POST /qwenpaw/api/console/upload`：`200`，返回
  `url/file_name/size`

上传探针返回 `file_name=connectivity-upload-probe.txt`、`size=35`。该验证会
在本机 QwenPaw workspace 的 media 目录留下一个上传文件。

当前浏览器控制通道自身会把 `localhost:5174` 拦截为
`ERR_BLOCKED_BY_CLIENT`，因此未能在该控制通道内重放页面请求。服务端跨域
失败和 Vite 同源代理响应已分别通过真实 HTTP 请求确认；仍需人工在普通开发
浏览器中完成阶段验收。

## 真实 SSE 摘要

选取的原始事件保存在
[`fixtures/phase-1-sse-sample.ndjson`](./fixtures/phase-1-sse-sample.ndjson)。
人为中止前收到的原始事件保存在
[`fixtures/phase-1-abort-sample.ndjson`](./fixtures/phase-1-abort-sample.ndjson)。

当前版本的关键结构：

- 文本增量事件为 `object=content`、`type=text`、
  `status=in_progress`。
- `delta` 是布尔标记；本次增量文本位于 `text` 字段，并以
  `msg_id + index` 定位。
- `content/completed` 的 `text` 是完整聚合文本，`delta=null`。
- 工具调用不是顶层 `object=plugin_call`，而是
  `object=message`、`type=plugin_call`，参数位于后续 data content。
- 工具结果同理使用 `object=message`、`type=plugin_call_output`。
- `response/completed` 后还会出现独立的 `turn_usage` 事件，客户端不能在
  首次看到 completed 时丢弃同一响应流的尾部事件。

人为中止样例在 1 秒后主动断开客户端，断开前收到
`response/created` 和 `response/in_progress`，客户端没有收到终态。服务端
最终把对应 ChatSpec 从 `running` 恢复为 `idle`，说明 UI 必须把本地主动中止
与远端 completed/failed 分开建模，并忽略中止后的旧流。

## URL 与安全边界

| 模式 | QwenPaw Base URL | 说明 |
| --- | --- | --- |
| 本地 Vite 开发 | `/qwenpaw` | Vite 转发到 `http://localhost:7706` |
| 平台构建 | `/qwenpaw` | 由平台同源代理提供 |
| 生产构建 | `/qwenpaw` | 由 Nginx/部署层同源代理提供 |
| VS Code 扩展 | `baic.qwenPawBaseUrl` | 默认注入本机地址；跨域环境必须改为允许 webview 访问的代理 |

浏览器配置中没有加入 Bearer Token。远程 QwenPaw 若启用认证，由同源代理
安全注入 `Authorization`，并关闭 SSE 缓冲、允许长连接与 multipart 上传。
