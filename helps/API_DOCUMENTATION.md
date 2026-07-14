# API 文档（接口说明）

本文件列出了当前项目中所有可用的 HTTP 接口（中文），包含用途、URL、HTTP 方法、请求头、请求体字段/类型、示例请求、示例响应和可能的错误码说明。

基本说明
- 服务示例地址： `http://127.0.0.1:8000`
- 默认内容类型：JSON 请求使用 `Content-Type: application/json`；部分接口可直接发送纯文本（`text/plain`）。

- 身份认证与请求头（重要）：
  - Authorization: Bearer <token>
    - 说明：受保护的写操作（例如创建/更新/删除需求、创建项目等）需要在 HTTP 请求头中携带 JWT。格式严格为：
      Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    - token 来源：可通过 `/login`, `/register` 或 `/auth/email` 等认证接口获取（这些接口会返回 JWT）。
      - 解析：服务端使用 `auth.decode_token(token)` 解码，默认从 token payload 中读取 `sub` 作为用户 id；若你的 token 使用不同的 claim（如 `user_id`），需要相应调整服务端解码映射。
    - 新增 `/auth/email` 说明（变更行为）：
      - 注意：为了兼容前端最少修改，`/auth/email` 仍然接收 JSON 体中 key 为 `email` 的字段，但该字段现在应包含一个标准 JWT 字符串（而不再是明文邮箱地址）。服务端实现行为为：
        1. 从请求体的 `email` 字段读取字符串（此处为 JWT token）。
        2. 使用 `auth.decode_token(token)` 解码 token，尝试从 payload 中提取邮箱信息（通常在 `email`、`username` 或 `sub` 字段）。
        3. 使用解出的邮箱去调用外部验证服务：
           `GET https://ihub.testfarm.cn:8020/users?limit=10&page=1&filter[_and][0][email][_eq]=<email>`
           - 若外部服务返回 HTTP 200 则视为鉴权通过；否则鉴权失败（返回 401 / matched: false）。
        4. 当鉴权通过时，服务不再读取本地数据库查询用户信息，而是直接使用外部服务返回的用户信息（优先使用其中的 `id` / `user_id` 字段作为系统用户 id，并使用返回的 `email` 字段覆盖）。随后调用内部 `create_token(user_id, email)` 生成绑定到本系统的 JWT（如果生成失败仍会返回 matched: true 但不包含 token 字段）。
      - 返回示例（鉴权通过，带 token）：

```json
{"matched": true, "token": "<jwt>", "user_id": "<remote_user_id>", "email": "user@example.com"}
```

      - 返回示例（鉴权失败）：

```json
{"matched": false}
```

      - 错误与异常：如果请求体缺失 `email` 字段或 token 解码失败，会返回 400/401/500 等错误并包含 `error` 字段说明具体原因；若调用外部验证服务超时或连接失败，会返回 504/502 对应的错误。
  - Auth 开关（开发/测试便利）：
    - 新增环境变量 `AUTH_ENABLED`，用于在运行时开启或关闭鉴权检查。
    - 用法：在启动服务前设置环境变量（Windows PowerShell 示例）：

      $env:AUTH_ENABLED = '0'; uvicorn main:app --reload

    - 说明：当 `AUTH_ENABLED` 为 `0` / `false` / `no` 等表示“关闭鉴权”时，服务中的鉴权依赖将不再强制要求 Authorization 头，依赖 `get_current_user` 将返回一个匿名用户：`{"id":"anonymous","email":null}`。默认（未设置或为 `1`/`true`）为开启鉴权。
    - 注意：关闭鉴权仅用于本地开发和测试，生产环境务必开启鉴权并使用 HTTPS/WSS。
  - Content-Type
    - 对于 JSON 请求必须设置 `Content-Type: application/json`（如 /rbg-to-dsl、/projects 创建等）。
    - 对于 DSL 文本类接口（如 /dsl-to-rbg、/dsl-to-rbg/IBD 等），可使用 `Content-Type: text/plain` 并直接在 body 中发送 UTF-8 文本。
  - Accept（可选）
    - 客户端可以设置 `Accept` 指定期望响应格式（如 `application/json` 或 `text/plain`），但服务会根据接口默认返回类型。
  - WebSocket 认证
    - 如果使用 WebSocket 实时频道（`/ws/projects/{project_id}`），可以通过查询参数传入 token：
      ws://<host>:<port>/ws/projects/{project_id}?token=<jwt>
    - 服务端会在连接建立时解码并验证该 token；若 token 无效，连接会被拒绝（close code 1008，reason: "Invalid or expired token"）。当 `AUTH_ENABLED` 被关闭时（开发模式），WebSocket 也允许匿名连接，客户端无需传入 token。

