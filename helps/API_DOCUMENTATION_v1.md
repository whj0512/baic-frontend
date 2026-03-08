# API 文档（接口说明）

本文件列出了当前项目中所有可用的 HTTP 接口（中文），包含用途、URL、HTTP 方法、请求头、请求体字段/类型、示例请求、示例响应和可能的错误码说明。

基本说明
- 服务示例地址： `http://127.0.0.1:8000`
- 默认内容类型：JSON 请求使用 `Content-Type: application/json`；部分接口可直接发送纯文本（`text/plain`）。
- 身份认证：注册/登录接口返回 JWT（JSON Web Token）。受保护接口（可选）使用 HTTP Header：`Authorization: Bearer <token>`。
- ID 形式：服务中使用 UUID 字符串（36 字符），例如 `3fa85f64-5717-4562-b3fc-2c963f66afa6`。
- 错误响应格式（常见）：JSON，例如 `{"detail": "错误原因"}` 或 `{"error": "message"}`。

---

## 1. GET /
- 用途：健康检查 / 简单返回
- URL：`GET /`
- 请求头：无特殊要求
- 请求示例：
  GET http://127.0.0.1:8000/
- 成功响应（200）：
  Plain text: `Hello World!`

---

## 2. POST /dsl-to-rbg
- 用途：把 DSL 文本解析并转换成 rbg（JSON 表示）。
- URL：`POST /dsl-to-rbg`
- 请求头：
  - `Content-Type` 可为 `text/plain`（服务器直接读取原始 body 并以 UTF-8 解码）。
- 请求体（body）：原始 DSL 文本（UTF-8），例如：

```text
Graph GotoFromTest type request desc "GotoFromTest"
Start START
Goto GOTO friendNode:STATE0
State STATE0
Transition START2GOTO from:START to:GOTO
```

- curl 示例：

```bash
curl -X POST http://127.0.0.1:8000/dsl-to-rbg -H "Content-Type: text/plain" --data-binary @example.dsl
```

- 成功响应（200）：
  JSON：rbg 格式数据（由 `GraphConverter.convert_model_to_rbg` 返回）。示例结构（示例化、实际字段依实现而不同）：

```json
{
  "name": "GotoFromTest",
  "type": "request",
  "nodes": [],
  "transitions": []
}
```

- 常见错误：
  - 400：请求 body 为空或无法解析 DSL（返回 `{"error":"..."}`）
  - 500：内部异常（返回 `{"error":"exception message"}`）

---

## 3. POST /rbg-to-dsl
- 用途：把 rbg JSON 转回 DSL 文本（plain text）。
- URL：`POST /rbg-to-dsl`
- 请求头：
  - 必须：`Content-Type: application/json`
- 请求体（JSON）：rbg JSON（格式由 `convert_model_to_rbg` 产生），例如：

```json
{
  "name": "GotoFromTest",
  "type": "request",
  "nodes": [],
  "transitions": []
}
```

- curl 示例：

```bash
curl -X POST http://127.0.0.1:8000/rbg-to-dsl -H "Content-Type: application/json" -d '{ "name":"GotoFromTest", "type":"request" }'
```

- 成功响应（200）：
  Plain text（DSL 文本），Content-Type: `text/plain`

- 常见错误：
  - 400：Content-Type 非 `application/json`（返回 `{"error":"Expected application/json content type"}`）
  - 500：解析/转换异常（返回 `{"error":"exception message"}`）

---

## 4. POST /nl-to-dsl
- 用途：把自然语言转为 DSL（当前实现返回固定示例文本）。
- URL：`POST /nl-to-dsl`
- 请求头：无强制要求
- 请求体：任意文本（当前实现不解析语义，仅返回示例）
- 请求示例：

```bash
curl -X POST http://127.0.0.1:8000/nl-to-dsl -d "这是自然语言描述"
```

- 成功响应（200）：
  Plain text（固定 DSL 示例），例如：

