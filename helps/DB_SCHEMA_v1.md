数据库模式说明
================

表概览
-------
以下表为当前 schema 的核心表：
- `project`
- `requirement`
- `requirement_version`
- `req_relationship`
- `entity`
- `users`  

逐表说明
---------

### project

作用：项目的顶级实体，所有需求都属于某个项目。
关键字段：
- `id` (CHAR(36)) — 必需：主键，项目唯一标识。
- `key` (VARCHAR(100)) — 必需：项目短标识，唯一。
- `name` (TEXT) — 必需：项目显示名称。
- `description` (TEXT) — 可选：项目的详细描述。
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间。



### requirement

作用：需求主表，保存每条需求的当前主信息。
关键字段：
- `id` (CHAR(36)) — 必需：主键，需求唯一标识。
- `project_id` (CHAR(36)) — 必需：所属项目外键，引用 `project.id`。
- `current_version_id` (CHAR(36)) — 可选：表示当前最新版本（指向 `requirement_version.id`）。
- `previous_version_id` (CHAR(36)) — 可选：指向上一个版本的 `requirement_version.id`（便于快速访问上一次快照）。
- `nl_text` (TEXT) — 可选：当前的自然语言描述。
- `dsl_IBD` (TEXT) — 可选：DSL 表示的 IBD 维度文本/序列化内容。
- `dsl_ESD` (TEXT) — 可选：DSL 表示的 ESD 维度文本/序列化内容。
- `dsl_SC` (TEXT) — 必需/推荐：DSL 表示的 SC 维度文本/序列化内容；当前系统将 DSL 字符串存储在此字段。
- `dsl_BDD` (TEXT) — 可选：DSL 表示的 BDD 维度文本/序列化内容。
- `dsl_ISD` (TEXT) — 可选：DSL 表示的 ISD 维度文本/序列化内容。
- `graph_IBD` (JSON) — 可选：内部块图 (IBD) 的结构化表示，需求与外部环境实体的关系蕴含在该字段中。
- `graph_ESD` (JSON) — 可选：外部顺序图 (ESD) 的结构化表示。
- `graph_SC` (JSON) — 可选：状态图 (SC) 的结构化表示。
- `graph_BDD` (JSON) — 可选：块定义图 (BDD) 的结构化表示。
- `graph_ISD` (JSON) — 可选：内部顺序图 (ISD) 的结构化表示。
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `updated_at` (TIMESTAMP) — 必需：更新时间。

迁移说明：
- 旧的 `dsl_text` 字段已从 schema 中移除；现在 DSL 字符串应写入 `dsl_SC`（或按需写入其它 `dsl_*` 字段）。


### requirement_version

作用：需求的不可变历史快照表；每次对需求内容修改时应创建新版本记录。
关键字段：
- `id` (CHAR(36)) — 必需：主键，版本记录唯一标识。
- `requirement_id` (CHAR(36)) — 必需：外键，指向 `requirement.id`。
- `version_number` (INT) — 必需：版本号（递增或语义化版本，根据应用约定）。
- `created_by` (CHAR(36)) — 可选：创建该版本的用户标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `nl_text` (TEXT) — 可选：该版本的自然语言描述。
- `dsl_IBD` (TEXT) — 可选：该版本的 IBD 维度 DSL 文本/序列化内容。
- `dsl_ESD` (TEXT) — 可选：该版本的 ESD 维度 DSL 文本/序列化内容。
- `dsl_SC` (TEXT) — 可选：该版本的 SC 维度 DSL 文本/序列化内容。
- `dsl_BDD` (TEXT) — 可选：该版本的 BDD 维度 DSL 文本/序列化内容。
- `dsl_ISD` (TEXT) — 可选：该版本的 ISD 维度 DSL 文本/序列化内容。
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
- `created_by` (CHAR(36)) — 可选：创建者标识。
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
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。


### users

作用：保存用户账户信息，用于登陆/注册及认证/权限管理的基础数据。
关键字段：
- `id` (CHAR(36)) — 必需：主键，用户唯一标识。
- `username` (VARCHAR(150)) — 必需：登录名，唯一。
- `email` (VARCHAR(255)) — 可选：用户邮箱，唯一约束建议。
- `password_hash` (VARCHAR(255)) — 必需：密码哈希（不要存明文）。
- `full_name` (VARCHAR(255)) — 可选：用户显示名或真实名。
- `is_active` (TINYINT) — 必需：是否启用账户。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间。
- `last_login` (TIMESTAMP) — 可选：上次登录时间。