- 受保护的主要接口（需携带 Authorization: Bearer <token>）
  - POST /requirements (创建需求)
  - PUT /requirements/{requirement_id} (更新需求)
  - DELETE /requirements/{requirement_id} (删除需求)
  - POST /projects (创建项目)
  - WebSocket /ws/projects/{project_id} （如果使用 token 查询参数，则会验证）

- 错误响应约定（与认证和头相关）
  - 401 Unauthorized：缺失或无效 token（返回 JSON，示例：`{"detail":"Missing or invalid Authorization header"}` 或 `{"detail":"Invalid or expired token"}`）
  - 403 Forbidden：鉴权通过但无权限（当前实现未细化权限，未来可扩展为 403）
  - 400 Bad Request：Content-Type 不匹配或请求体无效（示例：`{"error":"Expected application/json content type"}` 或 JSON 解析错误说明）

- 示例：带 Token 的 curl 请求（创建 requirement）

```bash
curl -X POST http://127.0.0.1:8000/requirements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_here>" \
  -d '{"project_key":"default","nl_text":"示例需求文本"}'
```

- 示例：在测试时关闭鉴权（PowerShell）并发送请求（不带 Authorization 头）

```powershell
$env:AUTH_ENABLED = '0'; uvicorn main:app --reload
# 然后在另一个终端执行：
curl -X POST http://127.0.0.1:8000/requirements -H "Content-Type: application/json" -d '{"project_key":"default","nl_text":"示例需求文本"}'
```

- 示例：WebSocket 连接携带 token

```
# JavaScript/browser
const ws = new WebSocket('ws://127.0.0.1:8000/ws/projects/default?token='+encodeURIComponent('<your_jwt_here>'));

# 或者使用 wscat:
wscat -c "ws://127.0.0.1:8000/ws/projects/default?token=<your_jwt_here>"
```

- 安全建议
  - 生产环境强烈建议使用 HTTPS（wss 对于 WebSocket）来避免 token 在传输中被窃取。
  - 不要在 URL（query string）中长期保存敏感 token（WebSocket 使用时可短期传入或改为在握手 header 中传递）。

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
- 用途：将 Statechart DSL 文本解析并转换成状态图 rbg JSON（使用 `Requirement.dsl_to_json`）。
- URL：`POST /dsl-to-rbg`
- 请求头：
  - `Content-Type` 可为 `text/plain`（服务器直接读取原始 body 并以 UTF-8 解码）。
- 请求体（body）：原始 DSL 文本（UTF-8），例如：

```text
Statechart Demo {
    Start begin;
    State running {};
    Transition startRun {
        from: begin
        to: running
    };
}
```

- curl 示例：

```bash
curl -X POST http://127.0.0.1:8000/dsl-to-rbg -H "Content-Type: text/plain" --data-binary @example.dsl
```

- 成功响应（200）：
  JSON：状态图 rbg 格式数据（由 `Requirement.dsl_to_json` 返回）。示例结构：

```json
{
  "id": "...",
  "name": "Demo",
  "desc": "",
  "graph_type": "request",
  "nodes": [],
  "transitions": [],
  "_ast": {}
}
```

- 常见错误：
  - 400：请求 body 为空
  - 500：DSL 无法解析或发生内部异常（返回 `{"error":"exception message"}`）

---

## 3. POST /rbg-to-dsl
- 用途：把 rbg JSON 转回 DSL 文本（plain text）。
- URL：`POST /rbg-to-dsl`
- 请求头：
  - 必须：`Content-Type: application/json`
- 请求体（JSON）：状态图 rbg JSON（例如由 `/dsl-to-rbg` 产生），例如：