```text
Graph GotoFromTest type request desc "GotoFromTest"
Start START
Goto GOTO friendNode:STATE0
State STATE0
Transition START2GOTO from:START to:GOTO
```

---

## 5. POST /dsl-to-nl
- 用途：把 DSL 转为自然语言（当前实现返回固定示例文本）。
- URL：`POST /dsl-to-nl`
- 请求体：任意 DSL 文本（当前实现返回固定样本）
- 请求示例：

```bash
curl -X POST http://127.0.0.1:8000/dsl-to-nl -d "Graph ... (DSL)"
```

- 成功响应（200）：
  Plain text: `这是一个示例`

---

## 6. POST /register
- 用途：用户注册，创建账户并返回 token
- URL：`POST /register`
- 请求头：
  - `Content-Type: application/json`
- 请求体（JSON）模式（RegisterRequest）：
  - `username` (string) — 必需
  - `password` (string) — 必需
  - `email` (string | null) — 可选
  - `full_name` (string | null) — 可选

- 请求示例（curl）：

```bash
curl -X POST http://127.0.0.1:8000/register -H "Content-Type: application/json" -d '{"username":"alice","password":"s3cret!","email":"alice@example.com","full_name":"Alice"}'
```

- 成功响应（200）：

```json
{
  "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "token": "<JWT token string>"
}
```

- 说明：`token` 为 JWT，可用于后续 Authorization。
- 常见错误：
  - 400：用户名已存在（HTTP 400，`{"detail":"Username already exists"}`）
  - 500：服务器错误（DB 等）

---

## 7. POST /login
- 用途：用户登录，校验密码后返回 token
- URL：`POST /login`
- 请求头：
  - `Content-Type: application/json`
- 请求体（JSON）模式（LoginRequest）：
  - `username` (string) — 必需
  - `password` (string) — 必需

- 请求示例（curl）：

```bash
curl -X POST http://127.0.0.1:8000/login -H "Content-Type: application/json" -d '{"username":"alice","password":"s3cret!"}'
```

- 成功响应（200）：

```json
{
  "token": "<JWT token>",
  "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

- 常见错误：
  - 401：用户名或密码不正确（HTTP 401，`{"detail":"Invalid username or password"}`）

---

## 8. POST /requirements
- 用途：将一条需求的自然语言 / DSL / 图的五个子表示存入数据库（创建 `requirement` + 初始 `requirement_version`）。
- URL：`POST /requirements`
- 请求头：
  - `Content-Type: application/json`
  - 可选：`Authorization: Bearer <token>`（若提供，token 的 `sub`（user_id）将写入 `created_by` 字段）
- 请求体（JSON）模式（RequirementSaveRequest）：
  - `project_key` (string | null) — 可选；若为空使用 `'default'` 项目（会自动创建 project）
  - `nl_text` (string | null) — 自然语言文本
  - `dsl_SC` (string | null) — DSL 文本（写入到字段 `dsl_SC`）
  - `graph_IBD` (object | null) — 内部块图 (IBD) 的 JSON 表示
  - `graph_ESD` (object | null) — 外部顺序图 (ESD) 的 JSON 表示
  - `graph_SC` (object | null) — 状态图 (SC) 的 JSON 表示
  - `graph_BDD` (object | null) — 块定义图 (BDD) 的 JSON 表示
  - `graph_ISD` (object | null) — 内部顺序图 (ISD) 的 JSON 表示

- 请求示例（curl）：

```bash
curl -X POST http://127.0.0.1:8000/requirements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "project_key": "proj1",
    "nl_text": "这是自然语言描述",
    "dsl_SC": "Graph CondCall type request desc \"CondCall\"\nState S desc \"START\"\nState A desc \"A\"\nState B desc \"B\"\nTransition T1\n\tfrom: S to: A\nTransition T2\n\tfrom: A to: B",
    "graph_IBD": null,
    "graph_ESD": null,
    "graph_SC": {
      "id": "CondCall",
      "desc": "CondCall",
      "graph_type": "request",
      "nodes": [
        { "id": "S", "type_name": "state", "desc": "START" },
        { "id": "A", "type_name": "state", "desc": "A" },
        { "id": "B", "type_name": "state", "desc": "B" }
      ],
      "transitions": [
        { "id": "T1", "source_node": "S", "target_node": "A" },
        { "id": "T2", "source_node": "A", "target_node": "B" }
      ]
    },
    "graph_BDD": null,
    "graph_ISD": null
  }'
