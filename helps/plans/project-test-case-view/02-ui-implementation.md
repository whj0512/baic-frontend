# ProjectWorkSpace 平行视图与测试用例 UI 实施计划

## 1. 关联文档

- 总览：[00-overview.md](./00-overview.md)
- 数据契约：[01-data-contract.md](./01-data-contract.md)
- 验收计划：[03-verification.md](./03-verification.md)

## 2. ProjectWorkSpace 状态重构

### 2.1 新增一级视图

```ts
type WorkspaceView = 'requirements' | 'testCases'

const [workspaceView, setWorkspaceView] =
  useState<WorkspaceView>('requirements')
```

`workspaceView` 只负责项目工作区一级切换。

### 2.2 收敛 CenterView

```ts
type CenterView =
  | 'overview'
  | 'editor'
  | 'create'
  | 'create-editor'
  | 'relationship'
```

执行以下清理：

- 删除 `'test-case'`。
- 删除 `centerView === 'test-case'` 的渲染分支。
- 删除需求分组内部的“测试用例”按钮。
- 删除 `prevViewStateRef` 注释和逻辑中对 test-case 的处理。
- 右侧版本面板隐藏条件不再包含 `'test-case'`。
- `ExperimentOutlined` 若不再被其他需求视图功能使用，则从旧位置移除。

`centerView === 'relationship'` 和 `restorePreviousCenterView` 继续只服务“需求间关系”。

## 3. 工作区一级切换栏

在 `ProjectWorkSpace` 内容顶部增加固定的项目视图切换栏，提供：

- “需求”
- “测试用例”

建议使用 Ant Design `Segmented` 或具备 `role="tablist"` 的等价按钮组。默认选中“需求”。

切换栏位于需求三栏布局和测试用例整页布局之外：

```text
ProjectWorkSpacePage
├─ WorkspaceViewSwitcher
└─ WorkspaceViewBody
   ├─ RequirementsPane
   └─ TestCasesPane
```

整体页面高度仍为 `calc(100vh - 60px)`；切换栏占用固定高度，body 使用 `flex: 1; min-height: 0`，内部 pane 不再各自重复计算整屏高度。

## 4. Pane 挂载与状态保持

为了保证“需求视图下保留原先定义的功能”，采用保持挂载策略：

- `RequirementsPane` 从页面初始化起始终挂载。
- `TestCasesPane` 在用户第一次切换到测试用例后才挂载。
- 首次挂载后，两个 pane 仅通过活动 class、`hidden` 和 `aria-hidden` 控制显示，不因切换被卸载。
- 隐藏 pane 不响应鼠标或键盘操作。

这样可保留：

- 当前选择的需求。
- `centerView` 和 `editingSection`。
- 新建需求表单与草稿恢复流程。
- `DimensionEditor` 当前图和本地编辑状态。
- 需求间关系返回状态。
- 测试用例列表、所选用例原始 JSON 和关系总览子视图。

需求视图中的既有 X6 编辑器和关系总览中的 G6 从隐藏恢复时，需要触发容器尺寸刷新或重新适配视口，避免在 `display: none` 后出现零尺寸画布。测试用例生 JSON 面板不涉及图形实例。

## 5. 需求视图

需求 pane 内完整保留当前：

- 左侧需求分组、需求选择、删除、新建和发布。
- 中间需求概览、维度编辑、新建需求、创建编辑器和需求间关系。
- 右侧版本面板及折叠行为。
- WebSocket 同步、草稿恢复和保存边界。

唯一移除的是旧需求分组内“测试用例”入口，因为测试用例已提升为一级平行视图。

## 6. ProjectTestCaseView

新增：

```text
packages/webview/src/components/ProjectTestCaseView/
```

Props：

```ts
interface ProjectTestCaseViewProps {
  projectId: string
  active: boolean
}
```

内部子视图：

```ts
type TestCaseViewMode = 'cases' | 'traceability'
```

默认固定为 `'cases'`。

### 6.1 用例列表子视图

布局：

```text
┌────────────────────────────────────────────────────┐
│ 项目测试用例                    [关系总览]          │
├────────────────┬───────────────────────────────────┤
│ 用例列表        │ 所选用例完整原始 JSON             │
│ Case A         │ {                                 │
│ Case B         │   "id": "...", ...                │
│                │ }                                 │
└────────────────┴───────────────────────────────────┘
```

