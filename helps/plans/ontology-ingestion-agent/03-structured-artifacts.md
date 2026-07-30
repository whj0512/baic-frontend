# 第三阶段：结构化状态、产物与授权门禁

## 阶段目标

建立前端可验证的通用工作流协议，确保不同业务智能体的步骤推进和产物归档不依赖 Agent 的自然语言表述。本体入库通过协议 adapter 增加三条流水线约束。继续复用已经存在的 fenced message 和 tool message 机制。

## 新增通用工作流状态协议

增加 `agent-workflow` fenced handler：

```text
ConversationWorkspace/fencedMessage/agentWorkflow/
├─ types.ts
├─ parseAgentWorkflow.ts
├─ AgentWorkflowPanel.tsx
└─ handler.ts
```

建议协议：

```json
{
  "protocol_version": "1.0",
  "business_agent_id": "ontology-ingestion",
  "run_id": "uuid",
  "project_id": "project-id",
  "step_id": "itemization",
  "job_id": "itemize | function-key | ontology",
  "status": "running | awaiting_confirmation | completed | failed",
  "summary": "面向用户的短摘要",
  "agents": [
    {
      "id": "requirement_document_extractor",
      "status": "running | completed | failed"
    }
  ],
  "artifacts": [
    {
      "id": "stable-id",
      "kind": "chunks | context | dsl | alignment | testcase | ttl | graphdb | inference",
      "name": "显示名",
      "function_id": "optional",
      "query_binding_id": "itemization-chunks",
      "payload_key": "chunks",
      "mime_type": "optional",
      "summary": {},
      "status": "declared | ready | partial | invalid | unavailable"
    }
  ],
  "warnings": [],
  "next_action": "select_functions | confirm_modeling | authorize_graphdb | none",
  "payload": {},
  "error": null
}
```

解析器执行严格校验：

- 协议版本必须受支持。
- `business_agent_id / run_id / project_id / step_id / job_id` 必须匹配当前上下文与注册定义。
- 公共状态来自通用白名单；`next_action`、artifact kind 和 `payload` 由当前定义的 protocol adapter 校验。
- artifact `id` 在 Run 内稳定且可去重。
- `query_binding_id` 必须存在于当前 `BusinessAgentDefinition.artifactQueries`；
  `payload_key` 必须能与该 binding 的 fenced/tool 解析结果对应。
- Agent 声明 `ready` 只表示“产物应该已生成”。前端只有找到并校验匹配的
  fenced/tool payload 后才把运行态产物提升为 `ready`。
- 本地绝对路径、`file://` URL 和 QwenPaw 工作区路径不是正式产物来源，不进入通用
  协议。
- 非法协议以错误卡展示，不更新 reducer，不解锁阶段。

`agent-workflow` 是 BAIC 前端约定的应用层协议，不是 QwenPaw 原生响应字段。QwenPaw 只负责在 TextContent/SSE 消息中传输它，前端仍需自行提取、校验和归并。本体的 `ontologyIngestionProtocolAdapter` 校验功能、TTL 和 GraphDB 相关 payload。

## SSE 事件与终态

`POST /api/console/chat` 必须使用 `stream: true` 并持续消费到流结束。归一化层需要处理：

- `response`
- `message`
- `content`
- `plugin_call`
- `plugin_call_output`
- `turn_usage`

实现规则：

1. 按 `sequence_number` 处理事件，增量文本按现有 `msg_id + index` 归并。
2. 工具调用和工具结果按 `call_id` 配对，再交给 `toolMessage` registry。
3. 只有 `object === 'response'` 且 `status === 'completed' | 'failed'` 才是请求终态；不能把 content、message 或 plugin 的局部 `completed` 当作流水线终态。
4. SSE 正常关闭但没有 response 终态时，记为协议/网络异常，不自动重发。
5. `response.completed` 只说明本次 Agent 请求结束，仍不等于业务流水线完成；业务完成还要通过下方阶段门禁。
6. `turn_usage` 可用于诊断或统计，不参与阶段推进。

长任务使用 `AbortController` 和活动感知超时；默认总等待不得低于 API 文档建议的 120 秒，接收到有效 SSE 活动时不应被短固定超时误杀。

