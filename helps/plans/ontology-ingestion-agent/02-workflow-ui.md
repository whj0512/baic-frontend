# 第二阶段：完整任务页面与交互

## 阶段目标

将原“选择执行 Agent → 选择会话 → 自由对话”界面改为“选择项目 → 选择业务智能体 → 选择聚合任务 → 按定义执行”的通用页面。本体入库定义呈现三阶段流程。保留补充对话能力，但主要推进动作全部由明确按钮完成。

## 组件拆分

```text
AgentTaskWorkspace/
├─ AgentTaskSidebar.tsx
├─ AgentTaskWorkspace.tsx
├─ BusinessAgentSelector.tsx
├─ AgentTaskHeader.tsx
├─ WorkflowStepper.tsx
├─ WorkflowStarter.tsx
├─ ExecutionTimeline.tsx
├─ WorkflowStepSection.tsx
├─ ArtifactCenter.tsx
└─ *.css

workflows/ontologyIngestion/
├─ FunctionBatchPanel.tsx
├─ GraphDbAuthorizationPanel.tsx
└─ artifactRenderers.tsx
```

`AgentStore.tsx` 继续拥有项目 CRUD、当前 `businessAgentId` 和 `navigate`，通过 props 把当前项目与注册定义交给统一工作区。任务运行、产物和会话细节由 `useAgentTaskWorkflow(definition, projectId)` 提供。

## 左侧栏

保留现有锚定项目选择器，替换底层执行 Agent 下拉框和单 Agent 历史：

- 顶部：产品名和 QwenPaw 连接状态。
- 当前项目：项目名称、描述、切换、新建、删除。
- 业务智能体选择器：展示已注册定义的名称、描述、可用性和待处理任务数。
- 主按钮：根据定义显示“新建{业务智能体简称}任务”。
- 任务历史：只显示当前业务智能体的标题、当前步骤、状态、更新时间和定义提供的进度摘要。
- 状态筛选：全部、执行中、待确认、已完成、失败。
- 不展示不符合新 `user_id` 前缀的旧独立会话。

删除当前项目后，沿用现有行为返回欢迎页，不自动选择另一个项目。

## 顶部身份区

- 标题、图标和副标题来自当前业务智能体定义；本体入库副标题显示“文档 → 需求建模 → 本体关系”。
- 显示连接、执行、历史刷新三类状态，避免用一个状态混合表达。
- 保留“模型编辑 / 测试用例 / 知识图谱”等项目工作区跳转，仍使用：

```text
/workspace/{encodeURIComponent(project.id)}?view={target}
```

## 新任务引导表单

通用 `WorkflowStarter` 负责字段布局、校验摘要、上传状态和提交按钮。字段由 `definition.starter` 声明；复杂字段可由定义注册扩展组件。以下字段只属于本体入库定义。

### 字段

| 字段 | 类型 | 校验 |
| --- | --- | --- |
| 源文档 | 文件 | DOCX / PDF，必填，沿用现有上传限制 |
| MinerU Markdown | 文件 | MD，必填，必须由用户确认与源文档同版本 |
| 输出根目录 | 文本 | 必填，标准化空白但不擅自改写路径 |
| 项目名称 | 文本 | 默认当前项目名，必填 |
| 建模目标 | 多行文本 | 必填 |
| 附加约束 | 多行文本 | 选填 |

### 提交

- 上传尚未完成时禁用开始按钮。
- 提交前展示当前定义依赖的 Agent 健康检查；本体定义显示 12 Agent。
- 表单成功提交即锁定源文件版本；如需替换文件，创建新任务，避免跨阶段混用版本。
- 用户可以保存未提交草稿到 `sessionStorage`，键中包含当前 `projectId`。
- 源文档和 Markdown 先通过 `POST /api/console/upload` 上传，上传请求的 `X-Agent-Id` 使用当前实际消费文件的入口 Agent ID。
- 不手动设置上传请求的 `Content-Type`；浏览器 `FormData` 负责 multipart boundary。
- 首条聊天请求的 Content 顺序固定为：非空 `TextContent` → Run 表单 `DataContent` → 两个 `FileContent`。
- `FileContent` 使用上传响应的 `url / file_name / size`，聊天字段映射为 `file_url / filename`；不使用 `file_data`。
- 上传 URL 视为 QwenPaw 返回的不透明值，不拼接、不改写，也不假设可被其他 Agent 永久复用。
- 后续流水线在各自入口 Agent 的首次消息中接收用户明确提供的
  `output_root/project_root`，并在该会话内调用已注册查询 Skill 读取上游产物。前端
  不把本地路径转换为 artifact URI，也不能假设上传 URL 可跨 Agent 永久复用；若某
  入口 Agent 必须直接读取原文件，则针对该入口重新上传。

结构化首条输入示意：

```text
TextContent("请按本体入库流水线处理以下文档，并遵守附带协议。")
DataContent({ business_agent_id, run_id, project_id, step_id, output_root, goal, constraints })
FileContent({ filename, file_url })
FileContent({ filename, file_url })
```

