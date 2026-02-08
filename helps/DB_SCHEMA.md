数据库模式说明
================



## 概念说明

- IBD (Internal Block Diagram): 系统所处的环境
- ESD (External Sequence Diagram): 与环境的交互
- SC (State Chart): 内部约束
- BDD (Block Definition Diagram): 内部组成
- ISD (Internal Sequence Diagram): 组成模块的响应



表概览
-------
以下表为当前 schema 的核心表：
- `project`
- `requirement`
- `requirement_version`
- `req_relationship`
- `entity`

逐表说明
---------

### project

作用：项目的顶级实体，所有需求都属于某个项目。
关键字段：
- `id` (CHAR(36)) — 必需：主键，项目唯一标识。
- `key` (VARCHAR(100)) — 必需：项目短标识，唯一。
- `name` (TEXT) — 必需：项目显示名称。
- `description` (TEXT) — 可选：项目的详细描述。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间。



### requirement

作用：需求主表，保存每条需求的当前主信息。
关键字段：
- `id` (CHAR(36)) — 必需：主键，需求唯一标识。
- `project_id` (CHAR(36)) — 必需：所属项目外键，引用 `project.id`。
- `current_version_id` (CHAR(36)) — 必需：表示当前最新版本。
- `previous_version_id` (CHAR(36)) — 可选：指向上一个版本的 `requirement_version.id`（便于快速访问上一次快照）。
- `nl_text` (TEXT) — 可选：当前的自然语言描述。
- `dsl_text` (TEXT) — 可选：当前的 DSL 表示文本。
- `graph_IBD` (JSON) — 可选：内部块图 (IBD) 的结构化表示，需求与外部环境实体的关系蕴含在该字段中。
- `graph_ESD` (JSON) — 可选：外部顺序图 (ESD) 的结构化表示。
- `graph_SC` (JSON) — 可选：状态图 (SC) 的结构化表示。
- `graph_BDD` (JSON) — 可选：块定义图 (BDD) 的结构化表示。
- `graph_ISD` (JSON) — 可选：内部顺序图 (ISD) 的结构化表示。
- `created_by` (CHAR(36)) — 必需：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `updated_at` (TIMESTAMP) — 必需：更新时间。



### requirement_version

作用：需求的不可变历史快照表；每次对需求内容修改时应创建新版本记录。
关键字段：
- `id` (CHAR(36)) — 必需：主键，版本记录唯一标识。
- `requirement_id` (CHAR(36)) — 必需：外键，指向 `requirement.id`。
- `version_number` (INT) — 必需：版本号（递增或语义化版本，根据应用约定）。
- `created_by` (CHAR(36)) — 必需：创建该版本的用户标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `nl_text` (TEXT) — 可选：该版本的自然语言描述。
- `dsl_text` (TEXT) — 可选：该版本的 DSL 文本。
- `graph_IBD` (JSON) — 可选：该版本的 IBD。
- `graph_ESD` (JSON) — 可选：该版本的 ESD。
- `graph_SC` (JSON) — 可选：该版本的 SC。
- `graph_BDD` (JSON) — 可选：该版本的 BDD。
- `graph_ISD` (JSON) — 可选：该版本的 ISD。



### entity

作用：外部环境实体，实体可以发送命令、接收数据、维持状态并通过端口通信。
关键字段：
- `id` (CHAR(36)) — 必需：主键，实体唯一标识。
- `project_id` (CHAR(36)) — 必需：所属项目外键，引用 `project.id`，便于按项目分区。
- `name` (VARCHAR(200)) — 必需：实体名称或标识符。
- `type` (VARCHAR(100)) — 可选：实体类型（例如 `device`、`module`、`actor`）。
- `command_sent` (JSON) — 可选：描述该实体通常发送的命令。
- `data_received` (JSON) — 可选：该实体接收的数据示例或模式。
- `status` (VARCHAR(50)) — 可选：当前状态。
- `port` (VARCHAR(50)) — 可选：通信端口或接口标识。
- `properties` (JSON) — 可选：扩展属性或元数据。
- `created_by` (CHAR(36)) — 必需：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间。



### req_relationship

作用：表示需求间的关系。
关键字段：
- `id` (CHAR(36)) — 必需：主键。
- `project_id` (CHAR(36)) — 必需：归属项目，便于按项目分区查询。
- `from_requirement` (CHAR(36)) — 必需：关系起点，指向 `requirement.id`。
- `to_requirement` (CHAR(36)) — 必需：关系终点，指向 `requirement.id`。
- `rel_type` (VARCHAR(50)) — 可选：关系类型字符串（例如 `depends_on`、`refines`、`blocks`）。
- `properties` (JSON) — 可选：关系的扩展属性（例如条件、优先级等）。
- `created_by` (CHAR(36)) — 必需：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。