```json
{
  "id": "...",
  "name": "Demo",
  "desc": "",
  "graph_type": "request",
  "nodes": [],
  "transitions": [],
  "_ast": {}
}
```

- curl 示例：

```bash
curl -X POST http://127.0.0.1:8000/rbg-to-dsl -H "Content-Type: application/json" -d @statechart.json
```

- 成功响应（200）：
  Plain text（DSL 文本），Content-Type: `text/plain`

- 常见错误：
  - 400：Content-Type 非 `application/json`（返回 `{"error":"Expected application/json content type"}`）
  - 500：解析/转换异常（返回 `{"error":"exception message"}`）

---

## 图形转换的细化端点（IBD / BDD / ESD / ISD）
下面这些端点用于在不同图类型之间做 DSL 文本与 rbg(JSON) 的互转，行为和返回格式与上面 `/dsl-to-rbg`、`/rbg-to-dsl` 保持一致，但限定了图类型与后端实现模块（例如 `environment.py`/`composition.py`/`scenario.py`）。
注：ISD 与 ESD 使用同一套 Scenario 模型和转换算法，同时提供 `/ESD`、`/ISD` 两组路由；现有前端也可以继续将 ISD 请求发送到 ESD 路由。

### 3.a POST /dsl-to-rbg/IBD
- 用途：将 IBD（内部块图）DSL 文本转换为 IBD 类型的 rbg JSON（使用 `environment.dsl_to_json`）。
- URL：`POST /dsl-to-rbg/IBD`
- 请求头：
  - `Content-Type` 可为 `text/plain`（服务会读取原始 body 并以 UTF-8 解码）
- 请求体（body）：IBD DSL 文本（UTF-8），例如：

```text
Environment {
    Device Sensor;
    Controller Ctrl;
    Connect from Sensor to Ctrl {
        Interaction send { Signal value };
    };
}
```

- curl 示例：

```bash
curl -X POST http://127.0.0.1:8000/dsl-to-rbg/IBD -H "Content-Type: text/plain" --data-binary @ibd.dsl
```

- 成功响应（200）：
  JSON：IBD rbg 格式数据（由 `environment.dsl_to_json` 返回），举例：

```json
{
  "id": "...",
  "desc": "",
  "graph_type": "IBD",
  "components": [ ... ],
  "connects": [ ... ]
}
```

- 常见错误：
  - 400：请求 body 为空或 DSL 无法解析（返回 `{"error":"..."}`）
  - 500：内部异常（返回 `{"error":"exception message"}`）

---

### 3.b POST /rbg-to-dsl/IBD
- 用途：将 IBD rbg JSON 转回 IBD DSL 文本（使用 `environment.json_to_dsl`）。
- URL：`POST /rbg-to-dsl/IBD`
- 请求头：
  - 必须：`Content-Type: application/json`
- 请求体（JSON）：IBD rbg JSON（例如 `environment.dsl_to_json` 的输出）。
- curl 示例：

```bash
curl -X POST http://127.0.0.1:8000/rbg-to-dsl/IBD -H "Content-Type: application/json" -d @ibd.json
```

- 成功响应（200）：
  Plain text（IBD DSL 文本），Content-Type: `text/plain`

- 常见错误：
  - 400：Content-Type 非 `application/json` 或 请求体 JSON 无效（返回 `{"error":"..."}`，JSON 解析错误会返回更详细的提示）
  - 400：输入 JSON 无法被转换为 DSL（返回 `{"error":"Failed to convert IBD JSON to DSL: ..."}`）
  - 500：其他内部异常

---

### 3.c POST /dsl-to-rbg/BDD
- 用途：将 BDD（块定义图）CompositionView DSL 转为 BDD rbg JSON（使用 `composition.dsl_to_json`）。
- URL：`POST /dsl-to-rbg/BDD`
- 请求头：
  - `Content-Type` 可为 `text/plain`
- 请求体（body）：CompositionView DSL 文本，例如：

```text
MyMachine Composition {
    FunctionalModule ModA;
    FunctionalModule ModB;
}
```

- curl 示例：

```bash
curl -X POST http://127.0.0.1:8000/dsl-to-rbg/BDD -H "Content-Type: text/plain" --data-binary @composition.dsl
```

