# 平行需求与测试用例视图验证计划

## 1. 关联文档

- 总览：[00-overview.md](./00-overview.md)
- 数据契约：[01-data-contract.md](./01-data-contract.md)
- UI 实施：[02-ui-implementation.md](./02-ui-implementation.md)

## 2. 自动检查

### 生产构建

```powershell
npm run build:webview
```

要求 Vite 构建退出码为 0。若出现 `spawn EPERM`，先区分环境子进程限制与代码错误。

### 补丁格式

```powershell
git diff --check
```

要求无行尾空格、冲突标记和空白错误。

### 旧语义扫描

```powershell
rg -n "centerView === 'test-case'|setCenterView\\('test-case'\\)|'test-case'" packages/webview/src/pages/ProjectWorkSpace.tsx
```

要求没有与旧测试用例中心视图相关的匹配。

按仓库约定不运行 `eslint` 和 `tsc --noEmit`。

## 3. 一级视图验收

| 编号 | 场景 | 预期结果 |
|---|---|---|
| W01 | 打开项目工作区 | 默认选中“需求” |
| W02 | 切换到测试用例 | 显示项目用例列表与所选原始 JSON，不渲染 TraceabilityExtract |
| W03 | 切回需求 | 原选择需求、centerView 和编辑 section 保持 |
| W04 | 再次进入测试用例 | 列表、选择和内部子视图保持 |
| W05 | 切换项目 | 一级视图重置为需求，旧项目用例不残留 |
| W06 | 键盘切换 | 一级切换控件可聚焦并正确标识选中状态 |

## 4. 需求视图回归

逐项确认：

- 需求列表分组、展开和选择。
- 长名称布局。
- 新建需求和新建维度编辑。
- 需求概览和五维 section 进入。
- 现有需求维度编辑及返回。
- 草稿恢复和异常关闭恢复。
- 删除需求。
- 发布项目。
- WebSocket 状态和列表同步。
- 版本面板展开、折叠和内容显示。
- “需求间关系”进入与返回。

额外检查：

- 需求分组中不再出现旧“测试用例”按钮。
- 切换到测试用例不会将 `centerView` 改为不存在的值。
- 从测试用例返回后不会意外回到默认 overview，除非用户原本就在 overview。
- 编辑中的 `DimensionEditor` 不因一级切换被卸载。

## 5. 测试用例列表与原始 JSON 验收

| 编号 | 场景 | 预期结果 |
|---|---|---|
| T01 | 尚未打开测试用例 pane | 不请求 GET 项目用例 |
| T02 | 首次打开 | 使用真实 `project.id` 请求一次 GET |
| T03 | 加载成功 | 显示全部记录并默认选择第一条 |
| T04 | 切换记录 | 原始 JSON 同步切换，无前一条残留 |
| T05 | 切换回需求再返回 | 不重复 GET，保留选择 |
| T06 | 空数组 | 显示“当前项目暂无测试用例” |
| T07 | GET 失败 | 显示错误详情和重试 |
| T08 | 重试成功 | 错误清除，列表与原始 JSON 恢复 |

原始 JSON 检查：

- 展示所选完整记录，不只展示 `test_content`。
- 缩进固定为两个空格。
- 接口字段顺序和内容不被转换或裁剪。
- `nodes`、`transitions`、`properties` 等嵌套字段原样可见。
- 长 JSON 可以横向和纵向滚动。
- JSON 内容只读，不出现表单控件或保存按钮。
- 页面不导入或渲染 `FlowGraph testcaseView`。
- 不生成临时边，不解释 `nodes` 或 `transitions`。

## 6. 关系总览子视图验收

| 编号 | 场景 | 预期结果 |
|---|---|---|
| R01 | 默认进入测试用例 | 不发送 `POST /traceability/extract` |
| R02 | 点击“关系总览” | 首次渲染 TraceabilityExtract 并发送 POST |
| R03 | POST 加载成功 | 显示原需求—场景—用例 G6 关系图 |
| R04 | 点击“返回测试用例” | 回到列表，原选择保持 |
| R05 | POST 失败 | 只影响关系总览，列表 GET 状态不丢失 |
| R06 | 返回列表后再打开 | 按组件保持策略复用或重新渲染关系图，但不得影响列表 |

检查 `TraceabilityExtract`：

- 不再导入 `FlowGraph`。
- 不再出现“查看测试用例”按钮。
- 不再持有 `showTestCaseGraph`。
- 不再包含测试用例 viewer CSS。
- 标题、角标、loading、empty、error 和 retry 仍正常。

## 7. 状态保持与显示尺寸

### 需求编辑状态

在 `DimensionEditor` 中修改未保存内容后切换一级视图：

- 不丢失当前图、DSL 或本地表单状态。
- 不触发虚假的返回、保存或丢弃行为。
- 切回需求后画布尺寸正常。

### 测试用例状态

选择非第一条用例并进入关系总览，再切换到需求后返回：

- 仍停留在关系总览。
- 点击返回后仍选中原测试用例。
- 列表和 JSON 详情滚动位置尽量保持。

### 图尺寸

- 隐藏后恢复的 X6 需求编辑图尺寸正确。
- 隐藏后恢复的 G6 关系图尺寸正确。
- 隐藏后恢复的 JSON 详情尺寸和滚动正常。
- 既有图形不出现宽高为 0、挤在左上角或画布空白。

## 8. 请求竞争

- 测试用例 GET 进行中切回需求，不出现卸载后状态更新。
- 项目变化时旧 GET 被取消。
- 关系总览 POST 进行中切换项目时旧请求被取消。
- 旧项目响应不得覆盖新项目状态。
- GET 错误不得覆盖 POST 错误，反之亦然。

## 9. 响应式与只读

桌面端：

- 一级切换栏固定可见。
- 需求视图保持原三栏布局。
- 测试用例列表与 JSON 详情左右排列。

小于等于 `900px`：

- 一级切换栏不溢出。
- 需求视图沿用原响应式布局。
- 测试用例列表与 JSON 详情上下排列。

只读要求：

- 原始 JSON 只通过文本节点展示。
- 不出现 JSON 编辑器或可编辑输入框。
- 不发送 POST、PUT、PATCH 或 DELETE 测试用例请求。

## 10. 最终清单

- [ ] `WorkspaceView` 与 `CenterView` 已分离。
- [ ] 旧 `'test-case'` centerView 流程已删除。
- [ ] 工作区一级“需求 / 测试用例”切换可用。
- [ ] 需求视图所有既有功能无回归。
- [ ] 测试用例列表和完整原始 JSON 可用。
- [ ] 测试用例视图不存在 X6 数据适配和临时边逻辑。
- [ ] `TraceabilityExtract` 仅作为关系总览子视图。
- [ ] 两个 pane 切换时状态和显示尺寸正常。
- [ ] GET 与 POST 请求生命周期互不干扰。
- [ ] `npm run build:webview` 成功。
- [ ] `git diff --check` 成功。
- [ ] 未运行 `eslint` 和 `tsc --noEmit`。
