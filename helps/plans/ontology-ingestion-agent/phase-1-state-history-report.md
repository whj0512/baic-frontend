# 第一阶段：统一状态与历史聚合实施报告

日期：2026-07-30

## 阶段结论

第一阶段已完成，当前停在人工验收点，尚未开始第二阶段。

本阶段建立了可复用的业务智能体定义、Run / Job / Artifact 状态模型、跨入口
Agent 的 ChatSpec 聚合、按需历史恢复、当前定义范围内的依赖健康检查，以及
一阶和二阶两个开发测试 fixture。`AgentStore` 仅挂载数据层并暴露诊断属性，
没有改造页面主体或提前实现第二阶段 UI。

## 已实现内容

- `workflowCore/registry.ts`
  - 注册并校验 `BusinessAgentDefinition`
  - 只检查当前定义声明的依赖 Agent
  - 汇总连接、启用状态和活动模型健康度
- `workflowCore/workflowIdentity.ts`
  - 固定 `user_id`：
    `baic-project:{projectId}:agent:{businessAgentId}:run:{runId}`
  - 固定并解析按 Job 区分的 `session_id`
- `workflowCore/workflowReducer.ts`
  - 支持创建、恢复、会话登记、消息、协议、确认、重试、停止、失败和完成事件
  - 所有异步回写以
    `businessAgentId + runId + jobId + requestId` 校验，忽略过期请求
- `workflowCore/workflowRunIndex.ts`
  - 从三个入口 Agent 的 ChatSpec 聚合 Run
  - 只接收 `console` 和当前项目、当前业务智能体的新身份前缀
  - 相同 `session_id` 保留更新时间最新的记录并生成诊断警告
  - 单入口失败时保留其他入口结果，并标记历史不完整
  - 不使用 ChatSpec `status` 推断业务完成状态
- `workflowCore/useAgentTaskRuns.ts`
  - 复用现有 `fetchChats`、`fetchChatHistory` 和消息标准化逻辑
  - 列表阶段只读取 ChatSpec；打开 Run 后才加载历史
  - 历史并发上限为 2
  - 项目或业务智能体切换时中止旧请求，并用 request id 防止旧数据覆盖
  - `200 + messages: []` 标记为不可恢复，而不是新任务或已完成
  - 复用现有 fenced/tool 提取器恢复产物，只保存消息来源引用，不保存路径
- `workflows/ontologyIngestion/`
  - 注册本体入库业务智能体定义
  - 声明 12 个依赖 Agent、3 个入口 Agent、3 个步骤和 3 个 v1 产物查询
  - 提供首条消息的 TextContent 与 DataContent 构造器
- `workflowCore/fixtures.ts`
  - 提供一阶和二阶测试定义
  - fixture 不进入生产注册表

## 自动验证

执行：

```powershell
node packages/webview/scripts/workflowPhase1Smoke.mjs
```

验证通过：

- 本体业务智能体已注册
- 两个 fixture 分别为 1 步和 2 步
- 跨入口聚合得到同一 Run 的 4 个 Job
- 重复 session 去重并保留警告
- 单入口失败不丢弃其他聚合结果
- 12 个依赖全部健康时可用；缺少一个依赖时仅阻塞当前定义
- 过期 request id 的 reducer 事件被忽略

执行：

```powershell
node packages/webview/scripts/workflowPhase1Smoke.mjs --live-base-url http://localhost:42112
```

实时 QwenPaw 验证通过：

- 使用隔离项目 `ontology-ingestion-phase1-live-smoke`
- 三个入口 Agent 共登记并聚合 4 个 ChatSpec
- 历史详情使用 `ChatSpec.id` 获取，没有与 `session_id` 混用
- 本次四个请求终态均为 `failed`，四份历史均为
  `200 + messages: []`
- 上述记录仍可被发现和聚合，但状态层不会据此判定业务完成；打开历史时会标记
  为不可恢复

执行：

```powershell
npm run build
```

生产构建通过。输出仅包含现有的动态/静态导入和大 chunk 警告。按仓库约定未执行
ESLint 和 `tsc --noEmit`。

## 人工验收建议

1. 打开 Agent Store 并选择项目，确认现有页面交互和布局没有变化。
2. 在页面根节点检查：
   - `data-business-agent-id="ontology-ingestion"`
   - `data-business-agent-health`
   - `data-business-agent-runs-status`
   - `data-business-agent-run-count`
   - `data-business-agent-history-incomplete`
3. 在开发控制台查看 `[Business agent workflow state]`，确认健康状态只反映本体定义
   的 12 个依赖，并且当前项目切换后 Run 索引随之切换。
4. 可重复运行纯逻辑和实时冒烟命令，确认历史读取使用 ChatSpec UUID，旧协议会话不会
   出现在新 Run 索引中，也不会被删除或改写。

人工确认本报告及上述行为后，再进入第二阶段。
