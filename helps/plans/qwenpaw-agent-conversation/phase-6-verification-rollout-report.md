# 阶段六：验证与交付报告

## 1. 验证环境

- 日期：2026-07-26
- Webview：`http://127.0.0.1:5173/#/agent/store`
- QwenPaw：真实服务，版本 `1.1.12.post3`
- Agent：真实接口返回 5 个，本轮使用 `default`
- 项目后端：`GET http://localhost:8000/projects` 返回 200；浏览器项目创建
  请求返回 `TypeError: Failed to fetch`

本轮未使用静态 mock。SSE 验证只断言每个 `data:` 行为合法 JSON、关键对象
类型存在，以及响应到达 `completed` 或明确 `failed` 终态。

## 2. 真实接口冒烟

使用 `packages/webview/scripts/qwenPawPhase6Smoke.mjs` 完成四轮独立会话：

| 场景 | session_id | 本地大小 | SSE 事件 | 终态 |
| --- | --- | ---: | ---: | --- |
| 文本 | `baic-phase6-1785051584973-ddbcafb0` | - | 10 | completed |
| DOCX | `baic-phase6-1785051588289-e2e0b1fa` | 667804 | 380 | completed |
| XLSX | `baic-phase6-1785051654082-ad060db8` | 12547 | 225 | completed |
| PDF | `baic-phase6-1785051708818-88920110` | 1273856 | 209 | completed |

三种文件的上传响应均包含 `url/file_name/size`，响应大小与本地文件一致；
聊天请求使用 `TextContent + FileContent.file_url`，未使用 `file_data`。四轮
事件均包含 response、message 和 content 对象。

真实 chat 列表共 30 条，本轮四条记录均可通过 ChatSpec 恢复：

| 场景 | chatId |
| --- | --- |
| 文本 | `af4a8e92-1f67-416e-85f0-1e6b97e4fdb6` |
| DOCX | `4747ed3a-ef98-4649-a1df-2aad79acc0cb` |
| XLSX | `c62a8d49-396e-4c10-9496-bb2efbeef1d6` |
| PDF | `c87b5d24-d2cb-4b4e-a30e-efc79a50ed95` |

## 3. 页面验证

- Agent Store 路由可进入，真实 Agent 和历史列表加载正常。
- 选择现有项目 `proj1` 后可进入 ConversationWorkspace。
- 打开本轮 PDF 历史后，用户文件、工具过程、Markdown 回答和“已同步至
  QwenPaw”均可恢复。
- QwenPaw 历史会附带服务端本地工作目录。消息预处理现已隐藏 Windows
  绝对路径；服务说明替换为“用户上传文件已就绪。”，工具数据中的路径替换为
  `[本地路径已隐藏]`。
- 桌面侧栏与对话区布局正常；阶段四已验证 820px 以下侧栏开关、遮罩和
  Escape 关闭，本轮没有重复改变浏览器 viewport。
- “模型编辑 / 测试用例 / 知识图谱”仍保持原禁用状态。

## 4. 项目管理回归

项目列表可加载，`proj1` 和 `0515-209` 均可见。“新建项目”Modal 可以打开、
输入并取消；分别从 `127.0.0.1:5173` 和 `localhost:5173` 提交临时项目
`phase6-regression-20260726-final` 时，浏览器均得到 `TypeError: Failed to
fetch`。随后直接查询 `GET /projects` 确认临时项目没有创建，因此没有可执行
的删除对象；为保护用户数据，本轮没有删除任何既有项目。

项目后端 GET 可达而浏览器写请求失败，表现符合跨域预检或后端写请求策略
阻塞。这是一项独立环境问题，不影响已通过的真实 QwenPaw 接口与会话验证。
项目后端允许浏览器 POST 后仍需补做“创建临时项目 → 选择 → 删除 → 当前选择
清理”闭环。

## 5. 配置与清理

- development、platform、production 均定义 QwenPaw 地址、120 秒超时和
  20 MiB 上限。
- VS Code 扩展同样注入地址、超时和上传上限。
- 生产使用同源 `/qwenpaw`；SSE、上传、认证和网关限制见
  [deployment.md](./deployment.md)。
- 静态 Agent / Conversation mock 文件已移除。
- 业务源码未出现 `localhost:7706`、`file_data` 或旧的待接入提示；
  `localhost:7706` 只保留在 Vite 开发代理和扩展本地默认配置。
- `chatId` 用于详情查询，`sessionId` 用于对话续接，命名保持明确。
- 未执行 `eslint` 或 `tsc --noEmit`，按仓库约定交由 CI。

## 6. 结论

QwenPaw 真实 Agent、会话列表、历史恢复、文本 SSE、DOCX/PDF/XLSX 上传、
Markdown/工具渲染、错误恢复和部署配置已完成阶段六交付。唯一未闭环项目是
受项目后端浏览器写请求策略阻塞的 CRUD 回归；该环境问题解除后应补测此项
再做整体发布签收。
