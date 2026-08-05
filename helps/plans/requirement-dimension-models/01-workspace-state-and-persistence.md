# Workspace 状态、持久化与草稿计划

## 1. 关联文档

- 总索引：[README.md](./README.md)
- 数据契约：[00-contract-and-boundaries.md](./00-contract-and-boundaries.md)
- UI 实施：[02-ui-and-editor-implementation.md](./02-ui-and-editor-implementation.md)
- 验收：[03-verification.md](./03-verification.md)

## 2. ProjectWorkSpace 所有权

`ProjectWorkSpace` 继续拥有需求选择和中心区路由，同时新增当前需求模型状态：

```ts
const [requirementModels, setRequirementModels] = useState<RequirementModel[]>([])
const [modelsLoading, setModelsLoading] = useState(false)
const [modelsError, setModelsError] = useState<string | null>(null)
const [editingModelIdentity, setEditingModelIdentity] = useState<
  | { kind: 'persisted'; modelGroupId: string }
  | { kind: 'draft'; clientId: string }
  | null
>(null)
```

模型集合不得下沉到 `RequirementOverview` 自行请求，因为：

- `ProjectWorkSpace` 需要用同一集合驱动概览、编辑器和上下文选择。
- `RequirementOverview` 还有无后端模型接口的只读发布快照调用方。
- Mutation 后父级需要原子替换集合并重新定位当前模型。

## 3. 选中需求加载

当 `selectedRequirement` 是真实需求 ID 时，同时启动：

- 现有需求详情/版本请求。
- `fetchRequirementModels(selectedRequirement, signal)`。

两项独立处理成功和失败；模型请求失败不得让基本需求概览消失。

请求生命周期：

1. 每次需求选择变化创建新的 `AbortController` 和单调递增序号。
2. 立即清空旧模型、旧错误和编辑模型身份。
3. 新请求开始时设置 `modelsLoading`。
4. 只有序号仍为最新且未 abort 的响应才可写状态。
5. 需求切换、删除、项目切换或组件卸载时取消旧请求。
6. `selectedRequirement === null` 或 `'NEW'` 时不调用模型 GET。

提供显式 `reloadRequirementModels()`，供错误重试和 WebSocket 更新复用。

## 4. WebSocket 同步

当前 `useProjectSync` 只合并 `requirement_updated.diff`，无法从 diff 恢复完整模型集合。扩展 hook 返回：

```ts
interface RequirementChangeSignal {
  requirementId: string
  versionId?: string
  sequence: number
}
```

固定行为：

- `requirement_created` 仍插入完整需求快照。
- `requirement_updated` 继续按事件顺序把 `change.after` 合并到需求列表。
- 每次 `requirement_updated` 同时更新 `lastRequirementChange`；即使 `version_id` 相同，`sequence` 也递增。
- `ProjectWorkSpace` 观察该信号；只有它指向当前选中需求时才重新请求 models。
- 本地模型 mutation 成功后先立即采用响应，随后到达的 WebSocket 事件允许再 GET 一次，以服务端最终快照为准。
- WebSocket 事件不得在 reducer/UI 层重排。

## 5. 模型选择与导航

- `editingSection` 继续确定编辑器策略。
- `editingModelIdentity` 确定同维度内哪张模型被编辑。
- 已持久化模型通过 `model_group_id` 从最新 `requirementModels` 派生，不保存易过期的整对象副本。
- 创建期模型通过 `clientId` 从创建表单草稿数组派生。
- 模型 mutation 生成新版本行后，`id` 变化不影响当前选择。
- 当前模型被远端删除时退出编辑器、回到概览并提示“模型已被删除”。

## 6. 现有需求的 Mutation

### 6.1 新增模型

1. 元数据表单在前端创建临时模型草稿。
2. 用户进入编辑器并完成 DSL/Graph。
3. 首次保存调用 POST models。
4. 从响应或随后 GET 找到新 `model_group_id`；将编辑身份从 `clientId` 切换为 persisted identity。
5. 清除旧临时草稿键，建立基于 `model_group_id` 的保存基线。

如果 POST 失败，保留临时模型和编辑内容，用户可修改后重试。

### 6.2 编辑内容或元数据

- 使用 PUT models/{model_group_id}。
- 请求包含模型的当前完整业务字段和规范化后的 DSL/Graph。
- 成功后替换集合、更新编辑器已保存快照并清除错误。
- 不调用旧 `PUT /requirements/{id}`，也不在模型保存中修改 `nl_text`。

### 6.3 设置主模型

