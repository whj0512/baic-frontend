# ProjectWorkSpace 平行工作区视图改造总览

## 1. 文档目的

本文定义 `ProjectWorkSpace` 中“需求”与“测试用例”两个平行工作区视图的改造目标、组件边界和实施顺序。相关细节见：

- [01-data-contract.md](./01-data-contract.md)：项目测试用例接口、类型和原始 JSON 展示契约。
- [02-ui-implementation.md](./02-ui-implementation.md)：工作区一级切换、测试用例视图和关系总览子视图。
- [03-verification.md](./03-verification.md)：自动检查、状态保持和交互验收。
- [README.md](./README.md)：文档索引与实施依赖。

## 2. 目标语义

项目工作区包含两个同级视图：

```text
ProjectWorkSpace
├─ 需求视图（默认）
│  ├─ 需求概览
│  ├─ 维度编辑器
│  ├─ 新建需求
│  └─ 需求间关系
└─ 测试用例视图
   ├─ 测试用例列表 + 所选记录原始 JSON（默认）
   └─ 关系总览（点击按钮后渲染 TraceabilityExtract）
```

核心语义是：

- “需求”和“测试用例”属于项目工作区的一级平行视图。
- `centerView` 只描述“需求视图”内部的中心区状态。
- `TraceabilityExtract` 只表示“需求—场景—用例关系总览”，不再表示整个测试用例视图。

## 3. 当前问题

当前实现存在以下语义错位：

- `CenterView` 包含 `'test-case'`，将测试用例错误建模为需求中心区的一个临时页面。
- 需求分组内部的“测试用例”按钮直接执行 `setCenterView('test-case')`。
- `centerView === 'test-case'` 直接渲染 `TraceabilityExtract`。
- `TraceabilityExtract` 内部同时承担关系总览和空测试用例画布两种职责。
- `prevViewStateRef` 被迫同时处理“需求间关系”和“测试用例”返回语义。

## 4. 目标状态

### 4.1 工作区一级状态

在 `ProjectWorkSpace` 新增独立状态：

```ts
type WorkspaceView = 'requirements' | 'testCases'

const [workspaceView, setWorkspaceView] =
  useState<WorkspaceView>('requirements')
```

`WorkspaceView` 与 `CenterView` 不互相复用：

```ts
type CenterView =
  | 'overview'
  | 'editor'
  | 'create'
  | 'create-editor'
  | 'relationship'
```

`'test-case'` 从 `CenterView` 中删除。

### 4.2 组件职责

- `ProjectWorkSpace`
  - 提供项目级“需求 / 测试用例”切换。
  - 继续拥有需求视图的全部原有状态。
  - 将真实 `project.id` 传给项目测试用例视图。
- 新增 `ProjectTestCaseView`
  - 加载并展示当前项目测试用例。
  - 管理用例选择、原始 JSON 展示和内部子视图。
  - 提供“关系总览”按钮。
- `TraceabilityExtract`
  - 只负责调用 `POST /traceability/extract` 并渲染关系总览。
  - 不再加载或渲染测试用例列表、`FlowGraph` 或视图切换按钮。

## 5. 成功标准

- 项目工作区默认进入“需求”视图。
- 用户可在固定的工作区一级入口切换“需求 / 测试用例”。
- “需求”视图原有需求列表、概览、编辑、新建、草稿、版本、发布和需求间关系功能不变。
- “测试用例”视图默认展示项目用例列表和所选用例完整原始 JSON。
- 测试用例视图内点击“关系总览”后才渲染 `TraceabilityExtract`。
- 从关系总览返回时回到测试用例列表，并保留之前的用例选择。
- `centerView === 'test-case'`、旧分组按钮和相关返回逻辑全部移除。
- 两个一级视图切换时不丢失尚未保存的需求编辑状态。

## 6. 范围边界

### 本次包含

- 重构 `ProjectWorkSpace` 的视图状态层级。
- 新增工作区一级视图切换 UI。
- 新增独立 `ProjectTestCaseView` 组件。
- 项目测试用例 GET 请求、列表、原始 JSON 展示和状态反馈。
- 将 `TraceabilityExtract` 收敛为纯关系总览组件。
- 保持两个工作区 pane 的已初始化状态。

### 本次不包含

- 不增加新路由。
- 不修改需求视图的业务规则或接口。
- 不新增测试用例创建、编辑、保存、删除和执行。
- 不修改 `POST /traceability/extract` 的参数和图数据契约。
- 不修改后端、数据库或持久化格式。
- 不把前端推断的展示边写回 `test_content`。

## 7. 总体数据流

```text
ProjectWorkSpace(project.id)
├─ workspaceView = requirements
│  └─ 原有需求工作区
└─ workspaceView = testCases
   └─ ProjectTestCaseView(projectId)
      ├─ 默认子视图：GET /projects/{project_id}/test_cases
      │  ├─ 用例列表
      │  └─ 所选 ProjectTestCase → 格式化原始 JSON
      └─ 关系总览子视图：TraceabilityExtract(projectId)
         └─ POST /traceability/extract
```

## 8. 四阶段实施

### 阶段一：拆分状态语义

- 新增 `WorkspaceView`。
- 从 `CenterView` 删除 `'test-case'`。
- 删除需求分组中的旧“测试用例”按钮。
- 清理 `prevViewStateRef` 中与测试用例有关的职责。

### 阶段二：实现项目测试用例数据层

- 增加项目测试用例 URL 和请求模块。
- 定义类型、结构校验和请求取消。
- 保留接口记录的全部字段，并提供稳定的格式化 JSON 展示。
- 细节见 [01-data-contract.md](./01-data-contract.md)。

### 阶段三：实现平行视图与关系总览入口

- 新增工作区一级切换栏。
- 新增 `ProjectTestCaseView`。
- 将 `TraceabilityExtract` 收敛为关系总览。
- 保留需求 pane 和测试用例 pane 的状态。
- 细节见 [02-ui-implementation.md](./02-ui-implementation.md)。

### 阶段四：回归验证

- 验证需求视图全流程无回归。
- 验证测试用例列表、原始 JSON、关系总览和状态保持。
- 执行构建和补丁格式检查。
- 细节见 [03-verification.md](./03-verification.md)。

## 9. 已锁定决定

- 一级默认视图为 `requirements`。
- 测试用例默认子视图为用例列表和所选记录原始 JSON。
- `TraceabilityExtract` 只能由测试用例视图内的“关系总览”按钮触发。
- 工作区一级切换不经过 `centerView`。
- 测试用例数据范围为整个项目，使用 `project.id`。
- 两个 pane 在首次打开后保持挂载，避免切换导致编辑状态丢失。
- 当前阶段不解析 `test_content.nodes` 或 `transitions`，也不进行 X6 数据适配。