列表规则：

- 首次进入测试用例一级视图时加载 GET 接口。
- 保留接口数组顺序。
- 成功后默认选中第一条。
- 列表项展示名称、更新时间和节点数量。
- 名称为空时回退到 ID。
- 列表独立滚动。

右侧详情：

```tsx
<pre className="project-test-case-json">
  <code>{JSON.stringify(selectedTestCase, null, 2)}</code>
</pre>
```

- 展示完整 `ProjectTestCase`，不只展示 `test_content`。
- 使用文本渲染和等宽字体，不使用 HTML 注入。
- JSON 区域独立横向、纵向滚动。
- 不提供编辑、保存、折叠字段或数据裁剪。
- 无选择时显示“请选择一个测试用例”。

### 6.2 关系总览子视图

用例列表页头提供“关系总览”按钮：

```ts
setMode('traceability')
```

仅当 `mode === 'traceability'` 时渲染：

```tsx
<TraceabilityExtract
  projectId={projectId}
  onBack={() => setMode('cases')}
/>
```

行为：

- 第一次点击后才发起 `POST /traceability/extract`。
- `TraceabilityExtract` 页面中的返回按钮文案改为“返回测试用例”。
- 返回后保留测试用例列表、选择和原始 JSON 滚动容器。
- 测试用例一级 pane 隐藏再恢复时，内部 mode 保持不变；用户回到测试用例时仍看到离开前的子视图。

## 7. TraceabilityExtract 收敛

删除以下内容：

- `showTestCaseGraph`。
- `FlowGraph` import。
- `EyeOutlined` 和“查看测试用例 / 返回关系图”按钮。
- `.tc-testcase-viewer*` 和 `.tc-testcase-graph-wrap` 样式。

保留：

- `projectId` 和可选 `onBack`。
- 关系图请求、取消、重试和错误处理。
- G6 数据适配和渲染。
- “需求-场景-用例关系总览”标题和数量角标。
- 空关系状态。

## 8. 加载与错误状态

`ProjectTestCaseView` 独立处理：

| 状态 | 展示 |
|---|---|
| 首次加载 | “正在加载项目测试用例...” |
| GET 失败 | 错误详情和“重试” |
| 空数组 | “当前项目暂无测试用例” |
| 无选择 | “请选择一个测试用例” |
| JSON 格式化失败 | “当前测试用例数据无法格式化” |

`TraceabilityExtract` 独立处理 POST 的 loading、error、retry 和 empty，不复用 GET 状态。

## 9. 项目变化

当 `projectId` 变化：

- `ProjectWorkSpace` 将一级视图重置为 `'requirements'`。
- `ProjectTestCaseView` 取消旧 GET 并清空列表、选择和错误。
- `ProjectTestCaseView` 内部 mode 重置为 `'cases'`。
- `TraceabilityExtract` 的旧 POST 请求随卸载或 prop 变化取消。
- 新项目首次进入测试用例时才重新加载 GET。

## 10. CSS 与响应式

- 新增项目页外层 column 容器和一级切换栏样式。
- 原 `.workspace-container` 改为填满切换栏下方 body，不改变三栏比例。
- 测试用例 pane 填满 body。
- 大于 `900px`：测试用例列表与 JSON 详情左右排列。
- 小于等于 `900px`：列表与 JSON 详情上下排列，两个区域独立滚动。
- 隐藏 pane 设置不可聚焦和不可交互。
- 长用例名称不引发横向溢出。
- JSON 使用 `white-space: pre`，由详情容器承担横向滚动。
- `TraceabilityExtract` 删除固定 `720px` 测试用例 viewer 样式后继续填满父容器。

## 11. 阶段完成条件

- `WorkspaceView` 与 `CenterView` 职责完全分离。
- 旧 `centerView === 'test-case'` 流程不存在。
- 需求视图切换前后保持原有状态和功能。
- 测试用例视图默认展示列表和所选完整原始 JSON。
- 关系总览只能从测试用例视图按钮进入。
- `TraceabilityExtract` 只包含关系总览。
- 实现中不包含测试用例 X6 适配或 `FlowGraph testcaseView`。
- 两个 pane 的布局、既有图形尺寸刷新和键盘可访问性正常。
