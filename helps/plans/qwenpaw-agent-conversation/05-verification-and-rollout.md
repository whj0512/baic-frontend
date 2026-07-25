# 阶段六：验证与交付计划

## 1. 验证原则

- 使用正在运行的真实 QwenPaw，不用静态 mock 证明完成。
- 断言 HTTP、合法 SSE JSON 和终态，不断言固定事件数量或固定自然语言回答。
- 每个阶段完成后先人工验收，再继续下一阶段。
- 按仓库约定，不在本地执行 `eslint` 或 `tsc --noEmit`；相关检查交给 CI。
- UI 变更采用聚焦的手工验证，保留用户现有未提交改动。

## 2. 阶段一验收：连接

| 场景 | 预期 |
| --- | --- |
| QwenPaw 在线 | 浏览器成功读取 version、agents、chats |
| 浏览器跨域 | 无 CORS/混合内容阻塞，或同源代理工作 |
| SSE | chunk 到达时即可读取，不等到请求结束才整体出现 |
| 上传 | multipart 成功并返回 `url/file_name/size` |
| QwenPaw 离线 | 得到可识别连接错误 |

验收产物：

- 当前 QwenPaw 版本；
- 最小真实 SSE 事件字段摘要；
- 开发/平台/生产 URL 方案；
- 是否需要代理。

## 3. 阶段二验收：真实只读数据

### Agent 列表

- 数量和 `GET /api/agents` 一致。
- 名称、描述、启用状态来自响应。
- 刷新失败有重试，不出现本地三条静态 Agent。

### ChatSpec 列表

- 切换 Agent 后请求 URL 中使用正确编码 ID。
- 数量与接口一致。
- 置顶和更新时间排序符合前端规则。
- 不为每条 ChatSpec 自动请求详情。

### 历史详情

- 点击记录使用 `ChatSpec.id`。
- 消息区展示详情 `messages`。
- `messages: []` 显示真实空态。
- `404 Chat not found` 有独立错误态。

## 4. 阶段三验收：状态切换

| 操作 | 检查点 |
| --- | --- |
| 快速切换 Agent A/B/A | 最终只显示 A 的会话，不闪回 B |
| 快速切换 Chat 1/2 | 最终只显示 Chat 2 详情 |
| 点击新建对话 | 画布清空、输入聚焦、未发送前不伪造历史 |
| 切换项目 | 新 draft 的 `user_id` 使用新项目 ID |
| 生成中切换 | 旧流中止，旧 chunk 不污染新会话 |

人工重点检查 `chatId` 用于详情、`sessionId` 用于续聊，二者没有互换。

## 5. 阶段四验收：文本聊天

### 新对话

1. 选择真实 Agent。
2. 点击“新建对话”。
3. 发送第一条文本。
4. 观察 assistant 文本流式增长。
5. 等待 `completed`。
6. 确认历史列表出现真实 ChatSpec。
7. 刷新页面，再次打开该记录，消息仍存在。

### 多轮续聊

1. 打开已有历史。
2. 发送追问。
3. 请求体复用该记录的 `session_id/user_id/channel`。
4. 回答体现上下文。
5. 完成后详情和 `updated_at` 刷新。

### 终态

- completed：显示已同步。
- failed：显示失败和重试。
- stop：流立即停止且 UI 不继续增长。
- 空 SSE：显示协议异常，不无限 loading。
- 超时：显示超时，不描述为用户停止。

### 输入与滚动

- Enter 发送、Shift+Enter 换行、中文输入法不误发送。
- 用户向上阅读时流式输出不强制拉到底部。
- “回到底部”可恢复跟随。

## 6. 阶段五验收：文件

对 `.docx`、`.pdf`、`.xlsx` 各验证一次：

1. 文件进入 queued。
2. 上传响应大小与本地 `File.size` 一致。
3. 聊天 Content 同时包含非空 TextContent 和 FileContent。
4. FileContent 使用 `filename + file_url`。
5. SSE 到达 completed 或明确 failed。
6. 刷新历史后文件消息仍能安全展示。

额外场景：

- 不支持扩展名；
- 空文件；
- 超过大小上限；
- 上传时切换 Agent；
- 上传成功后聊天失败并重试；
- QwenPaw Agent 不具备读取该格式工具。

## 7. 现有功能回归

必须确认本次接入没有破坏：

- Agent Store 路由进入。
- 项目列表加载。
- 新建项目 Modal。
- 选择项目后进入 ConversationWorkspace。
- 删除项目及当前选择清理。
- 桌面侧栏布局。
- 820px 以下侧栏开关、遮罩和 Escape 关闭。
- 现有“模型编辑/测试用例/知识图谱”禁用状态。

用户当前对 `AgentStore.css` 的未提交修改属于既有工作，实施时不得覆盖或回滚。

## 8. 部署检查

- `.env.development` 有可用本地 QwenPaw 地址。
- `.env.platform` 能通过运行时配置注入地址。
- `.env.production` 使用部署确认的同源代理路径。
- 反向代理关闭 SSE 缓冲并允许长连接。
- 代理允许 `X-Agent-Id`、JSON 请求和 multipart 上传。
- 代理上传大小、读取超时大于产品限制。
- 浏览器包中不包含 Bearer Token。

## 9. 最终清理

- `rg` 确认目标组件不再导入 `AGENTS`、`CONVERSATION_MESSAGES`。
- `rg` 确认没有硬编码 `localhost:7706` 出现在业务组件。
- `rg` 确认未使用 `file_data`。
- 检查静态提示“Agent 服务待接入”“当前对话区域仅作界面展示”“已保存至本地工作区”已清理。
- 检查 `chatId/sessionId` 命名没有模糊的复用。
- 检查所有 effect、reader、timeout 和上传请求都有清理路径。

## 10. 最终交付条件

只有以下条件全部成立才视为完成：

1. 三个指定区域均由 QwenPaw 真实数据驱动。
2. 文本新建会话和历史续聊均能在页面刷新后恢复。
3. 文件使用真实上传和 `file_url` 链路。
4. 多 Agent、快速切换、失败、中止和离线均不会串会话。
5. 运行时地址和生产代理配置有明确说明。
6. 现有项目管理和响应式布局无回归。
7. CI 接管 lint/typecheck，人工验证记录随阶段结果一并提交。