- 成功响应（200）：
  JSON：BDD rbg 格式数据（由 `composition.dsl_to_json` 返回），示例：

```json
{
  "id": "...",
  "desc": "",
  "graph_type": "BDD",
  "components": [ ... ],
  "relations": [ ... ]
}
```

- 常见错误：
  - 400：请求体为空或 DSL 解析失败
  - 500：内部异常

---

### 3.d POST /rbg-to-dsl/BDD
- 用途：将 BDD rbg JSON 转回 CompositionView DSL 文本（使用 `composition.json_to_dsl`）。
- URL：`POST /rbg-to-dsl/BDD`
- 请求头：
  - 必须：`Content-Type: application/json`
- 请求体（JSON）：BDD rbg JSON（例如由 `composition.dsl_to_json` 产生）
- curl 示例：

```bash
curl -X POST http://127.0.0.1:8000/rbg-to-dsl/BDD -H "Content-Type: application/json" -d @bdd.json
```

- 成功响应（200）：
  Plain text（CompositionView DSL 文本），Content-Type: `text/plain`

- 常见错误：
  - 400：Content-Type 非 `application/json` 或 JSON 格式错误
  - 400：转换失败时返回 `{"error":"Failed to convert BDD JSON to DSL: ..."}`
  - 500：其他内部异常

---

### 3.e POST /dsl-to-rbg/ESD、POST /dsl-to-rbg/ISD
- 用途：将 Environment DSL 与 Scenario DSL 转换为 ESD/ISD rbg JSON（使用 `scenario.dsl_to_json(environment_dsl, scenario_dsl)`）。当前 Scenario 转换算法必须同时获得环境定义和场景定义。
- URL：
  - ESD：`POST /dsl-to-rbg/ESD`
  - ISD：`POST /dsl-to-rbg/ISD`
- 推荐请求头：
  - `Content-Type: application/json; charset=utf-8`
- 推荐请求体（JSON）：
  - `environment_dsl` (string) — 必填，Environment DSL 文本。
  - `scenario_dsl` (string) — 必填，Scenario DSL 文本。
  - `dsl` (string) — `scenario_dsl` 的兼容别名；两者同时存在时优先使用 `scenario_dsl`。

```json
{
  "environment_dsl": "Environment {\n  Machine M;\n  Device D;\n  Connect from M to D {\n    Interaction ping { Signal payload };\n  };\n}",
  "scenario_dsl": "Scenario Demo {\n  Interaction ping;\n  while (ready) {\n    Interaction ping;\n  }\n}"
}
```

- curl 示例（JSON 文件中保存上述请求体）：

```bash
curl -X POST http://127.0.0.1:8000/dsl-to-rbg/ESD -H "Content-Type: application/json; charset=utf-8" --data-binary @esd-request.json
```

- 兼容的纯文本请求：
  - 可使用 `Content-Type: text/plain; charset=utf-8`，body 只发送 Scenario DSL。
  - 可通过 `X-Requirement-Id: <requirement_id>` 指定已保存需求；后端从该需求的 `dsl_IBD` 读取 Environment DSL。
  - 未提供 `X-Requirement-Id` 时，后端会尝试按完整 Scenario DSL 或唯一的 Scenario 名称匹配 SQLite 最新需求版本，并读取同一记录的 `dsl_IBD`。
  - 现有前端将 ISD 发送到 `/dsl-to-rbg/ESD` 时，后端会依次匹配 `dsl_ESD`、`dsl_ISD`。
  - 尚未保存且数据库中无法匹配的 Scenario 不能只发送纯文本，因为后端无法推导交互的发送方、接收方和消息类型；此时必须使用推荐的组合 JSON 请求。

```bash
curl -X POST http://127.0.0.1:8000/dsl-to-rbg/ESD -H "Content-Type: text/plain; charset=utf-8" -H "X-Requirement-Id: <requirement_id>" --data-binary @scenario.dsl
```

- 成功响应（200）：
  JSON：包含当前 Scenario 算法使用的 `children` 层级结构，以及兼容现有前端的 `interactions`、`interactionRelations` 和 `components`。

```json
{
  "id": "...",
  "name": "Demo",
  "graph_type": "ESD",
  "children": [ ... ],
  "components": [ ... ],
  "_ast": { ... },
  "interactions": [ ... ],
  "interactionRelations": [ ... ]
}
```