```

- 成功响应（200）示例（修改：返回中以 `dsl_SC` 代替旧 `dsl_text`）：

```json
{
  "requirement_id": "uuid-...",
  "version_id": "uuid-..."
}
```

- 说明：返回新创建的 requirement id 与初始 version id。传入的 5 个图字段将分别序列化并保存在对应的 `requirement` 与 `requirement_version` 表字段中（`graph_IBD`、`graph_ESD`、`graph_SC`、`graph_BDD`、`graph_ISD`）。创建操作后，后端会向订阅该项目的 WebSocket 客户端广播一条 `requirement_created` 事件（包含完整快照），以便客户端立即插入新条目。
- 常见错误：
  - 400：请求体格式错误或必需字段缺失（FastAPI 可能返回 422）
  - 500：数据库错误等

---

## 9. GET /requirements/{requirement_id}
- 用途：读取指定 `requirement` 的主记录与版本历史
- URL：`GET /requirements/{requirement_id}`
- 请求头：无强制要求（可选 Authorization）
- 路径参数：
  - `requirement_id` — 字符串（UUID）

- 请求示例：

```bash
curl http://127.0.0.1:8000/requirements/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

- 成功响应（200）：

```json
{
  "requirement": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "project_id": "proj-uuid",
    "current_version_id": "version-uuid",
    "previous_version_id": null,
    "nl_text": "这是自然语言描述",
    "dsl_SC": "Graph ...",
    "graph_IBD": {},
    "graph_ESD": null,
    "graph_SC": null,
    "graph_BDD": null,
    "graph_ISD": null,
    "created_by": "user-uuid",
    "created_at": "2026-01-30T12:34:56",
    "updated_at": "2026-01-30T12:34:56"
  }
}
```

- 常见错误：
  - 404：若没有找到该 requirement（HTTP 404，`{"detail":"Requirement not found"}`）
  - 500：数据库错误或数据反序列化失败

---

## 10. GET /projects
- 用途：查询项目列表（按项目返回基础信息）。
- URL：`GET /projects`
- 请求头：无特殊要求
- 成功响应（200）：

```json
{
  "projects": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "key": "default",
      "name": "default",
      "description": null,
      "created_by": null,
      "created_at": "2026-01-30T12:00:00",
      "updated_at": "2026-01-30T12:00:00"
    }
  ]
}
```

- curl 示例：

```bash
curl http://127.0.0.1:8000/projects
```

- 说明：返回项目的基础信息数组，字段可能根据数据库模式略有不同（例如 `key` 在代码中为 `key` 字段）。

---

## 10.a POST /projects
- 用途：创建一个新项目；如果不传 `key` 将使用 `default`。
- URL：`POST /projects`
- 请求头：
  - `Content-Type: application/json`
  - 可选：`Authorization: Bearer <token>`（用于记录 `created_by`，实现可选）
- 请求体（JSON）：
  - `key` (string | null) — 可选；项目唯一标识（若为空使用 `'default'`）
  - `name` (string | null) — 可选；项目名
  - `description` (string | null) — 可选；项目描述

- 请求示例：

```bash
curl -X POST http://127.0.0.1:8000/projects -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"key":"proj1","name":"Project 1","description":"示例项目"}'
```