## Prompt 构建器

因为本轮不修改 QwenPaw Agent 配置，每个业务智能体的 prompt builder 在入口 Agent 的首条任务消息后附加输出约束：

- 所有步骤状态必须输出 `agent-workflow` fenced JSON。
- 内部 Agent 活动通过协议 `agents` 或已知工具调用上报。
- 产物必须写入 `artifacts` 清单。
- 入口 Agent 不能仅用“已完成”等普通文本声明终态。
- 本体 prompt 额外规定：流水线三第一段禁止调用上传 Agent，直到收到前端发送的授权消息。

公共信封提示由 `workflowCore` 生成，业务提示集中在定义自己的 `prompt.ts`，不能散落在 JSX 点击事件中。

## 复用现有 fenced / tool 面板

以下三个现有专用面板由 `ontologyIngestionDefinition.artifactQueries` 与
`artifactRenderers` 注册，不写入通用 registry 的业务判断分支。完整查询绑定见
[07-skill-artifact-integration.md](./07-skill-artifact-integration.md)。

### 文档条目化

- 继续使用 `query-project-chunks` Skill 和现有 `chunks` fenced handler。
- 流水线结束自动查询 `detail=summary`；用户打开原始内容时才查询 `detail=full`。
- 新协议只记录状态、关联和产物索引，不复制整个 chunks 数据。
- 功能多选项从通过校验的 chunks 数据中派生。

### DSL 与测试用例

- 继续使用 `query-requirement-dsl-artifacts` v1 tool panel 展示三类已有 DSL。
- 每个功能至少需要：上下文、DSL、对齐结果、测试用例四类状态。
- v1 结果只能作为 DSL 子门禁，不能单独证明上下文、对齐和测试用例完成。
- 第三阶段同步实现向后兼容的 Skill v2 与 handler：支持 summary/full、按需求或
  artifact 过滤，并返回上下文、对齐、测试用例的结构化摘要和按需内容。
- 协议的 artifact 与工具结果通过稳定
  `job_id / query_binding_id / payload_key` 关联。
- DSL 语法失败、对齐失败或测试用例缺失时，功能状态为 `failed` 或 `partial`，不能计入完成数。

### 本体实例与关系

- 继续使用 `query-project-ontology-instances` tool panel 展示 GraphDB 中的实例结果。
- 该 Skill 只发实时 GraphDB 面板标记，不能证明本地 TTL、校验、上传或推理产物存在。
- 第三阶段新增 `query-project-ontology-artifacts` Skill、tool handler 和专用面板；
  它通过相对路径 manifest 读取 TTL、校验、写入和推理结果。
- 若工具输出已有专用面板则优先专用面板；通用清单卡只展示索引和摘要。

## Agent 工具活动映射

增加专用 ToolPanel handler 识别：

- `chat_with_agent`
- `submit_to_agent`
- `check_agent_task`
- `spawn_subagent`

从输入和输出中提取目标 Agent ID，与当前业务智能体定义的 `requiredAgentIds` 匹配后显示。本体定义可映射其 12 Agent：

- 所属流水线。
- 职责名称。
- 当前状态。
- 调用开始 / 完成 / 失败。
- 可展开的原始数据。

未知工具仍回退到现有通用 `ToolPartView`，不能因为新增 handler 丢失原始诊断。

## 本体工作流门禁判定

### 流水线一完成

同时满足：

1. `agent-workflow.status === completed`，且本体 adapter 校验通过。
2. 有成功解析的 `query-project-chunks` summary payload，而不只是 `chunks` 索引。
3. 至少解析出一个可选功能。
4. `next_action === select_functions`。

### 流水线二完成

对用户最终保留的每个功能同时满足：

1. 对应 Job 协议为 `completed`。
2. DSL 工具结果完整；v1 或 v2 历史均可证明三类 DSL。
3. v2 建模产物结果证明上下文与对齐无阻断错误。
4. v2 建模产物结果证明测试用例存在且可打开。

部分功能失败时，Run 状态为 `partially_failed`，用户必须重试或明确排除失败项。

### 流水线三写入前

