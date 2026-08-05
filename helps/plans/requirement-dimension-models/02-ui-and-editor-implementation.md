# 多模型 UI、创建器与编辑器实施计划

## 1. 关联文档

- 总索引：[README.md](./README.md)
- 数据契约：[00-contract-and-boundaries.md](./00-contract-and-boundaries.md)
- 状态与持久化：[01-workspace-state-and-persistence.md](./01-workspace-state-and-persistence.md)
- 验收：[03-verification.md](./03-verification.md)

## 2. DimensionList 两级结构

保留当前共享 `DimensionList`，扩展为可选的模型列表能力，避免 `RequirementOverview` 与 `RequirementCreator` 复制渲染逻辑。

目标结构：

```text
IBD  环境组成                       2 个模型  已定义  [新增]
  ○ Vehicle Environment   environment   vehicle-env   [编辑信息] [打开] [删除]
  ● Primary Environment   environment   primary-env   [主模型] [编辑信息] [打开] [删除]
```

维度行：

- 显示维度代码、名称、帮助提示、模型数量和定义状态。
- 点击行或箭头只展开/收起模型列表，不直接打开主模型。
- 展开状态使用 `SectionKey` 集合管理，不由模型数量变化隐式重置。
- 可编辑模式显示“新增模型”；只读模式隐藏写操作。

模型行必须呈现：

- `name`：主要标题，长文本省略并提供 tooltip。
- `model_type`：次级字段；为空显示“未设置类型”。
- `model_key`：等宽文本或标签，长值可复制/查看完整内容。
- `is_primary`：同维度 radio + “主模型”徽标。

操作：

- 打开编辑器。
- 编辑信息。
- 删除。
- 主模型 radio 本身即为修改 `is_primary` 的入口，不再另设含义重复的“设为主模型”按钮。

无障碍要求：

- 展开按钮提供 `aria-expanded` 和关联区域 ID。
- 模型 radio 使用维度级 `name` 分组。
- 行内按钮阻止冒泡，不能误触展开或打开编辑器。
- 禁用、loading 和错误状态不能只靠颜色表达。

## 3. 模型信息表单

新增共享表单/Modal，供概览和创建器复用。建议字段：

| 字段 | 控件 | 规则 |
|---|---|---|
| `name` | Input | 必填，trim 后非空 |
| `model_type` | Input | 可选自由文本，空值转 `null` |
| `model_key` | Input | 必填；同需求、同维度唯一 |
| `is_primary` | Checkbox/Switch（创建）或状态说明（已有） | 创建期可修改；已有模型通过列表 radio 调 `/primary` |
| `context_model_group_id` | Select | 仅 ESD/ISD 显示，选项为 IBD 模型 |

已有模型的信息 Modal 不允许用普通 PUT 直接取消主模型。若用户希望改变主模型，明确引导使用列表 radio，以保证一次动作只创建一个后端版本。

校验顺序：

1. 名称非空。
2. 业务键非空。
3. 当前维度内不存在其他 `model_group_id/clientId` 使用同一 `model_key`。
4. ESD/ISD 上下文存在且指向 IBD。
5. 校验通过后才关闭 Modal 或进入编辑器。

服务端 `400/422` 返回后保持 Modal 打开和全部输入值。

## 4. RequirementOverview

增加模型相关 props，具体可用 callbacks 对象收敛 prop 数量，但职责必须包含：

- `models`、`modelsLoading`、`modelsError`。
- 重试加载。
- 新增模型。
- 打开模型。
- 编辑模型信息。
- 选择主模型。
- 删除模型。

行为：

- 基础信息和 `nl_text` 的现有编辑流程保持不变。
- 五维“已定义”改为 `该维度 models.length > 0`。
- 模型加载失败时只在五维区域显示错误和重试，需求基础信息仍可查看/编辑。
- Mutation 进行中只禁用相关模型或维度操作，不冻结整个概览。
- `readOnly` 且没有 models 时沿用旧固定字段和原 section click；不得要求发布快照提供新模型接口。

## 5. RequirementCreator

创建器通过 `dimensionModels` 渲染相同的两级列表。

### 新增模型

1. 点击维度“新增模型”。
2. 打开模型信息 Modal。
3. 首张模型默认 `is_primary = true`，后续默认 false。
4. 完成信息后创建本地 `clientId` 并进入空编辑器。
5. 编辑器保存只更新本地草稿并提示“暂存成功”，不调用后端。

### 编辑和删除

- “编辑信息”按 `clientId` 修改草稿。
- “打开”进入该草稿的 DSL/Graph 编辑器。
- 删除主模型后本地选择同维度第一个剩余模型为主模型。
- 切换 radio 只修改本地数组。