- 成功响应（201 或 200，当前实现返回 200）示例：

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "key": "proj1",
  "name": "Project 1",
  "description": "示例项目"
}
```

- 常见错误：
  - 400：`key` 已存在（`{"detail":"Project key already exists"}`）
  - 400：请求体无效 JSON（`{"detail":"Invalid JSON body"}`）

---

## 11. GET /projects/{project_id}/requirements
- 用途：查询指定项目下的需求列表（每条需求为 requirement 表当前快照）。
- URL：`GET /projects/{project_id}/requirements`
- 路径参数：
  - `project_id` — 字符串（UUID）
- 请求头：无特殊要求
- 成功响应（200）：

```json
{
  "project_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "requirements": [
    {
      "id": "req-uuid-1",
      "project_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "current_version_id": "version-uuid",
      "previous_version_id": null,
      "nl_text": "这是自然语言描述",
      "dsl_SC": "Graph ...",
      "graph_IBD": {},
      "graph_ESD": null,
      "graph_SC": null,
      "graph_BDD": null,
      "graph_ISD": null,
      "created_by": "user-uuid",
      "created_at": "2026-01-30T12:34:56",
      "updated_at": "2026-01-30T12:34:56"
    }
  ]
}
```

- curl 示例：

```bash
curl http://127.0.0.1:8000/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/requirements
```

- 常见错误：
  - 200 即使项目没有需求也会返回空数组（`"requirements": []`）。
  - 如果需要，可以在未来加入 404 检查（当 project_id 不存在时返回 404）。

---

## 12. PUT /requirements/{requirement_id}
- 用途：修改已有的 `requirement`，创建新的 `requirement_version` 并更新 `requirement` 主表的 current_version_id（并返回变更的 per-field diff）。
- URL：`PUT /requirements/{requirement_id}`
- 请求头：
  - `Content-Type: application/json`
  - 可选：`Authorization: Bearer <token>`（若提供，token 的 `sub` 用作更新者标识）
- 路径参数：
  - `requirement_id` — 字符串（UUID）
- 请求体（JSON）：与 `POST /requirements` 使用相同的 `RequirementSaveRequest` 格式（可选字段；传入为 null 的字段表示不修改该字段）。

- 行为说明：
  - 服务端会把传入字段与当前数据库中对应字段合并（传 None/未传的字段将保留原值），并在 `requirement_version` 表中插入新版本记录（version_number = max+1）。
  - 返回值中包含 `diff` 字段：只有发生变化的字段会出现在 `diff` 对象中，格式为 `field: {"before": <old>, "after": <new>}`。
  - 更新成功后，后端会向订阅该项目的 WebSocket 客户端广播 `requirement_updated` 事件，但广播中只包含差异（diff），以减少带宽与前端合并负担。

- 请求示例（curl）：

```bash
curl -X PUT http://127.0.0.1:8000/requirements/3fa85f64-... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"nl_text":"更新后的自然语言描述","graph_IBD":{"nodes":[{"id":"n1"}],"edges":[]}}'
```

- 成功响应（200）示例（当有变化时）：

```json
{
  "requirement_id": "3fa85f64-...",
  "version_id": "version-uuid-...",
  "project_id": "proj-uuid-...",
  "diff": {
    "nl_text": { "before": "旧的 NL 文本", "after": "更新后的自然语言描述" },
    "graph_IBD": { "before": null, "after": {"nodes":[{"id":"n1"}],"edges":[]} }
  }
}
```

- 成功响应（200）示例（当没有变更时）：

```json
{
  "requirement_id": "3fa85f64-...",
  "version_id": "version-uuid-...",
  "project_id": "proj-uuid-...",
  "diff": {}
}
```

- 常见错误：
  - 404：若 requirement_id 不存在（HTTP 404，`{"detail":"Requirement not found"}`）
  - 500：数据库错误等

---

## 13. WebSocket 实时同步 — /ws/projects/{project_id}
- 用途：为项目提供实时事件推送（订阅项目内的需求创建/更新事件）。
- URL（WebSocket）： `ws://<host>/ws/projects/{project_id}` 或生产环境使用 `wss://...`。
- 可选查询参数：
  - `token`（可选）：JWT，服务器会尝试解析以识别连接用户（非必须，但建议用于鉴权/日志）。示例： `ws://127.0.0.1:8000/ws/projects/<projectId>?token=<JWT>`。
