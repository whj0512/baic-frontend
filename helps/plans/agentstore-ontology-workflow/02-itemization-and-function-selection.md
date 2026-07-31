# 阶段二：场景 1、chunks 查询与功能选择

## 1. 阶段目标

在阶段一工作流外壳中接入场景 1，引导用户完成文档条目化；通过现有 `query-project-chunks` Skill 获取功能清单，并让 chunks 卡片成为场景 3 的功能选择入口。

本阶段结束时，用户可以：

- 用结构化表单发送手册中的场景 1 提示词；
- 明确点击“完成场景 1 并查询功能清单”；
- 在现有 chunks 卡片中审核功能、关系证据和一致性问题；
- 选择某个功能并将其信息预填到下一阶段的场景 3 表单占位状态。

本阶段不发送场景 3，不查询 DSL。

## 2. 前置条件

- 用户已确认阶段一人工验收通过。
- `tqqRiu`、项目上下文和正常对话发送可用。
- 现有 `chunks` fence handler 能继续渲染原始卡片。

## 3. 场景 1 表单

### 3.1 字段

增加以下字段，全部保留为当前对话内的 UI 草稿：

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| 原始文档 | 是 | DOCX/PDF 绝对路径；只校验非空，不在浏览器访问文件 |
| MinerU Markdown | 是 | MD 绝对路径；只校验非空 |
| 项目根目录 | 是 | 输出目录绝对路径；后续 Skill 查询复用 |
| 补充限制 | 否 | 附加在固定限制之后，不覆盖固定语义 |

表单提供“发送场景 1”按钮。发送中、当前对话不可写或任一必填项为空时禁用。

### 3.2 发送模板

发送文本固定为：

```text
请使用 requirement_itemizer 对系统需求文档进行条目化。
原始文档：<原始文档>
MinerU Markdown：<MinerU Markdown>
项目根目录：<项目根目录>
要求：按系统功能拆分为独立 Markdown，保留功能概述和系统概述；
从功能概述、功能列表或正文的明确描述中提取项目级 includes 关系；
不要根据目录层级推断包含关系。
请输出 chunks.json、每个功能条目、关系种子和校验结果。
补充限制：<用户内容，仅非空时添加>
```

模板生成必须是模块级纯函数。文本发送仍调用现有 ConversationWorkspace `onSend`，不得直接调用 QwenPaw client。

## 4. 查询功能清单

### 4.1 明确结束动作

发送过场景 1 且当前回复不再生成时，显示“完成场景 1 并查询功能清单”。该按钮代表用户认为场景 1 已结束；不要根据 assistant 的“已完成”文本自动调用 Skill。

按钮发送：

```text
请使用 $query-project-chunks 查询以下项目根目录的 chunks.json。
项目根目录：<最近一次场景 1 的项目根目录>
详细度：detail=summary
请严格按 Skill 契约在最终 assistant text 中只返回 chunks 围栏。
```

发送后按钮进入等待状态；允许在错误或无有效围栏时重新调用。

### 4.2 最新证据选择

在 `deriveWorkflowState` 中按消息顺序执行：

1. 找到最新一条可识别的场景 1 用户消息及其消息位置。
2. 只检查该位置之后的 `$query-project-chunks` 请求和 `chunks` 围栏。
3. 选择最新一个已被现有 handler 成功解析的 chunks block。
4. 如果最新 block 的 payload `status=success`，进入审核状态。
5. 如果最新 block 为 error、围栏无效或没有 block，保持场景 1 active。

不得让旧场景 1 的成功 chunks 推进重新条目化后的流程。

## 5. 功能清单派生

从最新成功 payload 读取：

- `payload.project_root`
- `payload.data.chunks`
- `payload.data.project_relation_seed`

功能候选规则固定为：

```ts
chunk.chunk_type === 'functional_requirement'
```

不得使用标题关键字、目录层级、父子关系或文件扩展名补充候选。

每个候选的稳定键为 `chunk_id`；展示名称按以下顺序选择：

1. 非空 `canonical_function_name`
2. 非空 `title`
3. `chunk_id`

功能清单保留原 payload 顺序，不按名称重新排序。

## 6. Chunks 卡片交互

### 6.1 局部 Context

在 `ontologyWorkflow` 目录增加局部 React Context，提供：

```ts
interface OntologyWorkflowInteraction {
  enabled: boolean
  selectedChunkId: string | null
  modeledChunkIds: ReadonlySet<string>
  onSelectFunction: (selection: WorkflowFunctionSelection) => void
}
```

Context 只存在于 `workflowMode=ontology-ingestion` 的 ConversationWorkspace 中。ChunksMessagePanel 在 Context 缺失时保持当前纯展示行为。

不得修改 `FencePanelContext`、handler registry 或通用 fence 类型。

### 6.2 卡片操作

对于 `functional_requirement`：

- 在 chunk summary 中显示“待建模功能”标识；
- 增加“建模此功能”按钮；
- 已在后续阶段发起过场景 3 时显示“重新建模”；
- 点击按钮选择该 chunk，并将工作流面板滚动或聚焦到场景 3 预填区域；
- 按钮不能触发消息发送。

非功能 chunk 不显示建模按钮。

### 6.3 选择数据

选择对象只保留 UI 所需字段：

```ts
interface WorkflowFunctionSelection {
  chunkId: string
  requirementId: string | null
  name: string
  sourceRelativePath: string | null
  projectRoot: string
  resolvedMarkdownPath: string | null
}
```

该对象只在 React 状态中使用，不写入消息、localStorage 或 API。

## 7. 路径预填

实现模块级纯函数 `resolveWorkflowMarkdownPath(projectRoot, sourceRelativePath)`：

- 两个参数均先 trim；根目录为空则返回 null。
- 相对路径为空时返回 null。
- 拒绝盘符开头、UNC、正斜杠根路径、反斜杠根路径和 URI scheme。
- 将 `\\` 与 `/` 用于分段检查；任何 `..` 分段均返回 null。
- 删除空分段和 `.`，再使用项目根目录采用的主要分隔符拼接。
- 该函数只生成展示字符串，不调用文件系统。

路径缺失或拒绝时：

- chunk 仍可被选择；
- 场景 3 预填区显示“请手工填写功能 Markdown 绝对路径”；
- 不显示“文件不存在”等未经浏览器验证的结论；
- 不扫描目录、不自动调用其他 Skill。

## 8. 场景 1 确认门禁

最新 chunks 成功后显示：

- 功能数量；
- 是否存在功能条目；
- 缺少安全 Markdown 路径的功能数量；
- “确定条目化结果，进入功能建模”按钮。

确认按钮只在至少存在一个 functional chunk 时启用。确认后显示功能选择清单和场景 3 预填区域；确认本身不发送消息。

若刷新发生在确认后但场景 3 尚未发送，用户需要再次确认。不得为避免重复确认而新增持久化。

## 9. 本阶段不得实施

- 不发送 `requirement_analysis_pipeline`。
- 不调用 `$query-requirement-dsl-artifacts`。
- 不根据磁盘遍历补充功能。
- 不修改 query-project-chunks ZIP 或 Skill 协议。
- 不在通用 ChunksMessagePanel 中硬编码 Agent ID。

## 10. 阶段交付与停止

完成代码修改后：

1. 只检查本次改动范围和差异。
2. 不运行自动构建或测试。
3. 提交阶段报告，引用 B 组、F01-F03。
4. 明确停止，等待用户人工确认后再进入阶段三。

