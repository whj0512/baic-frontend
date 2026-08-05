# 需求维度多模型验证计划

## 1. 关联文档

- 总索引：[README.md](./README.md)
- 数据契约：[00-contract-and-boundaries.md](./00-contract-and-boundaries.md)
- 状态与持久化：[01-workspace-state-and-persistence.md](./01-workspace-state-and-persistence.md)
- UI 实施：[02-ui-and-editor-implementation.md](./02-ui-and-editor-implementation.md)

## 2. 自动检查

### 生产构建

```powershell
npm run build:webview
```

要求 Vite 构建退出码为 0。若环境报告 `spawn EPERM`，必须区分沙箱子进程限制和代码编译错误。

### 补丁格式

```powershell
git diff --check
```

要求无行尾空格、冲突标记和空白错误。

### 旧保存路径扫描

```powershell
rg -n "API_ENDPOINTS\.requirements.*requirement\.id|graph_IBD|dsl_IBD" packages/webview/src/components/DimensionEditor
```

人工确认：

- 需求模型编辑器不再直接调用旧需求 PUT。
- `requirement.dsl_IBD` 不再是可编辑 ESD/ISD 的固定上下文来源。
- 合法的只读兼容或映射定义匹配可以保留。

按仓库约定不运行 `eslint` 和 `tsc --noEmit`。

## 3. 数据加载验收

| 编号 | 场景 | 预期结果 |
|---|---|---|
| D01 | 选择普通需求 | GET `/requirements/{id}/models` 一次，展示完整模型集合 |
| D02 | 快速切换两个需求 | 前一个请求取消/失效，不覆盖后一个需求模型 |
| D03 | GET 失败 | 基础概览仍可用，模型区域显示详情和重试 |
| D04 | 重试成功 | 错误清除，模型列表恢复 |
| D05 | 选择 NEW 或无需求 | 不发送模型 GET |
| D06 | 接口返回坏模型记录 | 整次模型加载失败，不静默丢记录 |
| D07 | 未迁移历史需求 | 服务端兼容模型正常显示为主模型 |

检查所有模型行：

- `name` 可见。
- `model_type` 可见，null 显示“未设置类型”。
- `model_key` 可见且长值不溢出。
- `is_primary` 的 radio 和徽标与接口一致。

## 4. 元数据 CRUD 验收

| 编号 | 场景 | 预期结果 |
|---|---|---|
| M01 | 新增模型 | 必填名称和业务键，可填类型；首次保存调用 POST models |
| M02 | 编辑名称 | PUT 后列表、编辑器标题和刷新结果一致 |
| M03 | 编辑类型 | 字符串保存；清空后发送 null 并显示未设置 |
| M04 | 编辑业务键 | PUT 后新值可见且刷新保留 |
| M05 | 名称/业务键空白 | 前端阻止提交并定位字段 |
| M06 | 同维度重复业务键 | 前端阻止；绕过后的服务端冲突也保留表单 |
| M07 | 不同维度相同业务键 | 按数据库唯一范围允许提交 |
| M08 | Mutation 返回无 models | 自动 GET，最终集合正确 |

## 5. 主模型验收

| 编号 | 场景 | 预期结果 |
|---|---|---|
| P01 | 每维度第一张模型 | 创建期自动成为主模型 |
| P02 | 新增第二张模型 | 默认非主模型 |
| P03 | 选择另一张 radio | 只调用一次 `/primary`，最终只有目标模型为主 |
| P04 | 点击当前主模型 | 不发送请求 |
| P05 | 快速连续切换 | 操作期间禁用同维度 radio，不产生竞态版本 |
| P06 | 删除非主模型 | 主模型不变 |
| P07 | 删除主模型且有剩余 | 显示确认，结果采用后端选出的新主模型 |
| P08 | 删除维度最后一张模型 | 维度变为未定义，旧兼容字段由后端清空 |

额外确认切换主模型后：

- `Requirement` 列表中的旧 `dsl_*` / `graph_*` 经 WebSocket diff 更新。
- 再打开旧前端/只读兼容路径时看到新的主模型。

## 6. 编辑器验收

| 编号 | 场景 | 预期结果 |
|---|---|---|
| E01 | 打开同维度模型 A | 加载 A 的 DSL/Graph 和四个业务字段 |
| E02 | 切换到模型 B | 编辑器重建为 B，不残留 A 的 refs/snapshot |
| E03 | 保存已有模型 | 调用模型 PUT，不调用旧需求 PUT |
| E04 | 保存新模型 | 首次 POST 成功后转为 model_group_id 身份 |
| E05 | POST/PUT 失败 | 保留 dirty 状态、编辑内容和重试能力 |
| E06 | 保存后返回 | 不再弹未保存确认 |
| E07 | 未保存返回 | 保存/丢弃/取消语义与当前实现一致 |
| E08 | 编辑模型 | 不修改需求级 nl_text，不产生额外需求版本 |

