---
name: query-project-ontology-instances
description: 只读打开当前 BAIC 项目的本体实例关系图。用于用户要求查看当前项目的本体实例、知识图谱、实例关系、需求关系图或 GraphDB 关系数据时，通过固定工具调用通知 Agent Web 客户端加载 ReqRelationShip 外挂卡片；不直接查询、修改或复制 GraphDB 数据。
---

# 查询当前项目本体实例

使用固定工具调用通知 Agent Web 客户端加载当前项目的本体实例关系图。项目身份和实时数据均由客户端从当前会话上下文取得。

## 执行流程

1. 定位当前 Skill 目录。
2. 执行：

   ```text
   python scripts/emit_ontology_instance_panel.py
   ```

3. 保留脚本标准输出作为工具结果。不得修改、包装或复制其中的 JSON。
4. 工具调用完成后，只发送一条简短的最终文本，例如：

   ```text
   已加载当前项目的本体实例关系图。
   ```

## 工具结果契约

脚本标准输出必须且只能是一个 UTF-8 JSON 对象：

```json
{
  "protocol_version": "1.0",
  "panel": "req-relationship",
  "status": "ready",
  "query": {
    "root": null,
    "depth": 1,
    "origin": "all",
    "node_limit": 200,
    "edge_limit": 500,
    "include_properties": false
  },
  "error": null
}
```

该对象仅描述卡片及初始查询条件，不包含项目 ID、需求数据或 GraphDB 图数据。

## 边界

- 只读，不创建、修改或删除项目、需求、本体或 GraphDB 数据。
- 不自行猜测、读取或输出 `project_id`；客户端使用当前会话中的项目上下文。
- 不直接调用 `/projects/{project_id}/requirements` 或 `/graphdb/graph`。
- 不把工具 JSON、节点、关系或属性复制到最终 assistant 文本。
- 当前会话没有项目上下文时仍执行固定工具调用，由客户端显示缺少项目的错误状态。
