# 阶段五：附件与可靠性计划

## 1. 阶段目标

在文本对话稳定后接通现有附件入口，并补齐生产使用需要的超时、中止、重试、错误隔离和长列表边界。

## 2. 文件上传流程

现有 UI 提示支持 `.docx / .pdf / .xlsx`，首版按该范围开放：

1. 用户选择或拖拽文件。
2. 前端校验扩展名、MIME、空文件和配置的大小上限。
3. 调用 `POST /api/console/upload`：
   - `FormData.append('file', file, file.name)`；
   - 请求头只设置 `X-Agent-Id` 和代理所需认证；
   - 不手写 multipart `Content-Type`。
4. 校验响应 `url/file_name/size`。
5. 发送聊天请求：

```ts
[
  { type: 'text', text: userText || '请读取并处理所附文件。' },
  {
    type: 'file',
    filename: uploaded.file_name,
    file_url: uploaded.url,
  },
]
```

即使用户只选择附件，也必须补充非空 `TextContent`，避免 QwenPaw no-text debounce 导致 HTTP 200 但 SSE 为空。

不发送 `file_data`。

## 3. 附件 UI 状态

每个待发送文件具有：

```ts
type AttachmentState =
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'sent'
```

交互要求：

- 发送前可以移除。
- 上传中显示进度状态；若 Fetch 无真实上传百分比，不伪造百分比。
- 上传失败可单项重试，不丢失文本草稿。
- 上传完成但聊天失败时复用已取得的 `file_url` 重试，避免无意义重复上传。
- 会话或 Agent 切换时取消上传，并清理只属于旧 draft 的本地状态。
- 消息气泡显示真实文件名和字节大小。

## 4. 超时与中止

聊天可能执行工具，应采用不少于 120 秒的可配置超时：

```text
VITE 中不保存秘密，但可以保存非敏感超时配置；
默认 120000ms，允许运行时覆盖。
```

区分：

- 用户点击停止：`stopped`
- 请求超时：`timeout`
- 网络断开：`network`
- HTTP 非 2xx：`http`
- SSE JSON 损坏：`protocol`
- QwenPaw `failed`：`remote`

不同错误共享重试入口，但诊断信息保留在日志中，用户提示使用可理解的中文。

## 5. 失败恢复

### 发送失败

- 保留用户消息和草稿文本。
- assistant 草稿标记失败。
- 重试使用同一 `sessionId/userId/channel`。
- 防止重复插入同一用户消息；重试策略在 reducer 中显式区分“重发请求”和“新消息”。

### completed 后历史暂未登记

- 有限退避刷新 ChatSpec。
- 通过 `session_id + user_id + channel` 匹配。
- 仍未匹配时保留当前会话，并提供“刷新历史”。

### ChatSpec 存在但 `messages` 为空

- 按接口契约显示合法空态。
- 不把静态欢迎语填进去。
- 提供重新加载，但不无限自动重试。

### QwenPaw 离线

- Agent 列表显示连接错误。
- 已加载的远端数据可以保留为当前内存快照，但明确标记离线。
- 发送入口禁用。
- 恢复连接后显式刷新，不把旧内存数据描述为最新。

## 6. 性能边界

QwenPaw Chat 列表无分页契约，前端需要：

- 只请求 ChatSpec，不全量请求历史。
- 按 `updated_at` 在客户端排序。
- 历史详情按选中项懒加载。
- 对已加载详情使用有上限的内存缓存，例如最近 10 条会话。
- 刷新当前会话时绕过旧缓存。
- 长列表使用 `content-visibility` 或在实测规模明显卡顿后再引入虚拟列表，不预先增加重型依赖。
- 流式高频 chunk 在 reducer 中按动画帧或小时间窗批量提交，避免每个 token 都触发整个页面重渲染。

## 7. 可观测性

开发日志至少包含：

- endpoint 类别，不打印 Bearer Token；
- agentId、chatId、sessionId 的脱敏/截断值；
- HTTP 状态；
- SSE 终态；
- 上传文件名、大小，不打印文件内容；
- Abort/timeout/remote failure 分类。

生产 UI 不显示原始堆栈或本地 `workspace_dir`。

## 8. 阶段完成条件

- `.docx/.pdf/.xlsx` 通过真实上传接口发送。
- 纯附件操作仍包含非空文本指令。
- 不使用 `file_data`。
- 上传失败、聊天失败、超时和用户中止可区分、可恢复。
- 长历史列表不会产生全量详情请求风暴。
- 高频 SSE 不造成明显输入或滚动卡顿。

完成后停止，等待真实文件人工验证。

