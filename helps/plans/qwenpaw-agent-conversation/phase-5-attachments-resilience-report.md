# 阶段五：附件与可靠性交付记录

## 完成范围

- 对话输入区已开放 `.docx / .pdf / .xlsx` 文件选择和拖拽入口。
- 附件在浏览器端校验扩展名、MIME、空文件和大小上限。
- 上传使用 `POST /api/console/upload`、`FormData` 和 `X-Agent-Id`，未手写 multipart `Content-Type`。
- 纯附件发送会自动补充“请读取并处理所附文件。”文本指令。
- 聊天请求只发送上传响应中的 `file_url`，不发送 `file_data`。
- 附件具有 queued、uploading、uploaded、failed、sent 状态；支持移除和失败后单项重试。
- 聊天失败后的重新发送复用原始内容和已上传 URL，不重复插入 user message。

## 可靠性

- 聊天超时由 `VITE_QWENPAW_CHAT_TIMEOUT_MS` 配置，默认 120000 ms。
- 上传大小由 `VITE_QWENPAW_UPLOAD_MAX_BYTES` 配置，默认 20 MB。
- 用户停止、超时、网络、HTTP、协议和远端失败继续使用独立错误分类。
- Agent 或会话切换会取消进行中的上传并清理旧会话附件状态。
- QwenPaw 离线时保留已加载 Agent 快照，同时禁用发送入口。
- 当前会话详情刷新绕过缓存；其他已加载详情使用最近 10 条 LRU 内存缓存。
- 历史卡片使用 `content-visibility`，流式文本按动画帧批量提交。

## 验证

- `npm run build --workspace @baic/webview`：通过。
- `git diff --check`：通过。
- 应用内浏览器打开 `http://127.0.0.1:5173/#/agent/store`：页面和路由正确。
- 项目选择、新对话、附件入口、支持格式提示和发送按钮状态：通过。
- 浏览器 console error/warn：0。
- 按仓库约定未运行 ESLint 和 `tsc --noEmit`。

## 人工验收项

自动化验证未提交真实上传和聊天，避免向 QwenPaw 写入额外会话数据。请使用真实文件确认：

1. 分别选择 `.docx / .pdf / .xlsx` 并发送。
2. 仅选择附件、不输入文本时，确认仍能收到智能体回复。
3. 人为制造上传失败后执行单项重试。
4. 上传成功后人为制造聊天失败，确认重新发送不重复上传、不重复显示 user message。
5. 验证 120 秒超时和用户主动停止显示不同终态。

阶段五完成后停止，等待人工验收，再进入阶段六。
