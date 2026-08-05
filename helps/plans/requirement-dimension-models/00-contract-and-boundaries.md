# 多模型数据契约与边界

## 1. 依据

- 数据库：[DB_SCHEMA.md](../../DB_SCHEMA.md) 中的 `req_requirement_model`。
- HTTP 接口：[API_DOCUMENTATION.md](../../API_DOCUMENTATION.md) 中的“需求维度多模型接口”。
- 当前兼容模型：`packages/webview/src/models/Requirement.ts` 中的五组 `dsl_*` / `graph_*`。

Agent 实施时以当前工作区中的两份文档为准，不根据本计划猜测后端未声明的字段。

## 2. 前端类型

新增独立类型文件，例如：

```text
packages/webview/src/models/RequirementModel.ts
```

最低类型契约：

```ts
export type RequirementDimensionCode = 'IBD' | 'ESD' | 'BDD' | 'ISD' | 'SC'

export interface RequirementModel {
  id: string
  model_group_id: string
  requirement_version_id: string
  requirement_group_id: string
  dimension_code: RequirementDimensionCode
  model_type: string | null
  name: string
  model_key: string
  dsl_text: string
  graph_json: object
  source_representation: 'dsl' | 'graph' | 'both' | string
  context_model_group_id: string | null
  converter_version?: string | null
  is_primary: boolean
  sort_order: number
  source_path?: string | null
  metadata?: Record<string, unknown> | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface RequirementModelInput {
  dimension_code: RequirementDimensionCode
  model_group_id?: string
  model_type?: string | null
  name: string
  model_key: string
  dsl_text?: string | null
  graph_json?: object | null
  context_model_group_id?: string | null
  is_primary?: boolean
  sort_order?: number
  source_path?: string | null
  metadata?: Record<string, unknown> | null
}

export interface RequirementModelDraft extends RequirementModelInput {
  clientId: string
  dsl_text: string
  graph_json: object
}
```

固定规则：

- `id` 是当前需求版本中的模型行 ID，不用于跨版本选择。
- `model_group_id` 是模型逻辑 ID，是现有模型编辑、选择、草稿和 React key 的持久身份。
- 创建期模型尚无 `model_group_id`，使用仅存在于前端的 `clientId`。
- `name` 和 `model_key` 在页面提交前 `trim()`，空字符串不得发送。
- `model_type` 允许空；空输入规范化为 `null`。
- 不把 `models` 强制嵌入每个 `Requirement` 列表记录。模型列表由当前选中需求独立加载，避免项目列表产生 N+1 请求。

## 3. Section 与维度映射

在现有 `dimensionEditorConfig` 或相邻共享模块中建立唯一映射：

| SectionKey | dimension_code |
|---|---|
| `environment` | `IBD` |
| `interaction` | `ESD` |
| `internalComposition` | `BDD` |
| `moduleResponses` | `ISD` |
| `internalConstraints` | `SC` |

`dialogMap` 不映射到 `RequirementDimensionCode`，不得传给多模型接口。

禁止在 `RequirementOverview`、`RequirementCreator` 和 `ProjectWorkSpace` 中各复制一套映射。

## 4. API URL

在 `API_ENDPOINTS` 增加编码后的 URL helper：

```ts
requirementModels: (requirementId: string, dimension?: RequirementDimensionCode) => string
requirementModel: (requirementId: string, modelGroupId: string) => string
requirementModelPrimary: (requirementId: string, modelGroupId: string) => string
```

要求：

- 所有路径参数使用 `encodeURIComponent`。
- GET 的 `dimension` 通过 `URLSearchParams` 生成，不手工拼接未编码值。
- 不新增硬编码后端地址。

## 5. API 模块

新增集中请求模块，例如：

```text
packages/webview/src/config/requirementModels.ts
```

对外提供：