### 创建请求前验证

逐维度验证：

- 每张模型有非空 `name`、`model_key`。
- `model_key` 在该维度内唯一。
- 每张模型至少有非空 DSL 或非空图对象。
- 每个非空维度恰有一个 `is_primary = true`。
- 创建期存在 ESD/ISD 时必须存在一张本地主 IBD；转换使用该草稿的 DSL。
- 创建请求中的 ESD/ISD 不发送 `context_model_group_id`，由后端按照明确主 IBD 推断；前端 `clientId` 绝不进入 API 负载。

创建期信息表单不开放绑定非主 IBD，并显示“需求创建后可改绑具体 IBD”。这样无需发明临时 ID 协议，也不会把实现决策留给执行 Agent。

## 6. DimensionEditor 持久化边界

当前 `useUnsavedChangesGuard` 内部硬编码旧需求 PUT。改为由父级注入异步持久化：

```ts
onPersist?: (snapshot: EditorSnapshot) => Promise<void>
```

行为分流：

- 现有需求模型：`onPersist` 调用模型 POST/PUT。
- 新建需求模型：`onPersist` 更新 `RequirementModelDraft`。
- DialogMap：继续现有本地逻辑。
- Agent Workspace 的 `mode: 'artifact'`：保持原 `onDraftChange`，不得被需求模型 API 影响。

`useUnsavedChangesGuard` 负责：

- DSL/Graph 在保存边界上的转换和规范化。
- 等待 `onPersist` 成功后再 `markSnapshotSaved`。
- 持久化失败时保持 dirty 状态和草稿。
- 返回/丢弃确认语义保持不变。

它不再负责：

- 拼接需求或模型 URL。
- 决定 POST 还是 PUT。
- 合并模型集合。
- 更新需求 `nl_text`。

## 7. 编辑器数据源与标题

需求模型模式的初始数据来自当前模型：

- `initialDslContent = model.dsl_text`。
- `initialGraphData = model.graph_json`。
- ESD/ISD 的 `ibdDsl` 来自上下文 IBD 模型。

编辑器标题展示：

```text
{dimensionCode} {dimension label} / {model.name}
```

标题附近同时显示：

- `model_type`。
- `model_key`。
- 主模型徽标。

“内容描述”当前绑定的是需求级 `nl_text`，不属于模型记录。需求模型模式移除该可编辑 textarea，或改为不参与 dirty/snapshot 的只读需求说明；推荐移除，需求描述继续在 Overview/Creator 基础表单编辑。

## 8. 草稿和 key

`DimensionEditor` 的 React key 和草稿 identity 均包含模型身份：

```text
{requirement.id}-{sectionKey}-{model_group_id | clientId}
```

这样切换同维度模型时会正确重建编辑器初始状态，且不同模型不会共享 ref、saved snapshot 或本地草稿。

从临时模型首次 POST 成功变成持久化模型时：

- 先保存服务端响应。
- 清理 clientId 草稿。
- 将选择切换到 model_group_id。
- 使用服务端返回模型重建已保存基线。
- 不因 key 变化再次弹出未保存确认。

## 9. CSS 与响应式

- 维度行和模型子列表保持现有卡片视觉层级，不改变整个 Workspace 三栏布局。
- 模型元数据采用可收缩网格；名称列允许 `min-width: 0`。
- `model_key` 使用等宽字体、ellipsis 和 tooltip，不能撑破左侧面板。
- 桌面端操作按钮同行排列；窄屏换行但 radio、徽标和模型名称仍保持顺序。
- 加载 skeleton、空态和错误态限定在模型区域。
- 删除确认 Modal 在窄屏不溢出。

## 10. 不在范围内

- 不提供 `sort_order` 拖拽或数字编辑。
- 不开放 `source_representation`、`converter_version`、`source_path`、`metadata` 编辑。
- 不新增模型历史版本浏览。
- 不修改 PublishProject 的快照结构。
- 不为 DialogMap 发明第六种 `dimension_code`。
- 不重写 FlowGraph、DSL Editor 或各维度转换策略。

## 11. 阶段完成条件

- 四个业务字段在模型列表/编辑器标题中可见，并有明确编辑入口。
- 已持久化模型的 `is_primary` 只通过 radio + `/primary` 修改。
- 创建器支持同维度多模型并只维护一份草稿主数据。
- 编辑器不再保存需求固定字段或 `nl_text`。
- 同维度模型切换不会复用错误的编辑器或草稿状态。
- Artifact 模式、DialogMap 和只读快照路径无回归。
