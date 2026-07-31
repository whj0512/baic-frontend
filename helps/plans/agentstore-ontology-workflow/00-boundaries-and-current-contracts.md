# 当前边界与既有契约

## 1. 本文目的

本文记录实施前必须遵守的代码事实、消息协议和数据边界。后续阶段若发现当前代码与本文不一致，应先停止并向用户报告，不得自行扩大范围或重新设计后端。

## 2. 当前组件职责

### `AgentStore`

文件：`packages/webview/src/pages/AgentStore.tsx`

- 负责项目列表的读取、创建、选择和删除。
- 持有当前项目，并用项目 ID 创建 `useQwenPawWorkspace`。
- 协调 Agent、历史会话、当前对话、发送和工作区导航。
- 本次仍是页面级组合入口，不在其中解析原始 SSE、Skill JSON 或文件系统。

### `AgentSidebar`

文件：`packages/webview/src/components/AgentWorkspace/AgentSidebar/AgentSidebar.tsx`

- 展示 Agent、当前项目、历史会话和 QwenPaw 连接状态。
- 只触发选择、新建和重试，不拥有网络请求和业务阶段状态。
- 本次单 Agent 模式改为固定身份卡；项目与历史会话能力必须保留。

### `ConversationWorkspace`

文件：`packages/webview/src/components/AgentWorkspace/ConversationWorkspace/ConversationWorkspace.tsx`

- 组合标题栏、消息时间线、附件状态和自由聊天输入框。
- 管理输入草稿、跟随输出、发送错误和滚动。
- 本次增加可选工作流外壳，但自由聊天仍是主交互，不将页面改造成独立表单向导。

### QwenPaw Hooks

目录：`packages/webview/src/components/AgentWorkspace/qwenPaw/`

- `useQwenPawAgents` 读取远端 Agent。
- `useQwenPawWorkspace` 选择 Agent 并组合历史与当前对话。
- `useQwenPawSessions` 使用 Agent ID 读取 ChatSpec 和历史。
- `useQwenPawConversation` 负责真实发送、SSE 和历史恢复。
- 本次只允许给工作区选择增加 allowlist；不得改变现有请求体、会话标识或 SSE 归一化协议。

## 3. Agent 暴露规则

- 唯一允许的 Agent ID 为 `tqqRiu`。
- allowlist 必须在自动选择 Agent 之前应用，而不是只隐藏侧栏选项。
- 会话列表、新建对话、历史详情和发送上下文只能来自 allowlist 内且已启用的 Agent。
- `tqqRiu` 缺失或禁用时，`activeAgent` 必须为空，页面显示明确状态并禁止新建和发送。
- 不得回退到 `default` 或远端返回的第一个已启用 Agent。
- 设计应保留未来扩展多个 allowlist Agent 的可能，但本次不增加第二个 Agent。

## 4. 会话与业务流程边界

- 一条 QwenPaw 对话等于一轮本体建模流程。
- 当前阶段只从当前对话的消息和用户当前未持久化的确认操作中推导。
- 切换历史对话时重新从该对话消息计算，不继承另一条对话的阶段。
- 切换项目或新建对话时清除仅属于旧对话的表单与临时确认。
- 不新增项目级 Run/Job、数据库表、浏览器 localStorage 或跨会话聚合状态。
- `ChatSpec.status` 只表示会话运行状态，不能证明条目化、DSL、TTL、上传或推理已经业务完成。

## 5. 既有 Skill 与 Renderer 契约

### `query-project-chunks`

- 前端通过普通聊天文本调用 `$query-project-chunks`。
- Skill 最终输出位于 assistant text 的单个 ````chunks` 围栏中。
- `fencedMessage/registry.ts` 使用 `chunksFenceHandler` 注册。
- `parseChunksEnvelope` 只接受 `protocol_version = "1.0"`、合法状态和完整基础结构。
- `detail=summary` 只删除每个 chunk 的正文 `content`，保留元数据。
- 成功门禁必须检查最新相关围栏的 `status === "success"`，不能仅凭存在卡片推进。

### `query-requirement-dsl-artifacts`

- 前端通过普通聊天文本调用 `$query-requirement-dsl-artifacts`。
- 工具调用和输出通过 `plugin_call`、`plugin_call_output` 与同一个 `call_id` 配对。
- `toolMessage/registry.ts` 使用现有 DSL handler。
- 成功门禁必须检查最新相关面板的 `payload.state === "success"`。
- `summary.feature_count` 用于与最新 chunks 功能清单核对，不从自然语言统计中读取。

### `query-project-ontology-instances`

- 前端通过普通聊天文本调用 `$query-project-ontology-instances`。
- 工具调用和输出继续使用 `call_id` 配对。
- 现有 handler 只接受固定 v1 marker，并将其解析为 `state === "ready"`。
- 客户端从当前对话的项目上下文加载 `ReqRelationShip`，Skill 不传项目 ID 或 GraphDB 数据。

### 共同规则

- 不复制现有 JSON Schema 或另写一套 Skill 解析器。
- 工作流证据分析必须复用 `extractFencedMessage` 和 `extractToolPanels` 的结果或同一注册 handler。
- 最新一次相关查询结果决定当前门禁。较早成功结果不能覆盖较新的失败或重新建模。
- `call_id` 只用于配对与组件实例标识，不能用作卡片类型判别。

## 6. 功能清单事实来源

- `chunks.json` 是流水线一输出的功能清单事实来源。
- `query-project-chunks` 返回的 `data.chunks` 是前端唯一可用的功能集合。
- 只有 `chunk_type === "functional_requirement"` 的条目自动纳入场景 3 待建模清单。
- 系统概述和其他 chunk 仍在现有卡片中展示，但不计入功能总数。
- `source_relative_path` 可用于预填功能 Markdown；缺失时由用户输入绝对路径。
- 禁止递归扫描项目目录、按文件扩展名收集 Markdown、根据目录名补造功能，或把非 chunks 文件自动加入清单。
- 若未来需要核对磁盘漂移，应另立只读对账 Skill；该能力不属于本次计划。

## 7. 路径安全边界

- 仅当 `project_root` 是非空字符串且 `source_relative_path` 是安全相对路径时自动拼接。
- 相对路径不得以 `/`、`\\`、盘符或 URI scheme 开头。
- 规范化分段后不得包含 `..`，不得越过项目根目录。
- 使用项目根目录现有分隔符完成展示拼接，不在浏览器中访问或验证本地文件系统。
- 缺失或不安全的相对路径只影响自动预填，不删除原 chunk，也不猜测替代路径。

## 8. GraphDB 操作边界

- 场景 7 永远只生成和校验本地 TTL，不连接、不上传、不修改 GraphDB。
- 场景 8 必须由用户勾选独立写入授权；只允许追加项目 ABox。
- 场景 8 默认禁止清库、覆盖 TBox/SHACL 和执行推理。
- 场景 9 必须由用户再次勾选独立推理授权；场景 8 的授权不能沿用。
- UI 只生成并发送提示词，不直接调用 GraphDB 写接口。
- Assistant 自然语言中的“完成”不能替代用户审核或结构化 Skill 结果。

## 9. 本次不修改的结构

- `QwenPawAgent`
- `QwenPawChatSpec`
- `ActiveConversationRef`
- `ConversationMessageView`
- `ConversationPart`
- 三个 Skill 的 payload 类型和 protocol version
- fence/tool handler 的注册方式
- 项目 CRUD、工作区导航和后端 API

允许的新增类型仅限前端展示层，例如 `ConversationWorkflowMode`、场景表单值、派生阶段和局部 Context 值；它们不得进入远端请求协议或持久化数据。

