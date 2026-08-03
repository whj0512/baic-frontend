# 阶段一：Agent 展示模式与场景 9/10 快捷模板

## 1. 阶段目标

在不改变 `tqqRiu` 工作流的前提下，为 `ontology_qa` 建立自由问答展示模式，并在原聊天输入区增加场景 9、场景 10 快捷模板。

本阶段不实施右侧本体关系面板。

## 2. 前置检查

1. 完整阅读本目录 README 和边界文档。
2. 查看 `git status --short`，记录用户已有修改和未跟踪文件。
3. 重新读取当前版本的：
   - `packages/webview/src/pages/AgentStore.tsx`
   - `ConversationWorkspace/types.ts`
   - `ConversationWorkspace.tsx`
   - `ConversationComposer.tsx`
4. 确认 `EXPOSED_AGENT_IDS` 已包含 `tqqRiu` 和 `ontology_qa`；若不一致，停止并报告，不自行恢复或覆盖。

## 3. 展示模式

将展示层联合类型扩展为：

```ts
export type ConversationWorkflowMode =
  | 'ontology-ingestion'
  | 'ontology-qa'
```

AgentStore 映射规则固定为：

```text
tqqRiu       -> ontology-ingestion
ontology_qa  -> ontology-qa
其他或空值   -> undefined
```

实现要求：

- 不改变 allowlist、Agent 选择和会话 Hook。
- `ontology-ingestion` 仍创建和读取现有工作流检查点。
- `ontology-qa` 不读取或写入任何工作流检查点。
- `ontology_qa` 不渲染 `OntologyWorkflowInteractionContext` 或 `OntologyWorkflowPanel`。
- ConversationWorkspace 的 React key 必须包含项目 ID、active Agent ID 和当前 session ID，确保切换 Agent 后组件局部状态完全重建。
- Agent ID 只用于选择展示模式，不进入远端请求的新字段。

## 4. 快捷模板展示接口

为 Composer 增加可选、纯展示型快捷模板配置。建议类型：

```ts
interface ConversationQuickPrompt {
  id: 'ontology-scene-9' | 'ontology-scene-10'
  label: string
  description: string
  requiresAuthorization: boolean
}
```

具体文本生成器保留在 `ontology_qa` 展示模块中，不把本体领域模板硬编码进通用消息或 QwenPaw 类型。

规则：

- 只有 `workflowMode === 'ontology-qa'` 时传入快捷模板。
- 未传入配置时，Composer 的 DOM、布局和交互保持当前行为。
- 快捷模板区域放在现有输入行上方，仍属于 Composer 外壳。
- 两个模板均只把文本写入现有 `draftText`，不得直接调用 `onSend`。
- 生成期间、当前会话不可写或附件上传中时禁用快捷模板操作。
- 快捷模板不改变附件列表、消息滚动和自由输入焦点规则。

## 5. 场景 9：关系推理模板

### 5.1 控件

场景 9 快捷卡包含：

1. “仓库名称”文本框；
2. 独立推理授权复选框；
3. “填入聊天输入框”按钮。

仓库名称规则：

- 初始值固定为 `requirement`；
- 用户可修改为任意非空文本；
- 生成时使用 trim 后的值；
- trim 后为空时显示字段错误并禁用填入按钮；
- 不访问后端验证仓库是否存在；
- 不从其他页面、历史消息或 GraphDB 地址自动覆盖用户输入。

授权文字固定为：

```text
我明确授权在上述 GraphDB 仓库执行本体关系推理。
```

按钮仅在以下条件全部满足时启用：

- 会话可写；
- 当前不在生成状态；
- 仓库名称 trim 后非空；
- 用户已勾选独立推理授权。

### 5.2 项目标识

AgentStore 或 ConversationWorkspace 向展示模块提供当前项目展示名称：

1. 优先使用非空项目 `name`；
2. 其次使用非空项目 `key`；
3. 最后使用项目 ID。

该值仅写入草稿文本，不新增远端请求字段。

### 5.3 固定模板

```text
我明确授权在 GraphDB 仓库 <用户填写的仓库名称> 上执行本体关系推理。
项目：<当前项目名称、项目 key 或项目 ID>
请推理并导出数据依赖、写冲突、状态机问题和关系证据。
每条推理关系必须包含 relationSource、relationTarget、isInferred=true、subtype 和 evidence；
不要把同名信号、共享连接或目录层级单独判定为依赖。
```

模板生成必须使用模块级纯函数，并只接受已 trim 的仓库名称和项目展示值。

### 5.4 状态重置

- 模板成功填入草稿后立即把授权恢复为未勾选。
- 成功填入后保留当前仓库名称，方便用户继续编辑或再次生成。
- 切换项目、Agent 或对话时仓库恢复 `requirement`，授权恢复未勾选。
- 发送失败、停止生成或重试消息不能自动恢复授权。
- 用户必须在每次重新生成场景 9 授权模板前再次勾选。

## 6. 场景 10：只读关系查询模板

场景 10 快捷卡不包含授权复选框，点击后生成：

```text
请查询 GraphDB 仓库 requirement 中与 <功能名> 相关的关系。
只读，不上传、不推理、不修改仓库。
请按 JSON 导出关系类型、起点、终点、证据和置信度，并给出统计。
```

规则：

- `<功能名>` 原样保留，用户在草稿中自行修改。
- 不根据当前图节点、功能清单或历史消息自动填写功能名。
- 不自动发送、不调用 Skill、不调用 GraphDB API。
- 本次只按用户要求允许场景 9 自定义仓库；不得自行把场景 10 扩展为另一套仓库表单。

## 7. 已有草稿保护

点击任一快捷模板时：

- 当前草稿 trim 后为空：直接写入模板。
- 当前草稿非空：先显示明确确认，说明替换将丢弃当前未发送文本。
- 用户取消：不修改草稿、仓库输入或授权状态。
- 用户确认替换：写入模板；如果是场景 9，再清除授权。
- 不采用自动追加，因为将授权模板拼接到其他自由文本后可能改变语义。

## 8. 视觉与可访问性

- 快捷卡使用现有白色背景、蓝色强调色和边框变量。
- 场景 9 授权区域使用安全提示色，但不遮挡自由输入框。
- 输入、复选框和按钮均有显式 label。
- 禁用按钮必须同时具有 `disabled` 和可理解的提示。
- 键盘顺序为：模板选择、仓库名称、授权、填入按钮、自由输入、附件、发送。
- 窄窗口下模板卡纵向排列，不产生不可恢复的横向滚动。
- 尊重 `prefers-reduced-motion`。

## 9. 本阶段不得实施

- 不增加右侧关系图或 GraphDB 请求。
- 不新增场景进度、完成状态或顺序限制。
- 不修改 `ontology-ingestion` 工作流组件。
- 不改变消息、附件、SSE 或 ChatSpec 数据结构。
- 不将模板生成视为已授权执行或业务完成。

## 10. 阶段交付与停止

完成代码修改后：

1. 只检查本次改动文件和差异范围。
2. 不运行自动构建、测试、Lint、类型检查、浏览器自动化或 Smoke 脚本。
3. 按 README 模板交付阶段报告。
4. 请用户执行 A01-A06、B01-B11。
5. 明确停止，等待用户确认后再进入阶段二。

