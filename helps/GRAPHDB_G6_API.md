# GraphDB 图数据（AntV G6）接口

## 1. 接口用途

`POST /graphdb/graph` 从 GraphDB 查询需求本体中的实例关系，将 RDF 三元组转换成 AntV G6 5.x 可以直接接收的 `nodes`、`edges` JSON。

数据链路如下：

```text
GraphDB RDF/OWL
    -> FastAPI /graphdb/graph
    -> G6 GraphData { nodes, edges }
    -> 前端 AntvG6GraphRenderer
```

接口只读取 GraphDB，不会执行 SPARQL UPDATE，也不会修改仓库。接口复用应用启动时创建的 `GraphDBClient` 和现有 JWT 鉴权。

## 2. 调用前提

1. GraphDB 已启动，并且 `backend/DB/graphdb_config.json` 指向正确的仓库。
2. 后端应用已经启动，例如：

   ```powershell
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```

3. 启用鉴权时，请求必须携带：

   ```http
   Authorization: Bearer <JWT>
   Content-Type: application/json
   ```

本地开发如果设置 `AUTH_ENABLED=0`，可以不发送 `Authorization`。

## 3. 接口定义

```http
POST /graphdb/graph
Content-Type: application/json
Authorization: Bearer <JWT>
```

### 3.1 请求体字段

| 字段 | 类型 | 默认值 | 限制 | 说明 |
|---|---|---:|---|---|
| `root` | `string \| null` | `null` | 最长 2048 | 根节点。可以是完整资源 IRI，也可以是 `ro:identifier` 的精确值，例如 `Req-UserReq001`。省略时返回一个受数量限制的全局关系子集。 |
| `depth` | `integer` | `1` | 1～3 | 从根节点向入边和出边双向展开的层数。省略 `root` 时该字段不影响全局查询。 |
| `origin` | `string` | `all` | `all`、`explicit`、`inferred`、`both` | 按关系来源精确过滤。`explicit`、`inferred`、`both` 互斥；`all` 返回全部。 |
| `node_types` | `string[]` | `[]` | 最多 50 项 | 节点 RDF 类型过滤。可使用本体局部名或完整 IRI，例如 `SystemRequirement`。关系的两个端点都通过过滤时才保留。 |
| `predicates` | `string[]` | `[]` | 最多 100 项 | 对象属性过滤。可使用局部名或完整 IRI，例如 `requirementBelongsToModule`。 |
| `node_limit` | `integer` | `300` | 1～500 | 最多返回的节点数量。 |
| `edge_limit` | `integer` | `1000` | 1～2000 | 最多返回的关系数量。 |
| `include_properties` | `boolean` | `true` | — | 是否在节点 `data.properties` 中返回本体字面量属性。设为 `false` 时仍会读取 `identifier`、`name`、`description` 供节点显示。 |

`node_types` 和 `predicates` 的完整 IRI 必须属于：

```text
http://example.org/requirement-ontology#
```

这样可以避免客户端通过过滤字段注入任意 SPARQL 片段。

## 4. 请求示例

### 4.1 按需求编号查询两跳关系

```json
{
  "root": "Req-UserReq001",
  "depth": 2,
  "origin": "all",
  "node_limit": 300,
  "edge_limit": 1000,
  "include_properties": true
}
```

PowerShell：

```powershell
$headers = @{
  Authorization = "Bearer <JWT>"
  "Content-Type" = "application/json"
}

$body = @{
  root = "Req-UserReq001"
  depth = 2
  origin = "all"
  node_limit = 300
  edge_limit = 1000
  include_properties = $true
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/graphdb/graph" `
  -Method Post `
  -Headers $headers `
  -Body $body
```

### 4.2 使用完整 IRI，并限定节点和关系类型

```json
{
  "root": "http://example.org/requirement-ontology#Req-UserReq001",
  "depth": 1,
  "node_types": [
    "SystemRequirement",
    "FunctionalModule"
  ],
  "predicates": [
    "requirementBelongsToModule",
    "realizesRequirement"
  ],
  "origin": "all"
}
```

过滤字段也可以写成完整 IRI：

```json
{
  "predicates": [
    "http://example.org/requirement-ontology#requirementBelongsToModule"
  ]
}
```

### 4.3 只查询纯推理关系

```json
{
  "root": "Req-UserReq001",
  "depth": 2,
  "origin": "inferred",
  "include_properties": false
}
```

这里的 `inferred` 是精确分类，不包含 `both`。如需同时展示所有推理可见关系，请使用 `origin: "all"`，然后在前端根据 `edge.data.isInferred` 筛选；`both` 关系的 `isInferred` 也是 `true`。

### 4.4 查询受限的全局关系图

```json
{
  "origin": "all",
  "node_limit": 200,
  "edge_limit": 500,
  "include_properties": false
}
```

全局查询不保证覆盖整个仓库。当结果达到上限时，响应中的 `meta.truncated` 为 `true`。交互式页面更推荐使用 `root` 加 1～2 跳展开。

### 4.5 curl 示例

```bash
curl -X POST "http://127.0.0.1:8000/graphdb/graph" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "root": "Req-UserReq001",
    "depth": 2,
    "origin": "all",
    "predicates": ["requirementBelongsToModule"],
    "node_limit": 100,
    "edge_limit": 300
  }'
