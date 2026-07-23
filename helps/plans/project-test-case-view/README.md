# ProjectWorkSpace 平行需求与测试用例视图计划

本目录描述如何把项目工作区重构为“需求”和“测试用例”两个一级平行视图，并将 `TraceabilityExtract` 收敛为测试用例视图内按需打开的“关系总览”。

## 文档索引

| 顺序 | 文档 | 内容 |
|---|---|---|
| 0 | [00-overview.md](./00-overview.md) | 目标语义、组件边界、范围和实施阶段 |
| 1 | [01-data-contract.md](./01-data-contract.md) | 项目测试用例 GET、类型、校验和原始 JSON 展示 |
| 2 | [02-ui-implementation.md](./02-ui-implementation.md) | 一级切换、pane 保持、测试用例 UI 和关系总览入口 |
| 3 | [03-verification.md](./03-verification.md) | 需求回归、测试用例、关系总览和状态保持验收 |

## 推荐实施顺序

```text
拆分 WorkspaceView / CenterView
  ↓
实现 ProjectTestCaseView 数据层与原始 JSON 展示
  ↓
实现一级切换和两个 pane
  ↓
收敛 TraceabilityExtract 为关系总览
  ↓
执行完整回归验证
```

## 核心架构

```text
ProjectWorkSpace
├─ requirements（默认）
│  └─ 原有 CenterView 流程
└─ testCases
   └─ ProjectTestCaseView
      ├─ cases（默认）
      │  └─ 列表 + 所选记录原始 JSON
      └─ traceability
         └─ TraceabilityExtract
```

## 已锁定决定

- `WorkspaceView = 'requirements' | 'testCases'`。
- `CenterView` 不再包含 `'test-case'`。
- 旧需求分组“测试用例”按钮删除。
- “需求”保持所有原功能，是默认一级视图。
- “测试用例”是同级一级视图，默认显示列表和所选完整原始 JSON。
- “关系总览”是测试用例视图的内部按钮入口。
- `TraceabilityExtract` 只负责关系总览。
- 项目测试用例 GET 使用真实 `project.id`。
- 两个一级 pane 首次打开后保持挂载，避免丢失编辑状态。
- 当前阶段不实现测试用例 X6 数据适配，不解析 `nodes` 或 `transitions`。

## 预期主要改造区域

```text
packages/webview/src/pages/ProjectWorkSpace.tsx
packages/webview/src/pages/ProjectWorkSpace.css
packages/webview/src/components/ProjectTestCaseView/
packages/webview/src/components/TraceabilityExtract/
packages/webview/src/config/api.ts
```

## 不在范围内

- 新路由。
- 测试用例创建、编辑、保存、删除和执行。
- 后端或数据库改造。
- 需求视图业务逻辑重写。
- 关系总览算法或 POST 契约修改。

## 完成定义

1. “需求 / 测试用例”可在项目工作区一级切换。
2. 需求视图切换前后保持原功能和编辑状态。
3. 测试用例视图能加载项目列表并展示所选完整原始 JSON。
4. 点击“关系总览”后才渲染 `TraceabilityExtract`。
5. 返回列表时保留用例选择。
6. 旧 `centerView === 'test-case'` 流程完全消失。
7. 测试用例视图不包含 X6 适配、临时边或 `FlowGraph testcaseView`。
8. 构建、补丁格式和手工回归全部通过。