- 模型列表的同维度单选操作调用 `/primary`。
- 请求期间禁用该维度的主模型选择，防止并发点击产生多个版本。
- 成功后以响应/GET 的 `is_primary` 为准，前端不乐观地永久保留猜测状态。
- 选择当前主模型是无操作，不发送请求。

### 6.4 删除模型

- 删除前确认模型名称、维度及主模型身份。
- 如果是主模型，确认文案说明后端会从剩余模型中选择新主模型，或在无剩余模型时清空该维度。
- 成功后替换集合；若删除的是当前编辑模型则返回概览。
- `409` 只显示迁移提示，不自动执行“更新再删除”。

## 7. ESD/ISD 上下文

上下文选择来源只允许同一需求的 IBD 模型：

```ts
const ibdModels = requirementModels.filter(model => model.dimension_code === 'IBD')
```

规则：

- 新建 ESD/ISD 时只有一个 IBD：自动预选其 `model_group_id`。
- 存在多个 IBD：元数据表单要求用户选择。
- 没有 IBD：禁止创建 ESD/ISD，并提示先创建 IBD。
- 编辑已有 ESD/ISD：显示当前上下文；引用已不存在时标记错误并禁止保存/转换，直到用户重新选择。
- `DimensionEditor` 的 DSL-to-RBG 转换获得对应 IBD 的 `dsl_text`，不得回退到 `requirement.dsl_IBD`，除非当前使用的是只读旧路径。
- 删除被引用的 IBD 时，前端显示依赖模型名称警告，但最终合法性由后端响应决定。

以上持久化 ID 规则适用于已有需求。新建需求批量创建时使用单独规则：

- 创建草稿仍允许多个 IBD，但每个非空维度只能有一个本地主模型。
- 创建期 ESD/ISD 的转换固定使用本地 `is_primary = true` 的 IBD 草稿。
- 创建期不开放“绑定非主 IBD”；信息表单显示“创建后可改绑具体 IBD”。
- `POST /requirements` 时 ESD/ISD 省略 `context_model_group_id`，不得把 `clientId` 发送给后端。
- 创建成功并取得真实 `model_group_id` 后，用户可通过已有模型信息表单改绑到任意 IBD。

## 8. 创建需求状态

将 `CreateRequirementFormData` 的五维内容主数据改为：

```ts
dimensionModels: RequirementModelDraft[]
```

现有 `sectionData` / `sectionDslData` 仅用于一次性读取旧草稿，不再作为新创建流程的写入主数据源。

本地操作：

- 新增：生成 `clientId`，附加到对应维度末尾，`sort_order` 使用数组顺序。
- 编辑：按 `clientId` 替换元数据或 DSL/Graph。
- 删除：移除草稿；若删除主模型且仍有同维度模型，将第一个剩余模型设为主模型。
- 切换主模型：同一维度内将目标设为 `true`，其他设为 `false`。
- 提交：将 `dimensionModels` 去掉 `clientId` 后映射为 `dimension_models`。

最终创建请求只包含需求基础字段和 `dimension_models`；五维旧固定字段不得重复提交，以免主模型和多模型输入冲突。

## 9. 草稿身份和迁移

现有维度草稿键只有 `requirementId + sectionKey`，会导致同一维度模型互相覆盖。扩展为：

```text
projectScope + userId + requirementId + sectionKey + modelIdentity
```

其中：

- 持久化模型：`modelIdentity = model_group_id`。
- 创建期模型：`modelIdentity = clientId`。
- DialogMap：继续使用现有 section 级键。

草稿记录增加：

- `modelIdentity`。
- `baseModelUpdatedAt` 或 `baseRequirementVersionId`。
- 当前四个业务字段和 `context_model_group_id`，确保恢复后信息表单与编辑内容一致。

旧创建草稿规范化：

1. 如果已存在 `dimensionModels`，直接使用。
2. 否则扫描旧 `sectionData` / `sectionDslData`。
3. 每个有内容的 section 转换为一张主模型草稿。
4. 默认名称使用 `{维度标签} 1`。
5. 默认业务键使用 `{dimension_code.toLowerCase()}-1`；若冲突递增序号。
6. 恢复后下一次保存写入新结构，不删除其他版本前缀下的用户数据。

## 10. 阶段完成条件

- 模型加载、重试、切换和卸载不存在旧响应覆盖。
- WebSocket 远端模型更新能刷新当前模型集合。
- 所有 mutation 以响应/GET 的服务端模型集合为最终真相。
- 编辑身份不依赖会随版本变化的模型行 `id`。
- ESD/ISD 上下文始终绑定具体 IBD。
- 同维度多模型的本地草稿彼此隔离且旧创建草稿可恢复。