- 字段兼容说明：
  - `children` 保存 `if`、`while`、并行块等场景的真实嵌套结构。
  - `_ast` 用于保留场景名称、注释和原始顺序；需要无损往返时不应删除。
  - `interactions`、`interactionRelations`、`components` 是为现有前端保留的兼容字段。
- 常见错误：
  - 400：请求体为空或请求 JSON 不是对象。
  - 400：缺少 Environment DSL，返回 `{"error":"Environment DSL is required by the current Scenario model", ...}`。
  - 400：Environment DSL 或 Scenario DSL 解析失败，返回 `{"error":"Failed to parse ESD DSL: ..."}`。
  - 500：其他内部异常。

---

### 3.f POST /rbg-to-dsl/ESD、POST /rbg-to-dsl/ISD
- 用途：将 ESD/ISD rbg JSON 转回 Scenario DSL 文本（使用 `scenario.json_to_dsl`）。接口层同时兼容新的 `children` 格式和现有前端的 `interactions`/`interactionRelations` 格式。
- URL：
  - ESD：`POST /rbg-to-dsl/ESD`
  - ISD：`POST /rbg-to-dsl/ISD`
- 请求头：
  - 必须：`Content-Type: application/json; charset=utf-8`
- 请求体（JSON）：直接发送 `/dsl-to-rbg/ESD` 或 `/dsl-to-rbg/ISD` 返回的完整 JSON 对象。不要包装为 `{"data": {...}}`，也不要把整个 JSON 再编码为字符串。
- curl 示例：

```bash
curl -X POST http://127.0.0.1:8000/rbg-to-dsl/ESD -H "Content-Type: application/json; charset=utf-8" --data-binary @esd.json
```

- 成功响应（200）：
  Plain text（仅 Scenario DSL 文本），Content-Type: `text/plain`。

```text
Scenario Demo {
    Interaction ping;
    while (ready) {
        Interaction ping;
    }
}
```

- 返回范围说明：
  - 本接口只返回 `Scenario {...}`，不会同时返回 `Environment {...}`，这是 `scenario.json_to_dsl` 的当前输出契约。
  - Environment DSL 应通过 `/rbg-to-dsl/IBD` 转换对应 IBD JSON，或从需求记录的 `dsl_IBD` 获取。
  - ESD JSON 仅包含场景使用到的环境派生信息，不能无损重建原始 Environment DSL 中的全部组件、连接和注释。
  - 若要保留嵌套结构和注释，应直接回传完整响应，并保留其中的 `children` 和 `_ast`；只发送前端兼容字段可能无法完整恢复嵌套关系和注释。
- 常见错误：
  - 400：Content-Type 非 `application/json`，返回 `{"error":"Expected application/json content type"}`。
  - 400：JSON 无法解析，返回包含行号、列号和请求体预览的错误信息。
  - 400：转换失败时返回 `{"error":"Failed to convert ESD JSON to DSL: ..."}`。
  - 500：其他内部异常。

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
  - 注意：该接口默认不会返回已被软删除（soft-deleted）的项目；被标记为删除的项目在内部会设置 `deleted_at` 字段，前端默认看不到这些项目。

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

## 10.b DELETE /projects/{project_id}
- 用途：对指定 project 执行安全的软删除（soft-delete）。该操作不会物理删除数据库行，而是将项目行的 `deleted_at` 字段设置为删除时间，后续 `GET /projects` 和其他列举接口将不会返回该项目。
- URL：`DELETE /projects/{project_id}`
- 请求头：
  - 可选/通常：`Authorization: Bearer <token>`（若启用鉴权则需要；与 `POST /projects` 的鉴权规则一致）
- 路径参数：
  - `project_id` — 字符串（UUID），要删除的项目 id
- 请求示例（curl）：

```bash
curl -X DELETE http://127.0.0.1:8000/projects/<PROJECT_ID> -H "Authorization: Bearer <token>"
```

- 成功响应（200）示例：

```json
{ "deleted": true, "project_id": "<PROJECT_ID>" }
```

- 如果要删除的 project 不存在或已经被删除（404）：

```json
{ "detail": "Project not found" }
```

