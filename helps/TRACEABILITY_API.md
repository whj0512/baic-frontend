# 需求—场景—测试用例三级关联接口

默认服务地址为 `http://127.0.0.1:8000`。本文说明替换算法后的依赖接口和三级关联接口。

## 1. `POST /dependency`

旧 URL 保持不变，默认使用新版 `FineDependencyManager`。

按项目读取需求图：

```json
{
  "project_id": "a244115a-9e93-47e7-a3ba-e377d1c44423",
  "granularity": "fine",
  "include_paths": true
}
```

直接传入需求图：

```json
{
  "graphs": [
    {"id": "req-001", "name": "需求一", "nodes": [], "transitions": []}
  ],
  "granularity": "fine",
  "include_paths": true
}
```

- `project_id`：从 SQLite 读取项目内各需求最新版本下的全部 SC 模型；旧数据回退到
  `graph_SC` 主图。
- `graphs`：直接提供 SC 图数组；与 `project_id` 二选一。既可以直接传图对象，也可以
  传入包含 `graph_SC`、`graph_json` 或 `graph` 的包装对象。
- `granularity`：`fine`（默认）或 `coarse`。
- `include_paths`：是否返回路径，只支持 `fine`。

响应示例：

```json
{
  "granularity": "fine",
  "dependencies": [
    {
      "dependent_graph": "需求二",
      "depended_graph": "需求一",
      "dependent_path_id": "req-002_path_0",
      "depended_path_id": "req-001_path_0",
      "data_name": "READY_LAMP"
    }
  ],
  "paths": []
}
```

其中 `depended_path_id` 是数据生产方，`dependent_path_id` 是消费方。按项目读取时，
图和路径 ID 对应 `model_group_id`，而不是需求 ID，因此同一需求下的多张 SC 图会分别
参与计算。

## 2. 按方案二保存测试用例

### `POST /test_cases`

`test_content` 保存完整 `.executeCase.rbg` JSON；`traceability_input` 保存同名的
“图和节点关系”JSON。服务端会自动把后者放入 `properties.traceability_input`。

```json
{
  "project_id": "a244115a-9e93-47e7-a3ba-e377d1c44423",
  "name": "209_2_1_1_P5_OTARefrshPwrOnOffDem_path0_Case1",
  "test_content": {
    "graph_type": "executeCase",
    "nodes": [],
    "transitions": []
  },
  "traceability_input": {
    "case_info": [],
    "test_case": [
      {
        "sender_part": {
          "graph_id": "08b3aeb0-9067-11f0-b370-13ea7bc9de9f",
          "transition_id": ["transition-001"]
        },
        "receiver_part": {
          "graph_id": "08b3aeb0-9067-11f0-b370-13ea7bc9de9f",
          "id": "state-002"
        }
      }
    ],
    "graph_ids": [],
    "graph_calls": {}
  }
}
```

响应中的数据库记录实际结构为：

```json
{
  "test_content": {"graph_type": "executeCase", "nodes": [], "transitions": []},
  "properties": {
    "traceability_input": {"test_case": []}
  }
}
```

查询接口：

- `GET /test_cases/{test_case_id}`：查询一个测试用例。
- `GET /projects/{project_id}/test_cases`：查询项目下的全部测试用例。

对于两个目录不能按文件名配对的文件，应先确认缺失文件。只有关系 JSON、没有 RBG 的
记录不建议冒充完整可执行测试用例。

### 批量导入成对文件

仓库提供了可重复执行的 `import_test_case_pairs.py`。它按文件名配对，首次执行时新增，
再次执行时更新同一项目下的同名用例，不会重复插入：

```powershell
python import_test_case_pairs.py `
  --project "0515-209" `
  --rbg-dir "C:\Users\lenovo\Desktop\0515-209\209-用例图" `
  --mapping-dir "C:\Users\lenovo\Desktop\图和节点关系\图和节点关系" `
  --report "DB\test_case_import_report.json"
```

导入记录还会在 `properties.source_files` 保存两个源文件路径和 SHA-256，便于检查来源与
后续更新。缺少任意一侧的文件只会进入报告，不会写入不完整测试用例。

## 3. `POST /traceability/extract`

该接口依次执行需求路径提取、依赖分析、场景生成、测试用例路径匹配和三级关系生成，
同时返回可直接交给 G6 的数据。

### 推荐用法：读取一个项目

```json
{
  "project_id": "a244115a-9e93-47e7-a3ba-e377d1c44423",
  "response_mode": "graph",
  "minimum_path_score": 0.35,
  "minimum_scenario_coverage": 0.5,
  "include_singletons": true,
  "persist": false
}
```

服务会从 SQLite 读取该项目各需求的最新版本、这些版本下的全部 SC 模型以及测试用例。
分析过程中以 `model_group_id` 区分图，同时保留 `requirement_group_id` 作为需求归属。

### 调试用法：直接传入图和测试用例

