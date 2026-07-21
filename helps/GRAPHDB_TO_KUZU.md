# GraphDB 到 Kùzu 可视化投影

`graphdb_to_kuzu.py` 将 GraphDB 中的需求实例转换为类型化的 Kùzu 属性图。GraphDB 继续作为 RDF 数据源和推理引擎，Kùzu 库可以随时重新生成，用于 Cypher 查询和图形展示。

## 配置

复制配置示例：

```powershell
Copy-Item DB\kuzu_config.example.json DB\kuzu_config.json
```

默认配置如下：

```json
{
  "database_path": "baic_kuzu.kz",
  "report_path": "kuzu_conversion_report.json",
  "include_inferred": true
}
```

相对路径以配置文件所在的 `backend/DB` 目录为基准。GraphDB 连接仍由 `DB/graphdb_config.json` 管理。

## 运行

先检查提取和映射结果，不生成数据库：

```powershell
python graphdb_to_kuzu.py --dry-run
```

首次生成：

```powershell
python graphdb_to_kuzu.py
```

GraphDB 数据发生变化后，原子重建现有库：

```powershell
python graphdb_to_kuzu.py --replace
```

只转换原生数据、不包含推理结果：

```powershell
python graphdb_to_kuzu.py --explicit-only --replace
```

也可以临时覆盖配置：

```powershell
python graphdb_to_kuzu.py --database D:\graph\baic.kz --graphdb-config DB\graphdb_config.json
```

## 映射规则

- 每个实例只进入其最具体的本体类型对应的节点表，例如 `SystemRequirement` 映射到 `System_Requirement`。
- 完整的 RDF 类型集合保存在节点的 `rdf_types_json` 中，不会因为选择单一 Kùzu 节点表而丢失。
- `identifier`、`name`、`description` 是便于查询的公共字段；全部本体字面量属性保存在 `properties_json` 中，并保留 datatype 和 language。
- 每个本体对象属性映射为一个关系表，例如 `requirementBelongsToModule` 映射为 `REQUIREMENT_BELONGS_TO_MODULE`。
- 关系包含 `origin`、`is_explicit` 和 `is_inferred`，用于区分 `explicit`（原生）、`inferred`（推理）和 `both`。
- 节点的 `origin=inferred` 表示该资源只通过推理类型进入投影；通常业务实例节点本身是 `explicit`。

示例查询：

```cypher
MATCH (requirement:System_Requirement)-[relation]->(target)
RETURN requirement.identifier, label(relation), target.name, relation.origin
LIMIT 50;
```

只查看推理生成的关系：

```cypher
MATCH (source)-[relation]->(target)
WHERE relation.is_inferred = true AND relation.is_explicit = false
RETURN source, relation, target
LIMIT 100;
```

## 数据边界

这是针对当前需求本体的可视化/查询投影，不是 RDF 的全语义无损备份。脚本保留业务实例、实例类型、本体对象属性关系和本体字面量属性，但不会把 OWL 公理、规则、命名图结构和空白节点建成 Kùzu 业务节点。推理仍应在 GraphDB 中完成，然后重新运行脚本刷新 Kùzu。

脚本只读取 GraphDB。写入时先建立临时 Kùzu 文件、核对节点和关系总数，再原子替换目标文件；未指定 `--replace` 时不会覆盖已有库。每次运行的明细会写入 `DB/kuzu_conversion_report.json`。
