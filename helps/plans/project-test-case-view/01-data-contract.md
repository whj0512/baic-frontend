# 项目测试用例数据契约与原始 JSON 展示计划

## 1. 关联文档

- 总览：[00-overview.md](./00-overview.md)
- UI 实施：[02-ui-implementation.md](./02-ui-implementation.md)
- 验收计划：[03-verification.md](./03-verification.md)
- 接口依据：[../../TRACEABILITY_API.md](../../TRACEABILITY_API.md)

## 2. 数据层归属

项目测试用例数据层归属于新的 `ProjectTestCaseView`，不归属于 `TraceabilityExtract`。

建议目录：

```text
packages/webview/src/components/ProjectTestCaseView/
├─ ProjectTestCaseView.tsx
├─ ProjectTestCaseView.css
├─ projectTestCasesApi.ts
├─ types.ts
└─ index.ts
```

`TraceabilityExtract` 继续保留自己的：

- `traceabilityExtractApi.ts`
- `traceabilityExtractGraphData.ts`
- `types.ts`
- G6 graph renderer

两类接口和状态不得合并。

## 3. 项目测试用例接口

使用：

```http
GET /projects/{project_id}/test_cases
```

在 `packages/webview/src/config/api.ts` 增加：

```ts
projectTestCases: (projectId: string) =>
  `${SERVICE_BASE_URL}/projects/${encodeURIComponent(projectId)}/test_cases`
```

`ProjectWorkSpace` 将初始化后的 `project.id` 传给 `ProjectTestCaseView`。不得用 `project.key`、项目名称或未经初始化确认的路由参数替代。

## 4. 前端类型与原始字段保留

```ts
type JsonPrimitive = string | number | boolean | null

type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue }

interface ProjectTestCase {
  id: string
  name: string | null
  project_id: string
  test_content?: JsonValue
  related_requirements?: JsonValue
  related_scenarios?: JsonValue
  properties?: JsonValue
  created_by?: JsonValue
  created_at?: JsonValue
  updated_at?: JsonValue
  [key: string]: JsonValue | undefined
}
```

当前阶段不把 `test_content` 细分为节点和迁移类型。接口记录在 JSON 解析后完整保留，右侧详情展示整个 `ProjectTestCase`，而不是只展示 `test_content`。

## 5. 请求模块

对外提供：

```ts
fetchProjectTestCases(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectTestCase[]>
```

固定行为：

1. 使用 `authFetch(API_ENDPOINTS.projectTestCases(projectId), { signal })`。
2. 不设置请求体，不调用写接口。
3. 非 2xx 优先读取 JSON `detail`。
4. 无详情时使用 `获取项目测试用例失败（HTTP {status}）`。
5. JSON 无法解析时抛出明确错误。
6. 响应结构无效时整批请求失败，不静默丢弃记录。
7. `AbortError` 不显示为业务错误。

## 6. 运行时校验

至少校验：

- 顶层是数组。
- 每条记录是对象。
- `id` 和 `project_id` 是非空字符串。
- `name` 是字符串或 `null`。
- 记录可以被 `JSON.stringify` 正常格式化。

不校验 `test_content.graph_type`、`nodes` 或 `transitions` 的内部结构，以便先忠实展示接口生数据。接口未被 UI 使用的扩展字段必须原样保留。

## 7. 请求生命周期

生命周期由 `ProjectTestCaseView` 管理：

- `ProjectTestCaseView` 第一次成为活动一级 pane 时才挂载和请求。
- 请求成功后，组件在当前 `projectId` 下保存列表。
- 从测试用例切回需求视图时，组件保持挂载，列表和选择不清空。
- 从用例列表进入关系总览时，列表请求状态保持不变。
- 从关系总览返回列表时，不重新请求 GET。
- `projectId` 变化时取消旧请求并清空列表、选择、错误和 loaded 标记。
- 显式重试创建新 `AbortController`，旧请求不得覆盖新状态。

关系总览的 POST 请求仍由 `TraceabilityExtract` 独立管理，只有该子视图首次渲染时才发起。

## 8. 原始 JSON 展示契约

所选记录使用：

```ts
const formattedJson = JSON.stringify(selectedTestCase, null, 2)
```

展示要求：

- 展示完整记录，包括 `id`、`name`、`project_id`、`test_content`、关联字段、属性和时间字段。
- 使用两个空格缩进，不重排对象字段。
- 不裁剪大数组或长字符串。
- JSON 容器独立横向和纵向滚动。
- 使用等宽字体并保留空格、换行。
- 内容通过文本节点渲染，不使用 `dangerouslySetInnerHTML`。
- 不提供编辑入口，不把格式化文本回写状态。
- 当前阶段不导入 `FlowGraph`，不注册 `testcaseView` 节点，也不生成临时边。

如果 `JSON.stringify` 意外失败，右侧显示“当前测试用例数据无法格式化”，列表和关系总览入口仍可使用。

## 9. 与 TraceabilityExtract 的边界

`TraceabilityExtract` 不得：

- 导入 `FlowGraph`。
- 导入项目测试用例 GET 请求。
- 保存 `ProjectTestCase[]`。
- 管理所选测试用例。
- 在自身内部提供“查看测试用例”切换。

`TraceabilityExtract` 只接收：

```ts
interface TraceabilityExtractProps {
  projectId: string
  onBack?: () => void
}
```

并只负责关系总览的加载、重试、空态、数量角标和 G6 渲染。

## 10. 阶段完成条件

- GET 与 POST 数据层完全分离。
- URL 使用编码后的真实 `project.id`。
- GET 支持取消、重试、错误详情和运行时校验。
- 所选接口记录可以完整、稳定地格式化为原始 JSON。
- 实现中不存在测试用例 X6 数据适配器或临时边逻辑。
- `TraceabilityExtract` 不再包含任何测试用例列表或 `FlowGraph` 逻辑。
