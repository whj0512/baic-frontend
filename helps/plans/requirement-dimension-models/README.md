# 需求维度多模型前端适配计划

本目录定义 `req_requirement_model` 上线后，Webview 如何从“每个维度一个固定 DSL/Graph 槽位”迁移到“每个维度包含多个模型制品”。计划以 [DB_SCHEMA.md](../../DB_SCHEMA.md) 和 [API_DOCUMENTATION.md](../../API_DOCUMENTATION.md) 为接口依据，可直接交给 Agent 按顺序实施。

## 文档索引

| 顺序 | 文档 | 内容 |
|---|---|---|
| 0 | [00-contract-and-boundaries.md](./00-contract-and-boundaries.md) | 数据类型、接口、兼容规则和范围边界 |
| 1 | [01-workspace-state-and-persistence.md](./01-workspace-state-and-persistence.md) | Workspace 状态、请求生命周期、WebSocket、保存和草稿 |
| 2 | [02-ui-and-editor-implementation.md](./02-ui-and-editor-implementation.md) | 概览、创建器、两级模型列表、元数据表单和编辑器改造 |
| 3 | [03-verification.md](./03-verification.md) | 构建、接口、交互、兼容和竞争条件验收 |

## 推荐实施顺序

```text
建立 RequirementModel 类型与 API 封装
  ↓
接入 ProjectWorkSpace 模型加载和 WebSocket 刷新
  ↓
实现维度—模型两级列表及元数据编辑
  ↓
改造 DimensionEditor 的持久化边界
  ↓
升级 RequirementCreator 和本地草稿
  ↓
完成兼容、错误和竞争条件验证
```

## 已锁定决定

- IBD、ESD、BDD、ISD、SC 每个维度均支持多张模型。
- 页面必须呈现并允许用户修改 `name`、`model_type`、`model_key`、`is_primary`。
- `name`、`model_key` 为前端必填；`model_type` 为可空自由文本。
- `is_primary` 使用同维度单选语义：选择另一模型成为主模型，不能把唯一主模型直接取消。
- 已有模型切换主模型使用专用 `/primary` 接口；普通元数据/DSL/Graph 更新使用模型 PUT。
- 维度行负责展开模型列表；点击具体模型才进入编辑器。
- 新建需求通过一次 `POST /requirements` 的 `dimension_models` 提交多模型，不再同时提交五维旧固定字段。
- 已有需求的 ESD/ISD 必须使用 `context_model_group_id` 对应 IBD 的 DSL；新建需求批量提交时尚无 IBD 逻辑 ID，只允许依赖本地选定的主 IBD并省略临时上下文 ID，由后端按主 IBD 推断。
- 旧 `dsl_*` / `graph_*` 只作为主模型兼容字段和只读快照回退，不再是多模型主数据源。
- 只管理需求最新版本的模型；不实现历史版本模型浏览。
- UI 级 `DialogMap` 不属于新表支持的五个维度，保持现有前端路径。
- 不修改后端、数据库和现有接口文档。

## 核心架构

```text
ProjectWorkSpace
├─ requirements（WebSocket 当前需求快照）
├─ selected requirement models（GET /requirements/{id}/models）
├─ RequirementOverview
│  └─ DimensionList
│     ├─ dimension row
│     └─ model rows（metadata / primary / actions）
├─ DimensionEditor
│  └─ model POST/PUT persistence callback
└─ RequirementCreator
   └─ local RequirementModelDraft[]
      └─ POST /requirements { dimension_models }
```

## 主要改造区域

```text
packages/webview/src/models/
packages/webview/src/config/
packages/webview/src/hooks/useProjectSync/
packages/webview/src/pages/ProjectWorkSpace.tsx
packages/webview/src/components/RequirementOverview/
packages/webview/src/components/RequirementCreator/
packages/webview/src/components/DimensionList/
packages/webview/src/components/DimensionEditor/
packages/webview/src/utils/editorDraftStorage.ts
```

## 完成定义

1. 一个需求的同一维度可以创建、展示、编辑和删除多张模型。
2. 四个业务字段在列表或信息表单中可见且可修改。
3. 每个非空维度始终只有一张主模型，切换后旧兼容字段同步到新主模型。
4. 模型内容保存使用模型接口，并以 `model_group_id` 跨版本持续跟踪。
5. 多 IBD 时 ESD/ISD 使用用户选择的上下文模型。
6. 创建期多模型通过 `dimension_models` 一次提交并可恢复独立草稿。
7. WebSocket 远端更新能刷新当前模型集合，旧请求不会覆盖新需求状态。
8. 历史兼容需求、UI 级需求和只读发布快照不回归。
9. `npm run build:webview` 与 `git diff --check` 通过；不执行 ESLint 或 `tsc --noEmit`。