图片输入不是标准场景的必需能力。后续若允许补充界面截图，只有在当前 Agent 模型支持多模态时才发送 `ImageContent`。

## 定义驱动步骤条

步骤条只允许：

- 回看已完成阶段。
- 打开当前阶段。
- 查看未来阶段前置条件。

不允许通过点击未来步骤跳过门禁。每个步骤同时显示状态文字、图标和简短摘要。步骤数量、名称和状态摘要来自定义；通用组件必须能渲染 1、2、3 个及更多步骤。

## 统一执行时间线

时间线按实际发生顺序合并当前业务智能体的多个会话。下例属于本体入库：

```text
用户提交引导表单
  └─ 流水线一开始 / Agent 活动 / chunks 产物
用户选择功能并确认
  ├─ 功能 A：上下文 → DSL → 对齐 → 测试用例
  ├─ 功能 B：上下文 → DSL → 对齐 → 测试用例
  └─ 功能 C：失败 → 用户重试 → 完成
用户确认进入本体阶段
  └─ TTL 生成与校验
用户授权 GraphDB
  └─ 上传 → 推理 → 最终关系产物
```

普通对话消息默认折叠在对应 Job 内；结构化状态、用户确认和产物卡片保持展开，从而避免内部执行 Agent 的交流淹没主流程。

## 功能批处理面板

本节是 `ontologyIngestion` 注册到 `function-modeling` 步骤的专用面板，不进入通用页面壳。

- 流水线一的功能结果使用复选列表，可搜索、全选和按父功能分组。
- 用户至少选择一个功能。
- 确认后生成批次清单；功能名称与来源条目固定，不再被聊天文本改变。
- 每个功能卡显示四个子步骤、持续时间、重试次数和产物完整性。
- 运行中可停止当前功能；未开始项保持队列状态。
- 失败项支持“重试此功能”和“从本批次排除”。排除前二次确认，并保留审计记录。

## 右侧阶段产物中心

产物中心始终可见，分组名称和顺序来自定义。本体入库分为：

1. 条目化与功能清单。
2. 上下文、DSL、对齐和测试用例；按功能展开。
3. TTL、校验、GraphDB 写入和推理关系。

每个产物项显示：名称、类型、所属阶段、所属功能、生成时间、来源 Agent 和状态。
操作按查询绑定与传输能力显示：

- 有已解析 payload：显示“查看”；直接打开来源消息旁的现有专用 Renderer。
- 有摘要/完整两种查询：显示“查看摘要 / 查询完整内容”。
- 只有逻辑索引、payload 缺失：显示“重新查询”；继续原 Job 会话调用对应 Skill。
- 只有存在受支持的 HTTP URL 或后续受控文件桥接时才显示“下载”。
- 无法重新查询时保留结构化摘要和诊断，不把本地路径显示为链接。

详细映射见
[07-skill-artifact-integration.md](./07-skill-artifact-integration.md)。

## 底部输入区

- 用于补充约束、解释失败和继续当前 Job。
- 阶段未运行时提示用户先使用主要操作按钮。
- 输入内容不能直接改变阶段状态。
- 文件附件只发送给当前活动入口 Agent；不允许在未确认阶段偷偷触发下一流水线。
- 即使只有文件、图片或 DataContent，也必须补一条非空 TextContent，避免 QwenPaw Console debounce 后出现 HTTP 200 但 SSE 无事件。
- 保留停止生成、重新发送和上传失败重试。

## 本阶段预计修改

- `packages/webview/src/pages/AgentStore.tsx`
- `packages/webview/src/pages/AgentStore.css`
- `packages/webview/src/components/AgentWorkspace/AgentSidebar/`
- `packages/webview/src/components/AgentWorkspace/ConversationWorkspace/`
- 新增 `AgentTaskWorkspace/`、`workflowCore/` 和 `workflows/ontologyIngestion/` 组件

优先复用现有 `ConversationComposer`、消息时间线、附件上传和导航处理；对话通用组件需要通过 props 扩展，而不是复制。

## 第二阶段验收

1. 新建任务首屏为引导表单，字段和校验完整。
2. 页面展示业务智能体选择器，但不暴露底层 QwenPaw 执行 Agent 下拉框。
3. 本体三阶段状态和阻断原因清晰，未来阶段不可误点进入。
4. 条目化完成后可多选功能并生成批处理队列。
5. 时间线能区分阶段、功能 Job、Agent 活动和用户确认。
6. 右侧产物中心在长时间线中仍可固定访问。
7. 原项目选择、项目创建删除和工作区导航无回归。
8. 1440 px、1200 px 两档布局可用。
9. 上传与聊天分别使用当前定义的正确入口 Agent ID，文件请求始终带非空文本意图。
10. ChatSpec 尚未登记时显示“正在同步会话”，不会出现一条可点击但无法恢复的伪历史。
11. 切换两个测试 fixture 时，步骤条、表单、新建按钮和产物分组随定义变化，项目上下文保持不变。
12. 通用页面组件中不存在“本体”“GraphDB”“三阶段”或具体 12 Agent ID 字面量。
13. 本阶段完成后暂停，等待页面与交互人工确认。