```json
{
  "graphs": [
    {"id": "req-001", "name": "需求一", "nodes": [], "transitions": []}
  ],
  "test_cases": [
    {
      "id": "tc-001",
      "name": "正常分支测试",
      "test_content": {
        "graph_type": "executeCase",
        "nodes": [],
        "transitions": []
      },
      "properties": {
        "traceability_input": {
          "test_case": [
          {
            "sender_part": {
              "graph_id": "req-001",
              "transition_id": "transition-001"
            },
            "receiver_part": {
              "graph_id": "req-001",
              "id": "state-002"
            }
            }
          ]
        }
      }
    }
  ],
  "response_mode": "relations",
  "minimum_path_score": 0.35,
  "minimum_scenario_coverage": 0.5,
  "include_singletons": true,
  "persist": false
}
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `project_id` | string | 无 | 从 SQLite 读取项目需求和用例 |
| `graphs` | array | 无 | 直接传入 SC 图或模型包装对象，存在时优先于 `project_id` |
| `test_cases` | array | 无 | 直接传入用例，省略时按 `project_id` 读取 |
| `response_mode` | string | `graph` | 响应模式：`graph`、`relations` 或 `debug` |
| `minimum_path_score` | number | `0.35` | 路径匹配最低分，范围 0～1 |
| `minimum_scenario_coverage` | number | `0.5` | 用例覆盖场景路径的最低比例 |
| `include_singletons` | boolean | `true` | 无跨需求依赖的单条路径是否形成场景 |
| `persist` | boolean | `false` | 是否回写 SQLite 已有用例的关联结果 |

必须提供 `project_id` 或 `graphs`。直接传入但不存在于 SQLite 的测试用例，即使
`persist=true` 也只计算，不会自动新增记录。

### 响应模式

- `graph`（默认）：只返回 `summary`、`g6` 和 `persistence`，供前端渲染使用。
- `relations`：返回需求、场景、精简测试用例、依赖、路径匹配和三级关系，不返回完整
  RBG、完整关系输入和完整路径元素。
- `debug`：返回所有原始输入、中间路径和诊断证据；数据量很大，只建议排查问题时使用。

`persist=true` 的写库行为不受响应模式影响。服务始终先完成提取和持久化，再按模式裁剪响应。

### 匹配规则

路径得分综合节点/条件/迁移 ID 命中率、测试步骤顺序和路径覆盖率。迁移 ID 权重高于
节点 ID；零命中的路径不会被选择。每个 `graph_id` 选择得分最高且超过阈值的路径。

场景是路径依赖图的连通分量。场景 ID 根据路径和依赖边稳定计算，相同输入会得到相同 ID。
每个场景的 `model_ids` 表示参与场景的 SC 模型，`requirement_ids` 表示这些模型所属的
需求；一条需求可以对应多个 `model_ids`。

### 默认 `graph` 响应

```json
{
  "response_mode": "graph",
  "summary": {
    "requirement_count": 2,
    "path_count": 3,
    "dependency_count": 1,
    "scenario_count": 2,
    "test_case_count": 1,
    "matched_test_case_count": 1
  },
  "g6": {"nodes": [], "edges": []},
  "persistence": {"requested": false, "persisted_test_case_ids": []}
}
```

### `relations` 响应字段

```json
{
  "response_mode": "relations",
  "summary": {},
  "requirements": [],
  "scenarios": [],
  "test_cases": [{"id": "tc-001", "name": "正常分支测试"}],
  "dependencies": [],
  "path_matches": {},
  "relations": {
    "requirement_scenario": [],
    "scenario_test_case": [],
    "requirement_test_case": []
  },
  "persistence": {"requested": false, "persisted_test_case_ids": []}
}
```

`debug` 模式在上述关系数据之外，还会返回 `paths`、完整 `test_cases.test_content`、
`test_cases.traceability_input` 和 `g6`。

- `requirement_scenario`：场景包含某需求的路径。
- `scenario_test_case`：用例达到场景覆盖阈值，包含 `coverage` 和 `confidence`。
- `requirement_test_case`：经已匹配场景推导出的需求—用例关系。

### 持久化

`persist=true` 时会合并更新 `req_test_case.related_requirements` 和
`req_test_case.related_scenarios`，并把路径得分及场景证据写入
`properties.traceability`。已有手工关联不会被删除。

### G6 使用

```ts
graph.setData(response.g6)
graph.render()
```

节点 `data.kind` 为 `requirement`、`scenario`、`testCase`；边 `data.relation` 为
`PART_OF_SCENARIO` 或 `COVERED_BY`。

## 4. 常见无结果原因

- 需求图 `id` 与测试步骤 `graph_id` 不一致。
- 测试步骤中的节点或迁移 ID 不是 `graph_SC` 的原始 ID。
- 生产方和消费方变量名称不一致，未形成跨图依赖。
- 两个最低阈值设置过高。
- `include_singletons=false` 且没有提取到跨需求依赖。
- RBG 已存入 `test_content`，但没有把配套关系 JSON 存入
  `properties.traceability_input`。
