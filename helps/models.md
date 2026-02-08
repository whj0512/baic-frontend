# JSON 格式说明


总体结构（顶层）
- id (string) — 必需：图的唯一标识，对应 DSL 的 `Graph <id>`。
- desc (string) — 可选：图的描述，对应 DSL 的 `desc "..."`。
- graph_type (string) — 可选：图类型，常见值 `request` 或 `testcase`，对应 DSL 中 `type` 部分。
- nodes (array) — 必需（可为空数组）：节点数组，每项为一个对象，详见下文节点部分。
- transitions (array) — 必需（可为空数组）：迁移（边）数组，每项为一个对象，详见下文迁移部分。

约定
- 节点对象必须包含 `id`（字符串）和 `type_name`（字符串）。
- 迁移对象通常应包含 `id`、`source_node`、`target_node`。
- 可视化字段（如 `render_config`、`ports`、`x/y/width/height`）会被忽略，不影响 DSL 生成。

节点（nodes）类型与字段

每个节点对象中常见字段：
- id (string) — 必需，节点唯一 ID，映射为 DSL 的节点名。
- type_name (string) — 必需，节点类型（下列之一）：
  - `start`、`then` — 映射为 `Start` / `Then` 节点
  - `state` — 映射为 `State`
  - `condition` — 映射为 `Condition`
  - `call` — 映射为 `Call`
  - `comment` — 映射为 `Comment`
  - `graph-ref` — 映射为 `GraphRef`
  - `truth` — 映射为 `TruthTable`
  - `goto` — 映射为 `Goto`
- desc (string) — 可选，节点描述

针对每种 type_name 的字段说明：

1) start / then
- 必要字段：`id`, `type_name`（值为 `start` 或 `then`）
- 可选：`desc`）

2) state
- 常用字段：
  - `desc` (string)
  - `pre_think_time` (number)
  - `post_think_time` (number)
  - `entry_action_list`, `exit_action_list`, `during_action_list`, `normal_test_action_list`, `dynamic_test_action_list`（数组，元素结构见代码中 ActionItem）
  - `forward_propagation` (boolean)

3) condition
- 必选/常用字段：
  - `condition` (string) — 条件表达式（例如 `x>0`）
  - `branch_yes` (string) — yes 分支目标节点 ID（例如 `A`）
  - `branch_no` (string) — no 分支目标节点 ID（例如 `B`）
  - `time_tolerance` (object) — 可选，如 `{ "type": "percent", "value": 5 }`

4) call（调用/脚本节点）
- 常用字段：
  - `params_list` (array of {label, value})
  - `in_list` (array of strings)
  - `return_list` (array of strings)
  - `script` (string)
  - `enable_inverse` (boolean), `inverse_script` (string)
  - `tolerance_type`/`tolerance_value`, `time_related_step`/`time_related_duration`

5) comment
- 字段：`comment` (string)、`desc`

6) graph-ref
- 字段：`graph_id`, `params_list`, `has_return_val`, `return_val`
- DSL: `GraphRef <id> graph_id:"..."` 等

7) truth
- 字段：`truthTable`，示例结构：
  - `truthTable.header`：字符串数组
  - `truthTable.body`：数组，每项为 `{ "targetNode": { "id": "...", "name": "..." }, "list": [true, false, ...] }`

8) goto
- 字段：`friend`：`{ "id": "<friendNodeId>", "name": "<desc>" }`
- DSL: `Goto <id> friend_node:<friendNodeId>`

迁移（transitions）字段
- id (string) — 必需，迁移的唯一标识
- source_node (string) — 必需，源节点 ID
- target_node (string) — 必需，目标节点 ID
- desc (string) — 可选
- loop_times (int) — 可选，对应 DSL 中的 `loop` 字段
- time_tolerance (object) — 可选，例如 `{ "type": "percent", "value": 5 }`
- condition (string) — 可选

生成 DSL 的规则（要点）
- 顶层 `id` -> `Graph <id> type <graph_type> desc "<desc>"`
- 每个 node 根据 `type_name` 生成相应的 DSL 行（Start/State/Condition/Call 等）
- 转换器在构造 Transition 时使用 `{'name': source_node}` 的包装，所以在 DSL 中会生成 `Transition <id> from:<source> to:<target>`

示例（完整 JSON，存放于 `examples/condcall_rbg.json`）

```json
{
  "id": "CondCall",
  "desc": "CondCall",
  "graph_type": "request",
  "nodes": [
    { "id": "S", "type_name": "state", "desc": "START" },
    { "id": "A", "type_name": "state", "desc": "A" },
    { "id": "B", "type_name": "state", "desc": "B" }
  ],
  "transitions": [
    { "id": "T1", "source_node": "S", "target_node": "A" },
    { "id": "T2", "source_node": "A", "target_node": "B" }
  ]
}
```