- 握手行为：
  - 连接成功后，服务器会向客户端发送一条 `initial_state` 消息（当前项目的 requirements 列表快照），使客户端能马上与当前服务器状态同步。
- 消息格式（服务器向客户端推送）：
  - initial_state

```json
{ "event": "initial_state", "requirements": [ /* requirement objects (current snapshot) */ ] }
```

  - requirement_created （当有新需求创建时；包含完整快照）

```json
{ "event": "requirement_created", "version_id": "...", "requirement": { /* full requirement object */ } }
```

  - requirement_updated （当已有需求被更新时；只包含差异 diff）

```json
{ "event": "requirement_updated", "version_id": "...", "requirement_id": "...", "diff": { "nl_text": {"before":...,"after":...}, "graph_IBD": {"before":...,"after":...} } }
```


- 例子（简单 JS 客户端）：

```js
const ws = new WebSocket(`ws://127.0.0.1:8000/ws/projects/${projectId}?token=${token}`);
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  switch (msg.event) {
    case 'initial_state': setRequirements(msg.requirements); break;
    case 'requirement_created': insertRequirement(msg.requirement); break;
    case 'requirement_updated': applyDiff(msg.requirement_id, msg.diff); break;
  }
};
```



## 调试/快速测试（curl 与 WebSocket 客户端示例汇总）
- 注册：

```bash
curl -X POST http://127.0.0.1:8000/register -H "Content-Type: application/json" -d '{"username":"alice","password":"s3cret!"}'
```

- 登录：

```bash
curl -X POST http://127.0.0.1:8000/login -H "Content-Type: application/json" -d '{"username":"alice","password":"s3cret!"}'
```

- 新建需求（带 token）示例（更新请求字段为 `dsl_SC`）：

```bash
curl -X POST http://127.0.0.1:8000/requirements -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"project_key":"proj1","nl_text":"示例","dsl_SC":"Graph...","graph_json":{"nodes":[]}}'
```

- 更新需求示例（保持不变，因为 body 可以只包含要更新的字段）：

```bash
curl -X PUT http://127.0.0.1:8000/requirements/<requirement_id> -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"nl_text":"更新文本"}'
```

- WebSocket 订阅（示例）：

```bash
# 简单测试可以用 websocat 或 node/python 客户端
# 例如使用 websocat (若已安装):
websocat "ws://127.0.0.1:8000/ws/projects/<projectId>?token=<token>"
```

---

## 14. DELETE /requirements/{requirement_id}
- 用途：删除指定的 requirement（会同时删除其所有版本记录）。
- URL：`DELETE /requirements/{requirement_id}`
- 请求头：
  - 可选：`Authorization: Bearer <token>`（如果提供，服务器可记录执行删除的用户，但目前删除操作不依赖于身份验证）
- 路径参数：
  - `requirement_id` — 字符串（UUID）

- 请求示例（curl）：

```bash
curl -X DELETE http://127.0.0.1:8000/requirements/3fa85f64-5717-4562-b3fc-2c963f66afa6 -H "Authorization: Bearer <token>"
```

- 成功响应（200）示例：

```json
{ "deleted": true, "requirement_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6" }
```

- 如果要删除的 requirement 不存在（404）：

```json
{ "detail": "Requirement not found" }
```

- 说明：
  - 删除操作会先删除 `requirement_version` 表中与该 requirement_id 相关的版本记录，然后删除 `requirement` 主表中的记录，以避免外键约束问题。

---