- 行为说明：
  - 这是一个软删除操作；实现为将 `req_project.deleted_at` 字段设为当前时间（ISO8601 字符串），并不会删除项目下的需求/测试用例等数据行。
  - 在删除成功后，服务端会向该项目的 WebSocket 订阅者广播一条事件，事件名为 `project_deleted`，载荷示例： `{ "event": "project_deleted", "project_id": "<PROJECT_ID>" }`。
  - 如果数据库在启动时未创建 `deleted_at` 列（在本服务实现中会尽量在启动时创建该列），删除接口会在执行时返回 404/失败以避免在运行时修改数据库结构（避免权限/只读问题）。建议在部署阶段执行迁移以确保 `deleted_at` 列存在。


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

## 15. POST /dependency
- 用途：识别一个项目（project）内需求（requirements）之间的数据依赖关系。
- URL：`POST /dependency`
- 请求头：
  - `Content-Type: application/json`
- 请求体（JSON）：
  - `project_id` (string) — 必需；项目的 UUID，用于查找该项目下的所有需求（使用当前版本快照）。

- 行为说明：
  - 服务端会读取该项目下的所有需求（使用 `GET latest-version per requirement`），提取每条需求的 `graph_SC`（状态机图）作为输入，调用 `dependency_manager.CoarseDependencyManager` 来计算图级别的依赖关系（数据依赖）。
  - 如果某条需求没有 `graph_SC` 字段则会被跳过。

- 请求示例（curl）：

```bash
curl -X POST http://127.0.0.1:8000/dependency -H "Content-Type: application/json" -d '{"project_id":"<project_uuid>"}'
```

- 成功响应（200）：

```json
{
  "dependencies": [
    {
      "dependent_graph": "ReqA",
      "depended_graph": "ReqB",
      "data_name": "speed",
      "dependent_range": "(0, 100]",
      "depended_range": "[0, 200]"
    }
  ]
}
```

- 说明：返回的依赖关系数组格式与 `dependency_manager.CoarseDependencyManager.get_dependencies()` 返回值一致；字段可能包含 `dependent_graph`、`depended_graph`、`data_name`、`dependent_range`、`depended_range` 等。

- 常见错误：
  - 400：缺少 `project_id` 或请求体不是有效 JSON（返回 `{"error":"..."}`）
  - 500：内部错误（例如依赖分析异常）

---

## 新增：POST /test_cases
- 用途：保存测试用例，测试内容以 JSON 存储，关联需求与场景以列表形式保存。
- URL：`POST /test_cases`
- 请求头：
  - `Content-Type: application/json`
  - 可选：`Authorization: Bearer <token>`（若开启鉴权则需要）
- 请求体（JSON）模式（TestCaseCreateRequest）：
  - `project_id` (string | null) — 可选；若为空使用或创建 `default` 项目。
  - `name` (string | null) — 可选；测试用例名称。
  - `test_content` (object) — 必填；测试用例的 JSON 内容（任意结构，将以 JSON 存入数据库的 `test_content` 字段）。
  - `related_requirements` (array[string] | null) — 可选；与之关联的 requirement id 列表。
  - `related_scenarios` (array[string] | null) — 可选；与之关联的 scenario id 列表。
  - `properties` (object | null) — 可选；额外的键值属性。

- 返回示例（200）：

```json
{
  "id": "<test_case_id>",
  "test_case": {
    "id": "<test_case_id>",
    "project_id": "<project_uuid>",
    "name": "...",
    "test_content": { /* 原始 JSON */ },
    "related_requirements": ["req-1","req-2"],
    "related_scenarios": ["scen-1"],
    "properties": { /* ... */ },
    "created_by": "user-id",
    "created_at": "2026-..."
  }
}
```

- 说明：服务端在数据库中以 `JSON` 类型（或文本）保存 `test_content`，并将 `related_requirements` 与 `related_scenarios` 也以数组/JSON 格式保存在对应列。详情请参考 `mysql_init.sql` 的建表语句（已将 `req_test_case` 表加入初始化脚本）。

- 常见错误：
  - 400：请求体无效或 `test_content` 缺失。
  - 401：鉴权失败（若启用授权）。
  - 500：数据库错误等。
