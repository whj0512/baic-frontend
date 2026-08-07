# 第零阶段：QwenPaw 与 Skill 契约冒烟报告

## 结论

第零阶段的 API、SSE、上传、ChatSpec、三个现有 Skill 和历史恢复契约已完成受控实测。
当前实例与计划依据的 QwenPaw `1.1.12.post3` 一致，未发现需要修改 v1 Skill 输出的
不兼容项。

页面级人工检查仍需用户在正常浏览器中完成：本轮应用内浏览器对
`localhost:5174` 和 `127.0.0.1:5174` 均返回 `ERR_BLOCKED_BY_CLIENT`，因此没有用
自动化截图替代人工验收。

## 环境与隔离标识

- QwenPaw：`http://localhost:42112`
- 版本：`1.1.12.post3`
- Agent 总数：15
- 标准项目：
  `E:\baic-frontend\智能化需求建模\测试结果001\多媒体中心功能规范V1.0-20250722`
- 隔离用户：
  `ontology-ingestion-smoke-1785417806917-4c7793c2`
- 所有新 Session 均使用同一隔离前缀，没有复用正式 Run。

## API 与会话结果

| 检查 | 结果 |
| --- | --- |
| 12 个目标 Agent | 全部存在、启用并配置 `active_model` |
| 三个入口 Agent chats | 均为 `200` ChatSpec 数组 |
| Text + Data | `200 text/event-stream`，53 个事件，`response:completed` |
| 精确 ChatSpec 发现 | `user_id + channel` 首次查询即找到 |
| ChatSpec 身份 | `id` 与 `session_id` 明确不同 |
| ChatSpec 详情 | 使用 `id` 返回 `messages + status=idle` |
| Markdown 上传 | `{ url, file_name, size }` 完整，大小 190 B |
| Text + FileContent | 完整消费 391 个事件并收到 `response:completed` |
| Data-only | `HTTP 200`、0 字节、0 事件、无 response 终态 |
| 不存在 Agent | `404 {"detail":"Agent 'ontology-ingestion-missing' not found"}` |
| 不存在 Chat | `404 {"detail":"Chat not found: ontology-ingestion-missing"}` |

当前 12 个目标 Agent 全部启用，因此没有为了制造 403 修改 QwenPaw 配置。空注册历史
需要破坏已登记 ChatSpec 的底层 Session，未执行该破坏性操作；这两项保留为第四阶段的
受控 fixture/环境验收。

## SSE 事件类型

本轮观察到：

- `response:created / in_progress / completed`
- `message:reasoning:in_progress / completed`
- `message:message:in_progress / completed`
- `message:plugin_call:in_progress / completed`
- `message:plugin_call_output:in_progress / completed`
- `content:text:in_progress / completed`
- `content:data:in_progress / completed`
- `turn_usage`

只有 `response:completed` 被视为请求终态。Data-only 请求证明 HTTP 200 和流关闭均
不能替代 response 终态。

## Skill、call_id 与历史恢复

| Skill 查询 | ChatSpec ID | 结果 |
| --- | --- | --- |
| chunks summary | `7807970f-2285-4fe5-9039-3c40aefaf701` | 历史中存在有效 `chunks` fence |
| chunks full | `4f6876e5-90ca-4dd9-838c-ddc60b333c7c` | 历史中存在有效 `chunks` fence |
| DSL v1 | `bbb9bf96-4874-4d70-abb4-64eb29397d21` | 历史中存在脚本调用与完整 JSON tool output |
| ontology marker | `c087cd8d-39b1-4fd2-a194-a052a14319f6` | 历史中存在固定 marker tool output |

三个 Skill 的目标 `execute_shell_command` 均通过
`plugin_call.content[0].data.call_id` 与
`plugin_call_output.content[0].data.call_id` 一一配对。message `id` 彼此不同，不能
用于工具配对。

脚本路径与前端 matcher 一致：

- `scripts/query_chunks.py`
- `scripts/query_requirement_dsl_artifacts.py`
- `scripts/emit_ontology_instance_panel.py`

前端 `normalizeMessages` 会把 Windows 本地路径替换为 `[本地路径已隐藏]`。上传响应的
本地 `file_url` 只用于 QwenPaw 输入，不作为产物链接；本轮没有修改该边界。

## 体积与预算

| 查询 | 工具 payload | 最终文本 | 历史详情 | 原始 SSE |
| --- | ---: | ---: | ---: | ---: |
| chunks summary | 21,251 B | 17,962 B | 59,229 B | 1,080,461 B |
| chunks full | 30,567 B | 27,018 B | 76,805 B | 1,567,879 B |
| DSL v1 | 161,160 B | 245 B | 195,546 B | 737,970 B |
| ontology marker | 251 B | 49 B | 11,491 B | 80,002 B |

冻结预算：

- 单次结构化工具 payload：`256 KiB`
- 单次完整 SSE：`2 MiB`

任一指标超出预算时不得启用 v1 自动批量查询，必须使用第三阶段的 summary / filtered
契约。DSL v1 在本标准项目中低于预算，但仍只允许在整个功能批次结束后查询一次。

## 冻结的后续契约

- chunks v1 保持 summary/full 兼容契约。
- DSL v1 保持历史兼容；第三阶段新增 v2 summary/full、按 requirement/artifact
  过滤、上下文/对齐/测试用例摘要、`content_size` 与 `sha256`。
- ontology instance marker 继续只负责写入后的实时关系卡片。
- 第三阶段新增 `query-project-ontology-artifacts`，读取 manifest 管理的 TTL、校验、
  上传与推理摘要。
- 所有阶段门禁同时要求合法业务协议和有效查询 payload。

## 人工验证步骤

1. 保持 QwenPaw `localhost:42112` 在线，启动 webview 开发服务器。
2. 打开 `/agent/store` 并选择对应标准项目。
3. 在 `requirement_itemizer` 历史中打开上表 chunks summary/full 会话，确认 chunks
   面板可见。
4. 在 `requirement_document_parse` 历史中打开 DSL v1 会话，确认 DSL 面板可见。
5. 在 `requirement_ontology_manager` 历史中打开 ontology marker 会话，确认关系卡片
   可见；若当前页面无项目上下文，应显示缺少项目的诊断而不是打开本地路径。
6. 刷新页面后重新打开三类会话，确认面板可从历史恢复。
7. 检查消息和产物区域，不应存在可点击的 `file://` 或 Windows 本地路径链接。

人工确认通过前，不进入第一阶段。