```ts
fetchRequirementModels(requirementId, signal?): Promise<RequirementModel[]>
createRequirementModel(requirementId, input): Promise<RequirementModelsMutationResult>
updateRequirementModel(requirementId, modelGroupId, input): Promise<RequirementModelsMutationResult>
setPrimaryRequirementModel(requirementId, modelGroupId): Promise<RequirementModelsMutationResult>
deleteRequirementModel(requirementId, modelGroupId): Promise<RequirementModelsMutationResult>
```

统一结果至少保留：

```ts
interface RequirementModelsMutationResult {
  requirement_id: string
  version_id?: string
  version_code?: number
  project_id?: string
  model?: RequirementModel
  models?: RequirementModel[]
  deleted_model_group_id?: string
  diff?: Record<string, unknown>
}
```

## 6. 运行时校验

GET 响应必须校验：

- 顶层是对象且 `models` 是数组。
- 每条模型拥有非空字符串 `id`、`model_group_id`、`dimension_code`、`name`、`model_key`。
- `dimension_code` 属于五个受支持值。
- `dsl_text` 是字符串，`graph_json` 是非数组对象。
- `is_primary` 是 boolean，`sort_order` 是 number。
- 可空字段只接受文档允许的类型。

结构错误时整次请求失败并显示“模型接口返回了无效数据”，不得静默删除坏记录后继续渲染不完整集合。

Mutation 响应中的 `models` 若存在，也使用相同解析器。若不存在完整 `models`，调用方随后执行 GET，而不是依据不完整响应猜测集合。

## 7. 请求负载规则

新增模型：

- 发送用户填写的 `name`、`model_type`、`model_key`、`is_primary`。
- 发送当前编辑器保存边界上已经对齐的 `dsl_text` 和 `graph_json`。
- 已有需求新增 ESD/ISD 时发送已选持久化 IBD 的 `context_model_group_id`。
- 新建需求的同一次 `dimension_models` 批量请求中，IBD 还没有 `model_group_id`；此时 ESD/ISD 只允许使用本地选定的主 IBD 作为转换上下文，提交时省略 `context_model_group_id`，由后端按明确主 IBD 推断。不得发送前端 `clientId`。
- `sort_order` 使用当前维度数组中的顺序；本阶段不提供拖拽编辑。
- 不发送 `source_representation` 和 `converter_version`，由服务端判定/填写。

更新模型：

- `dimension_code` 必须保持原值。
- 发送完整当前值而不是只发送表单变化字段，防止服务端请求模型将省略值解释为重置。
- `model_group_id` 同时由 URL 指定；请求体若保留该字段，必须与 URL 一致。
- 元数据编辑时同时回送该模型当前 DSL/Graph，满足“至少一种表示”的条件。

设置主模型：

- 已持久化模型只调用 `/primary`，无请求体。
- 不通过普通 PUT 将当前唯一主模型直接改成 `false`。

## 8. 错误语义

- 优先显示响应 JSON 的 `detail`。
- `400`：显示转换、上下文、维度或模型参数错误。
- `404`：提示需求或模型已不存在，并刷新当前模型集合。
- `409`：提示兼容模型尚未迁移；要求用户先打开并保存该模型，再重试删除。
- `422`：显示字段校验失败，不丢弃用户表单输入。
- `AbortError` 不作为业务错误提示。

## 9. 兼容边界

- 工作区可编辑视图始终通过 GET models 获取模型，包括服务端合成的历史兼容模型。
- `RequirementOverview` 的只读调用方没有模型数据时，继续按旧固定字段判断维度是否定义，并只打开主模型。
- 不在前端根据旧固定字段重复合成工作区模型，以免与 GET 返回的兼容模型重复。
- 模型接口成功后，主模型对应的旧字段由后端同步；前端不额外再调用旧需求 PUT。

## 10. 阶段完成条件

- 类型、Section 映射、URL 和请求模块均为单一来源。
- 所有 URL 参数编码、错误详情和 Abort 行为一致。
- `model_group_id` 被用作持久模型身份。
- 五维模型 API 与 UI 级 DialogMap 明确隔离。
- 旧固定字段只保留兼容读取职责。
