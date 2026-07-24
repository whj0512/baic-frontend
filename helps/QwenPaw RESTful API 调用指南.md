# QwenPaw RESTful API 调用指南

## 1. 文档范围

本文说明如何通过 HTTP 调用 **QwenPaw Desktop 提供的 RESTful API**。
该接口以 AgentScope Runtime 消息协议为基础，并不是阿里云 DashScope 的
通用 Qwen 模型 API。

本文示例以 TypeScript（Node.js 22+）为主，涵盖：

- 文本 `TextContent`
- 图片 `ImageContent`
- 结构化数据 `DataContent`
- 文件 `FileContent`
- SSE 流式响应解析
- 本地认证、会话管理和错误排查

当前项目已经在以下地址完成真实调用验证：

```text
http://localhost:7706
```

端口可以通过环境变量修改，不应在业务代码中写死。

## 2. 调用流程

文本、图片和结构化数据可以直接发送到聊天接口。文件需要先上传，再把上传
接口返回的 URL 放入聊天请求：

```text
Text / Image / Data
        |
        v
POST /api/console/chat
        |
        v
SSE JSON event stream

Local file
        |
        v
POST /api/console/upload
        |
        v
{ url, file_name, size }
        |
        v
POST /api/console/chat with FileContent.file_url
        |
        v
SSE JSON event stream
```

## 3. 服务地址与认证

### 3.1 接口地址

| 用途 | 方法 | 路径 |
| --- | --- | --- |
| 对话 | `POST` | `/api/console/chat` |
| 文件上传 | `POST` | `/api/console/upload` |

完整默认地址：

```text
POST http://localhost:7706/api/console/chat
POST http://localhost:7706/api/console/upload
```

路径必须包含 `/api` 前缀。

### 3.2 请求头

聊天请求：

```http
Content-Type: application/json
Accept: text/event-stream
X-Agent-Id: default
```

文件上传请求：

```http
X-Agent-Id: default
```

上传使用 `multipart/form-data`。使用 `FormData` 时不要手动设置
`Content-Type`，运行时会自动生成包含 boundary 的正确请求头。

本机通过 `localhost`、`127.0.0.1` 或 `::1` 调用时通常不需要
Authorization。启用了 Web 认证的远程服务还需要：

```http
Authorization: Bearer <TOKEN>
```

## 4. 聊天请求结构

基础请求体如下：

```json
{
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "你好，请介绍一下自己。"
        }
      ]
    }
  ],
  "stream": true,
  "session_id": "session-001",
  "user_id": "user-001",
  "channel": "console"
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | ---: | --- |
| `input` | 是 | 输入消息数组 |
| `input[].role` | 是 | 调用方消息使用 `user` |
| `input[].content` | 是 | Content 数组，可包含多种内容 |
| `stream` | 推荐 | 使用 `true` 获取 SSE 流 |
| `session_id` | 推荐 | 会话标识；相同值用于延续上下文 |
| `user_id` | 推荐 | 调用方用户标识 |
| `channel` | 推荐 | QwenPaw Console API 使用 `console` |

建议每个独立任务使用新的 `session_id`。多轮对话则复用同一
`session_id` 和 `user_id`。

## 5. TypeScript 类型定义

```ts
interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image";
  image_url: string;
}

interface DataContent {
  type: "data";
  data: Record<string, unknown>;
}

interface FileContent {
  type: "file";
  filename: string;
  file_url: string;
}

type MessageContent =
  | TextContent
  | ImageContent
  | DataContent
  | FileContent;

interface QwenPawRequest {
  input: Array<{
    role: "user";
    content: MessageContent[];
  }>;
  stream: true;
  session_id: string;
  user_id: string;
  channel: "console";
}
```

## 6. 各类 Content 的调用方式

### 6.1 TextContent

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "请概括今天的任务。"
    }
  ]
}
```

### 6.2 ImageContent

本地图片可以读取为 Base64，并组成 Data URI：

```ts
import { readFile } from "node:fs/promises";

const image = await readFile("Capture001.png");

const content: MessageContent[] = [
  {
    type: "text",
    text: "请描述这张图片。",
  },
  {
    type: "image",
    image_url: `data:image/png;base64,${image.toString("base64")}`,
  },
];
```

对应 JSON 结构：

```json
[
  {
    "type": "text",
    "text": "请描述这张图片。"
  },
  {
    "type": "image",
    "image_url": "data:image/png;base64,<BASE64_DATA>"
  }
]
```

注意：