```

## 5. 成功响应

```json
{
  "nodes": [
    {
      "id": "http://example.org/requirement-ontology#Req-UserReq001",
      "type": "circle",
      "data": {
        "label": "前/后电机端扭矩限制",
        "name": "前/后电机端扭矩限制",
        "identifier": "Req-UserReq001",
        "description": "需求描述",
        "iri": "http://example.org/requirement-ontology#Req-UserReq001",
        "type": "SystemRequirement",
        "typeIri": "http://example.org/requirement-ontology#SystemRequirement",
        "rdfTypes": [
          "http://example.org/requirement-ontology#Requirement",
          "http://example.org/requirement-ontology#SystemRequirement"
        ],
        "explicitTypes": [
          "http://example.org/requirement-ontology#SystemRequirement"
        ],
        "inferredTypes": [
          "http://example.org/requirement-ontology#Requirement"
        ],
        "origin": "explicit",
        "properties": {
          "name": [
            {
              "value": "前/后电机端扭矩限制",
              "predicateIri": "http://example.org/requirement-ontology#name",
              "language": "zh"
            }
          ]
        }
      },
      "style": {
        "size": 44,
        "fill": "#5B8FF9",
        "stroke": "#FFFFFF",
        "lineWidth": 2,
        "label": true,
        "labelText": "前/后电机端扭矩限制",
        "labelPlacement": "bottom"
      }
    }
  ],
  "edges": [
    {
      "id": "<由 subject/predicate/object 计算的稳定 SHA-256>",
      "source": "http://example.org/requirement-ontology#Req-UserReq001",
      "target": "http://example.org/requirement-ontology#Module001",
      "type": "line",
      "data": {
        "relationType": "requirementBelongsToModule",
        "predicate": "requirementBelongsToModule",
        "predicateIri": "http://example.org/requirement-ontology#requirementBelongsToModule",
        "origin": "inferred",
        "isExplicit": false,
        "isInferred": true
      },
      "style": {
        "stroke": "#F6903D",
        "lineWidth": 2,
        "lineDash": [6, 4],
        "endArrow": true,
        "label": true,
        "labelText": "requirementBelongsToModule"
      }
    }
  ],
  "meta": {
    "root": "http://example.org/requirement-ontology#Req-UserReq001",
    "depth": 2,
    "origin": "all",
    "nodeCount": 25,
    "edgeCount": 42,
    "nodeLimit": 300,
    "edgeLimit": 1000,
    "truncated": false,
    "propertiesTruncated": false,
    "includeProperties": true
  }
}
```

### 5.1 关系来源和默认样式

| `origin` | 含义 | 默认 G6 样式 |
|---|---|---|
| `explicit` | 只存在于显式数据 | 蓝色实线 |
| `inferred` | 只存在于 GraphDB 推理结果 | 橙色虚线 |
| `both` | 同一三元组既显式声明，也可推导 | 紫色实线 |

接口分别查询显式数据和 GraphDB 隐式推理图，再以 `(source, predicate, target)` 为键合并分类。

### 5.2 截断标记

- `meta.truncated=true`：节点、关系或底层查询已经达到上限，响应不是完整子图。
- `meta.propertiesTruncated=true`：节点或关系仍然完整，但字面量属性数量达到保护上限。

前端应在任一标记为 `true` 时提示用户缩小深度或增加过滤条件。

## 6. 前端调用

项目已经提供：

- `API_ENDPOINTS.graphdbGraph`
- `fetchGraphDBGraph(request)`
- `GraphDBGraphRequest`、`GraphDBGraphResponse` 类型

React 示例：

```tsx
import { useEffect, useState } from 'react'
import type { GraphDBGraphResponse } from '../models/GraphDBGraph'
import { fetchGraphDBGraph } from '../config/graphdbGraph'
import AntvG6GraphRenderer from '../components/ReqRelationShip/graph-renderers/AntvG6GraphRenderer'

function GraphDBView() {
  const [graphData, setGraphData] = useState<GraphDBGraphResponse | null>(null)

  useEffect(() => {
    fetchGraphDBGraph({
      root: 'Req-UserReq001',
      depth: 2,
      origin: 'all',
      node_limit: 300,
      edge_limit: 1000,
    }).then(setGraphData).catch(console.error)
  }, [])

  if (!graphData) return <div>正在加载……</div>
  return <AntvG6GraphRenderer graphData={graphData} />
}
```

响应顶层就是 G6 `GraphData`，因此不需要再次把 RDF bindings 转换成节点和边。`meta` 是额外信息，G6 会忽略它。

## 7. 错误响应

| HTTP 状态码 | 情况 | 示例 |
|---:|---|---|
| `401` | 缺少或无效 JWT | `{"detail":"Missing or invalid Authorization header"}` |
| `404` | `root` 是 identifier，但没有对应资源 | `{"detail":"GraphDB resource not found for identifier: Req-X"}` |
| `422` | 请求字段越界、过滤 IRI 非法、identifier 重复 | FastAPI 校验详情或 `{"detail":"..."}` |
| `502` | GraphDB 拒绝查询或返回无效结果 | `{"detail":"GraphDB returned HTTP ..."}` |
| `503` | GraphDB 客户端未初始化或仓库无法连接 | `{"detail":"..."}` |

## 8. 性能建议

1. 页面初次加载使用 `depth=1`，用户点击节点时再查询 1～2 跳。
2. 常规交互图建议控制在 300 个节点、1000 条关系以内。
3. 只展示名称时设置 `include_properties=false`。
4. 优先使用 `predicates` 和 `node_types` 缩小图，而不是直接提高上限。
5. 接口是实时读取 GraphDB；GraphDB 数据或推理结果变化后无需重新生成 Kùzu 文件。