首次调用只允许：

- 解析需求与已有模型。
- 生成 TTL。
- 校验 TTL。
- 生成待推理摘要。
- 返回 `awaiting_confirmation / authorize_graphdb`。

此时还必须有成功解析的 `query-project-ontology-artifacts` payload，证明 TTL 可读取且
校验无阻断错误。只有索引或普通文本时不显示授权按钮。该状态不算失败，也不允许前端
自动发送授权消息。

## GraphDB 授权

授权表单包含：

- 服务地址。
- Repository ID。
- 写入模式，首版固定“追加写入”。
- “我确认将上述 TTL 写入指定仓库”的勾选框。
- 如环境需要凭据，用户名 / 密码只保存在当前 React 内存中。

用户确认后，前端向同一个本体会话发送结构化授权消息，包含 `run_id`、目标地址、仓库、追加写入授权和 TTL artifact ID。密码不得出现在日志、历史摘要、协议卡或本地存储中。

需要在计划评审时明确：前端提示词门禁属于产品级保护，不是服务端强制权限隔离。若要求不可绕过的安全边界，必须另立后端授权任务，不在本轮前端范围内。

## 产物归档

通用 `ArtifactCenter` 的数据来源按优先级合并：

1. 已有专用 fenced/tool panel 的有效 payload。
2. 已校验的 `agent-workflow.artifacts` 逻辑索引。
3. 当前业务智能体定义中的 `artifactQueries` 查询能力。

普通 Markdown 链接和本地路径不能单独注册为正式产物。重复 artifact 按
`business_agent_id + run_id + job_id + artifact.id` 去重，更新时保留最新状态，并
记录来源消息 ID、part key、handler ID 和 query binding ID。渲染器先查当前定义
注册项，未匹配时使用通用 JSON 卡；没有 HTTP URL/受控文件桥接时不显示下载。

历史详情只返回 `messages + status`，因此恢复产物时必须把 ChatSpec 元数据和归一化消息合并。ChatSpec 的 `idle/running` 不能替代本协议的业务状态。

历史中只有索引但 payload 缺失、无效或被截断时，产物中心显示“重新查询”，继续原
Job 会话调用绑定 Skill；不得通过 QwenPaw 本地 tool result 路径恢复，因为当前 REST
API 没有对应下载接口。

## 本阶段预计修改

- `ConversationWorkspace/fencedMessage/registry.ts`
- 新增 `fencedMessage/agentWorkflow/`
- `ConversationWorkspace/toolMessage/registry.ts`
- 新增 `toolMessage/agentActivity/`
- `MessagePartView.tsx`
- `workflowCore/workflowReducer.ts`
- `workflows/ontologyIngestion/prompt.ts`
- `workflows/ontologyIngestion/protocolAdapter.ts`
- `workflowCore/artifactQueryBindings.ts`
- 通用 `ArtifactCenter.tsx`
- 本体 `GraphDbAuthorizationPanel.tsx`
- 同步交付 `query-requirement-dsl-artifacts` v2 与兼容 handler
- 新增 `query-project-ontology-artifacts` Skill、tool handler 和面板

## 第三阶段验收

1. 普通文本“任务完成”不能推进阶段。
2. 无效、错 Run、错项目或未知版本协议被阻断并可诊断。
3. chunks、DSL 工具结果和本体实例工具结果继续正常渲染。
4. 工具活动按当前定义映射；本体 12 Agent 能映射到正确流水线。
5. 每条流水线结束后，产物中心出现稳定可回看的产物；刷新后从来源消息恢复，payload
   缺失时可继续原 Job 会话重新查询。
6. 未授权 GraphDB 时停留在“待确认”，刷新后仍保持该状态。
7. 授权后才发送上传指令，凭据不会进入持久化数据。
8. 任意局部 SSE `completed` 都不会被误识别为请求或流水线完成。
9. SSE 缺少 response 终态时显示可恢复错误，不自动创建重复会话。
10. 两个测试 fixture 使用相同 `agent-workflow` 信封但不同步骤和 payload，均不需要修改公共解析器。
11. 本阶段完成后暂停，等待协议联调与授权流程人工确认。