- 必须使用准确的 MIME 类型，如 `image/png`、`image/jpeg`。
- 当前 Agent 使用的模型必须支持多模态图片输入。
- 建议在 ImageContent 前添加非空 TextContent。
- 大图片会显著增加 JSON 请求体大小，应同步调整反向代理和客户端限制。

### 6.3 DataContent

```json
[
  {
    "type": "text",
    "text": "请读取并概括下面的数据。"
  },
  {
    "type": "data",
    "data": {
      "project": "QwenPaw",
      "items": [
        {
          "id": 1,
          "status": "ready"
        },
        {
          "id": 2,
          "status": "completed"
        }
      ],
      "metadata": {
        "source": "typescript-client"
      }
    }
  }
]
```

`data` 必须是可序列化的 JSON 对象。不要传递函数、循环引用、`BigInt`
或 Node.js 专用对象。

### 6.4 FileContent

#### 第一步：上传文件

```ts
import { readFile } from "node:fs/promises";

interface UploadResponse {
  url: string;
  file_name: string;
  size: number;
}

async function uploadFile(
  baseUrl: string,
  agentId: string,
  token?: string,
): Promise<UploadResponse> {
  const bytes = await readFile("Exercise2.docx");
  const form = new FormData();

  form.append(
    "file",
    new Blob([Uint8Array.from(bytes)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    "Exercise2.docx",
  );

  const headers = new Headers({
    "X-Agent-Id": agentId,
  });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}/api/console/upload`, {
    method: "POST",
    headers,
    body: form,
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}, ${raw}`);
  }

  return JSON.parse(raw) as UploadResponse;
}
```

典型上传响应：

```json
{
  "url": "<server-returned-file-url>",
  "file_name": "Exercise2.docx",
  "size": 16040
}
```

建议核对响应中的 `size` 与本地文件字节数是否一致。

#### 第二步：发送 FileContent

上传响应字段叫 `file_name`，聊天协议中的推荐文件名字段是 `filename`：

```ts
const uploaded = await uploadFile(baseUrl, agentId, token);

const content: MessageContent[] = [
  {
    type: "text",
    text: "请读取并概括这个 DOCX 文件。",
  },
  {
    type: "file",
    filename: uploaded.file_name,
    file_url: uploaded.url,
  },
];
```

AgentScope Runtime 的通用模型虽然声明了 `file_data`，但 QwenPaw 当前的
Console 与 AgentScope 适配链路实际按 `file_url` 处理文件。因此应使用
“上传文件 → 取得 URL → 发送 FileContent”的两步调用方式，不建议直接发送
Base64 `file_data`。

## 7. 发送聊天请求

```ts
import { randomUUID } from "node:crypto";

async function chat(
  baseUrl: string,
  agentId: string,
  contents: MessageContent[],
  token?: string,
): Promise<Response> {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "X-Agent-Id": agentId,
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const request: QwenPawRequest = {
    input: [
      {
        role: "user",
        content: contents,
      },
    ],
    stream: true,
    session_id: `typescript-${randomUUID()}`,
    user_id: "typescript-client",
    channel: "console",
  };

  const response = await fetch(`${baseUrl}/api/console/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Chat failed: HTTP ${response.status}, ${raw}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const raw = await response.text();
    throw new Error(`Expected SSE, received ${contentType}: ${raw}`);
  }

  return response;
}
```

生产代码还应通过 `AbortController` 设置超时。

## 8. SSE 响应

聊天接口返回 `text/event-stream`。每个事件由空行分隔，JSON 位于
`data:` 字段中：

```text
data: {"sequence_number":0,"object":"response","status":"created",...}

data: {"sequence_number":1,"object":"message","status":"in_progress",...}

data: {"sequence_number":2,"object":"content","status":"in_progress",...}

data: {"sequence_number":3,"object":"response","status":"completed",...}
```

响应流可能包含以下对象：

- `response`
- `message`
- `content`
- `plugin_call`
- `plugin_call_output`
- `turn_usage`

客户端不应假定每个事件都是最终文本，也不应只读取一个事件。

### 8.1 最小 SSE JSON 读取器

下面的实现会逐事件返回 `data:` 中的 JSON 原文。它同时支持一个事件包含
多个 `data:` 行：

```ts
async function* readSseJson(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];

  const dispatch = (): string | undefined => {
    if (dataLines.length === 0) return undefined;
    const payload = dataLines.join("\n");
    dataLines = [];
    return payload;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      let line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);

      if (line === "") {
        const payload = dispatch();
        if (payload !== undefined) yield payload;
      } else if (!line.startsWith(":")) {
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        let fieldValue = colon === -1 ? "" : line.slice(colon + 1);
        if (fieldValue.startsWith(" ")) fieldValue = fieldValue.slice(1);
        if (field === "data") dataLines.push(fieldValue);
      }

      newline = buffer.indexOf("\n");
    }

    if (done) break;
  }

  const payload = dispatch();
  if (payload !== undefined) yield payload;
}
```

调用示例：

```ts
const response = await chat(baseUrl, agentId, contents, token);