验证 Artifact 模式：

- Agent Workspace 的 `DimensionEditor mode="artifact"` 继续本地编辑。
- 不调用需求模型 API。
- `onDraftChange` 和视觉禁用语义不变。

## 7. IBD 上下文验收

| 编号 | 场景 | 预期结果 |
|---|---|---|
| C01 | 没有 IBD 新建 ESD/ISD | 禁止并提示先创建 IBD |
| C02 | 只有一个 IBD | 自动选择该模型 |
| C03 | 多个 IBD | 必须由用户选择，表单显示名称和 model_key |
| C04 | 编辑已有 ESD/ISD | 恢复其 context_model_group_id |
| C05 | 上下文引用失效 | 显示错误，重新选择前禁止转换和保存 |
| C06 | DSL-to-RBG | 请求使用选中 IBD 的 dsl_text，不固定使用主 IBD |
| C07 | 删除被引用 IBD | 显示依赖警告并正确呈现后端结果/错误 |

创建期特别验证：

- 创建草稿存在多个 IBD 时，ESD/ISD 转换只使用本地主 IBD。
- 创建期 UI 不允许绑定尚无持久化 ID 的非主 IBD。
- 请求不把前端 `clientId` 当作 `context_model_group_id` 发送。
- 创建请求每个非空维度主模型唯一，ESD/ISD 省略 context，由后端按主 IBD 推断。
- 创建成功后可以通过模型 PUT 把 ESD/ISD 改绑到任意持久化 IBD。

## 8. RequirementCreator 验收

| 编号 | 场景 | 预期结果 |
|---|---|---|
| N01 | 同维度新增两张模型 | 两条独立草稿和编辑器内容 |
| N02 | 编辑四个业务字段 | 返回创建器后全部值保留 |
| N03 | 切换主模型 | 同维度始终只有一个 true |
| N04 | 删除主模型 | 自动选择第一个剩余模型 |
| N05 | 创建需求 | 单次 POST 携带 dimension_models，不重复发送五维固定字段 |
| N06 | 存在未完成模型 | 阻止创建并定位具体模型 |
| N07 | 创建失败 | 保留基础表单、模型元数据和 DSL/Graph |
| N08 | 创建成功 | 清理创建草稿和所有 modelIdentity 编辑器草稿 |

旧草稿迁移：

- 旧 `sectionData/sectionDslData` 每个有内容维度转换为一张主模型。
- 默认名称和业务键可见、可修改且同维度不重复。
- 迁移后不同模型草稿键不会互相覆盖。

## 9. WebSocket 与竞争条件

| 编号 | 场景 | 预期结果 |
|---|---|---|
| W01 | 远端编辑当前模型 | requirement_updated 后刷新 models 并显示最新值 |
| W02 | 远端编辑非当前需求 | 不请求当前模型列表以外的数据 |
| W03 | 本地保存随后收到 WS | 可二次 GET，但最终状态与后端一致 |
| W04 | 编辑中模型被远端删除 | 退出编辑器并明确提示 |
| W05 | GET 进行中删除需求 | 请求取消，旧模型不残留 |
| W06 | Mutation 与需求切换并发 | 响应不写入新需求状态 |

## 10. 兼容回归

逐项确认：

- 需求基础信息名称、类型和自然语言描述编辑。
- 需求删除、发布和关系视图。
- 左侧需求列表和 WebSocket 连接状态。
- UI 级 DialogMap 创建、概览和编辑路径。
- 只读发布快照使用旧固定字段打开维度。
- 右侧版本面板不因模型状态改造崩溃。
- 长需求名和长模型字段不产生横向溢出。
- 旧固定字段仍随主模型变化显示正确内容。

## 11. 最终清单

- [ ] `RequirementModel` 类型和 API 模块为单一数据契约。
- [ ] 五维模型可以完整 CRUD。
- [ ] `name`、`model_type`、`model_key`、`is_primary` 均可见且可编辑。
- [ ] 同维度主模型唯一，并使用 `/primary` 切换。
- [ ] ESD/ISD 使用具体 IBD 上下文。
- [ ] 新建需求使用 `dimension_models` 一次提交。
- [ ] 模型草稿按稳定身份隔离并兼容旧创建草稿。
- [ ] WebSocket 更新和请求竞争处理正确。
- [ ] 历史需求、DialogMap、Artifact 模式和只读快照无回归。
- [ ] `npm run build:webview` 成功。
- [ ] `git diff --check` 成功。
- [ ] 未运行 `eslint` 和 `tsc --noEmit`。