if (!response.body) {
  throw new Error("SSE response body is empty");
}

let terminalStatus: string | undefined;

for await (const rawJson of readSseJson(response.body)) {
  // 保留服务端原始 JSON。
  process.stdout.write(`${rawJson}\n`);

  const event = JSON.parse(rawJson) as { status?: string };
  if (event.status === "completed" || event.status === "failed") {
    terminalStatus = event.status;
  }
}

if (terminalStatus !== "completed") {
  throw new Error(`Unexpected terminal status: ${terminalStatus ?? "missing"}`);
}
```

## 9. QwenPaw 当前实现的关键约束

### 9.1 非文本消息应带文本指令

QwenPaw Console Channel 会对不含文本的附件消息进行 debounce 缓存。
如果单独发送 ImageContent、DataContent 或 FileContent，HTTP 可能返回
`200`，但当前 SSE 请求可能没有任何事件。

推荐结构：

```json
[
  {
    "type": "text",
    "text": "请处理后面的附件。"
  },
  {
    "type": "image",
    "image_url": "..."
  }
]
```

即使协议允许 Content 独立存在，也应把用户意图写成非空 TextContent，
然后追加图片、数据或文件。

### 9.2 协议声明不等于当前适配器完整支持

- `ImageContent.image_url`：已验证支持 HTTP URL/Data URI。
- `DataContent.data`：已验证可进入请求处理链路。
- `FileContent.file_url`：已验证支持。
- `FileContent.file_data`：协议有字段，但当前链路不建议使用。

### 9.3 Agent 能否理解内容还取决于运行配置

REST API 成功接收请求不代表所有模型都能理解图片或所有文件格式：

- 图片需要当前模型支持多模态。
- 文件内容读取依赖 Agent 可用的工具和运行环境。
- 超大文件、加密文件、损坏文件或不受支持的格式可能处理失败。
- 自然语言回答是非确定性的，不应对具体措辞做严格断言。

## 10. 环境变量

当前项目的测试客户端支持：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `QWENPAW_BASE_URL` | `http://localhost:7706` | QwenPaw 服务根地址 |
| `QWENPAW_AGENT_ID` | `default` | 写入 `X-Agent-Id` |
| `QWENPAW_TOKEN` | 无 | 可选 Bearer Token |
| `QWENPAW_TIMEOUT_MS` | `120000` | 单次请求超时，单位毫秒 |

PowerShell 示例：

```powershell
$env:QWENPAW_BASE_URL = "http://localhost:7706"
$env:QWENPAW_AGENT_ID = "default"
$env:QWENPAW_TIMEOUT_MS = "180000"
npm test
```

## 11. 常见错误与排查

### 11.1 连接失败

检查：

- QwenPaw Desktop 是否正在运行。
- 实际监听端口是否为 `7706`。
- `QWENPAW_BASE_URL` 是否包含正确协议、主机和端口。

### 11.2 404 / 405

- 确认使用 `POST`。
- 确认路径是 `/api/console/chat`，不是 `/console/chat`。
- 文件上传路径是 `/api/console/upload`。

### 11.3 Agent Not Found

检查 `X-Agent-Id`，并确认对应 Agent 已启用。默认值通常是：

```http
X-Agent-Id: default
```

### 11.4 HTTP 200 但 SSE 没有事件

最常见原因是请求只包含 ImageContent、DataContent 或 FileContent。
添加一条非空 TextContent，再在同一个 `content` 数组中追加非文本内容。

### 11.5 文件上传成功但 Agent 未读取

检查：

- FileContent 是否使用上传响应的 `url` 作为 `file_url`。
- 是否传入 `filename`。
- 是否同时提供“请读取该文件”之类的 TextContent。
- Agent 是否具备读取该文件格式的工具。

### 11.6 图片无法识别

检查：

- Data URI 前缀和实际格式是否一致。
- Base64 是否完整。
- 当前 Agent 的模型是否支持图片输入。
- 请求体是否超过服务或反向代理大小限制。

### 11.7 请求提前超时

QwenPaw Agent 可能执行插件、工具和文件读取，耗时会明显长于普通模型调用。
建议使用不少于 120 秒的超时，并通过 SSE 持续消费响应，避免客户端缓冲。

