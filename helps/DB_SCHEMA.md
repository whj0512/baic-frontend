数据库模式说明
================

表概览
-------
以下表为当前 schema 的核心表：
- `req_project`
- `req_requirement`
- `req_requirement_model`
- `req_relationship`
- `req_device`
- `req_controller`
- `req_protocol`
- `req_regulation`  
- `req_regulation_relationship`  
- `req_test_case`

逐表说明
---------

### req_project

作用：项目的顶级实体，所有需求都属于某个项目。
关键字段：
- `id` (CHAR(36)) — 必需：主键，项目唯一标识。
- `key` (VARCHAR(100)) — 必需：项目短标识，唯一。
- `name` (TEXT) — 必需：项目显示名称。
- `description` (TEXT) — 可选：项目的详细描述。
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间。



### req_requirement

作用：需求主表，每次修改插入一条新行作为新版本，使用 `requirement_group_id` 将同一逻辑需求的不同版本归并。该表中的各维度 DSL/图字段同时作为旧接口的兼容字段，保存对应维度的主模型；同一维度的全部模型存储在 `req_requirement_model`。
关键字段：
- `id` (CHAR(36)) — 必需：主键，表示某一版本行的唯一标识（也可视为 version_id）。
- `name` (VARCHAR(200)) — 必需：需求名称。
- `description` (TEXT) — 可选：需求的简要描述。
- `requirement_group_id` (CHAR(36)) — 必需：逻辑需求 id，所有属于同一需求的版本行共享该值。
- `version_code` (INT) — 必需：版本号（按每次更新递增）。
- `project_id` (CHAR(36)) — 必需：所属项目外键，引用 `project.id`。
- `nl_text` (TEXT) — 可选：该版本的自然语言描述。
- `dsl_IBD` (TEXT) — 可选：当前版本 IBD 主模型的 DSL 兼容副本。
- `dsl_ESD` (TEXT) — 可选：当前版本 ESD 主模型的 DSL 兼容副本。
- `dsl_SC` (TEXT) — 可选：当前版本 SC 主模型的 DSL 兼容副本。
- `dsl_BDD` (TEXT) — 可选：当前版本 BDD 主模型的 DSL 兼容副本。
- `dsl_ISD` (TEXT) — 可选：当前版本 ISD 主模型的 DSL 兼容副本。
- `graph_IBD` (JSON) — 可选：当前版本 IBD 主模型的图 JSON 兼容副本。
- `graph_ESD` (JSON) — 可选：当前版本 ESD 主模型的图 JSON 兼容副本。
- `graph_SC` (JSON) — 可选：当前版本 SC 主模型的图 JSON 兼容副本。
- `graph_BDD` (JSON) — 可选：当前版本 BDD 主模型的图 JSON 兼容副本。
- `graph_ISD` (JSON) — 可选：当前版本 ISD 主模型的图 JSON 兼容副本。
- `type` (VARCHAR(50)) — 可选：需求级别/类型，可取值 'component'（部件级）或 'system'（系统级）；用于在依赖/匹配算法中区分不同粒度的需求。
- `subtype` (VARCHAR(100)) — 可选：需求子类型字符串，便于对需求进行更细粒度的分类。
- `created_by` (CHAR(36)) — 可选：创建该版本的用户标识。
- `created_at` (TIMESTAMP) — 必需：版本创建时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间。

兼容规则：

- 新代码以 `req_requirement_model` 为多模型数据源，并将每个维度
  `is_primary = true` 的模型同步到本表对应的 `dsl_*` 和 `graph_*` 字段。
- 尚未写入模型表的历史需求仍可从本表固定字段读取。首次通过多模型写接口修改时，
  服务端会将这些固定字段透明迁移为模型记录。
- 旧前端继续读取本表时，每个维度仍只看到一张主图；新前端通过模型接口读取全部图。


### req_requirement_model

作用：存储需求各维度的一对多模型。一个需求版本的 IBD、ESD、SC、BDD、ISD、UI
维度都可以包含多条模型记录；每条记录严格对应一份 DSL 和一份图 JSON。

模型身份分为两层：

- `id` 标识某个需求版本中的模型行。需求生成新版本时会创建新的模型行和新的 `id`。
- `model_group_id` 标识跨需求版本的同一个逻辑模型。模型被复制到新需求版本时该值保持
  不变。

关键字段：

- `id` (CHAR(36)) — 必需：模型版本行主键。
- `model_group_id` (CHAR(36)) — 必需：逻辑模型 ID，用于跨需求版本跟踪同一张图。
- `requirement_version_id` (CHAR(36)) — 必需：所属需求版本，外键引用
  `req_requirement.id`；删除需求版本时级联删除其模型行。
- `requirement_group_id` (CHAR(36)) — 必需：所属逻辑需求 ID，与
  `req_requirement.requirement_group_id` 对应，便于直接按需求查询模型。
- `dimension_code` (VARCHAR(16)) — 必需：模型维度。当前转换和接口支持
  `IBD`、`ESD`、`SC`、`BDD`、`ISD`、`UI`；UI 对应 DialogMap。
- `model_type` (VARCHAR(100)) — 可选：业务模型类型；当前不额外限定取值。
- `name` (VARCHAR(200)) — 必需：模型显示名称。
- `model_key` (VARCHAR(200)) — 必需：模型业务键；在同一需求版本、同一维度内唯一。
- `dsl_text` (LONGTEXT) — 必需：模型 DSL。即使客户端只提交图，服务端也会先自动
  转换出 DSL 后再写入。
- `graph_json` (JSON) — 必需：模型图结构。即使客户端只提交 DSL，服务端也会先自动
  转换出图后再写入。因此 DSL 与图在模型行内严格一对一。
- `source_representation` (VARCHAR(16)) — 必需：本次模型最初由 `dsl`、`graph` 或
  `both` 提供；默认值为 `both`。
- `context_model_group_id` (CHAR(36)) — 可选：ESD/ISD 所依赖的 IBD
  `model_group_id`。该字段用于在同一需求存在多个环境模型时确定转换上下文。
- `converter_version` (VARCHAR(100)) — 可选：生成缺失表示时所用转换器版本。
- `is_primary` (BOOLEAN/TINYINT) — 必需：是否为所属需求版本、所属维度的主模型。
  每个存在模型的维度必须且只能有一个主模型。
- `sort_order` (INT) — 必需：同维度内的展示顺序，默认 `0`。
- `source_path` (TEXT) — 可选：原始 DSL/图文件的相对路径或来源路径。
- `metadata` (JSON) — 可选：扩展元数据，例如导入信息和旧数据迁移标记。
- `created_by` (CHAR(36)) — 可选：创建或更新该模型版本的用户标识。
- `created_at` (TIMESTAMP) — 必需：模型版本创建时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间。

约束与索引：

- 主键：`id`。
- 唯一约束：`(requirement_version_id, dimension_code, model_key)`。
- 外键：`requirement_version_id -> req_requirement.id ON DELETE CASCADE`。
- `model_group_id` 建有索引，用于跨版本查找逻辑模型。
- `(requirement_group_id, dimension_code)` 建有联合索引，用于按需求和维度查询。
- SQLite 使用部分唯一索引保证
  `(requirement_version_id, dimension_code)` 最多只有一条 `is_primary = 1` 记录。
- MySQL 初始化结构未使用部分唯一索引，主模型唯一性由后端事务逻辑保证。

UI 兼容说明：

- UI 模型与其他维度一样在模型表中同时保存 `dsl_text` 和 `graph_json`。
- `req_requirement` 历史主表没有 `dsl_UI`、`graph_UI` 固定字段，因此 UI 主模型不会
  镜像到旧字段；必须通过需求模型接口读取。

版本与删除规则：

- 更新需求时，上一版本的全部模型复制到新需求版本，再应用本次新增、修改或删除。
- 新版本中的模型行使用新 `id`，但逻辑模型继续使用原 `model_group_id`。
- 删除模型只影响新生成的需求版本，不修改历史版本。
- 删除某维度主模型后，如果仍有其他模型，按 `sort_order`、创建时间和 `id`
  自动选择新的主模型；如果没有剩余模型，则清空 `req_requirement` 中该维度的兼容字段。

数据库差异：

- MySQL 使用 `JSON`、`LONGTEXT`、`CHAR(36)` 和 `TIMESTAMP` 类型。
- SQLite 将 UUID、DSL、JSON 和时间字段存为 `TEXT`，并通过 `json_valid` 检查
  `graph_json` 和 `metadata` 的 JSON 合法性。
- SQLite 后端会在运行时以幂等方式创建缺失的 `req_requirement_model` 表和索引。
  已部署的 MySQL 数据库应单独执行 `mysql_init.sql` 中新增表的 `CREATE TABLE` 片段，
  不应为迁移而重新执行包含 `DROP TABLE` 的完整初始化脚本。


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






### req_device
作用：存储设备、模块等外部实体信息。
关键字段：
- `id` (CHAR(36)) — 必需：主键，设备唯一标识。
- `name` (VARCHAR(200)) — 必需：设备名称。
- `type` (VARCHAR(100)) — 可选：设备类型。
- `ports` (JSON) — 可选：设备端口数组。
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间，默认当前时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间，更新时自动刷新为当前时间。
- `properties` (JSON) — 可选：设备扩展属性。

### req_controlUnit
作用：存储控制器核心信息，计时器、端口、扩展属性等均以 JSON 格式存储。
关键字段：
- `id` (CHAR(36)) — 必需：主键，控制器唯一标识。
- `name` (VARCHAR(200)) — 必需：控制器名称。
- `model` (VARCHAR(100)) — 可选：控制器型号。
- `period` (INT) — 可选：控制器周期。
- `ports` (JSON) — 可选：控制器端口数组，存储端口配置、通信方式等信息。
- `timers` (JSON) — 可选：计时器列表。
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间，默认当前时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间，更新时自动刷新为当前时间。
- `properties` (JSON) — 可选：控制器扩展属性

### req_protocol
作用：存储协议的定义与配置信息，涵盖协议规格、类型、端点等核心属性。
关键字段：
- `id` (CHAR(36)) — 必需：主键，协议唯一标识。
- `name` (VARCHAR(200)) — 必需：协议名称。
- `data` (JSON) — 可选：组成该协议表的数据项和数据项对应的含义。
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间，默认当前时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间，更新时自动刷新为当前时间。
- `properties` (JSON) — 可选：协议扩展属性。



### req_regulation

作用：存储法规/标准/规范等外部法规实体，便于将法规条款与需求进行映射和追溯。
关键字段：
- `id` (CHAR(36)) — 必需：主键，法规唯一标识。
- `regulation_number` (VARCHAR(200)) — 可选：法规编号或标准号（例如 GB/T xxxx、ISO xxxx）。
- `title` (TEXT) — 必需：法规/标准的标题或名称。
- `description` (TEXT) — 可选：法规的摘要或描述。
- `jurisdiction` (VARCHAR(100)) — 可选：适用地区。
- `effective_date` (DATE) — 可选：生效日期。
- `expiry_date` (DATE) — 可选：失效/废止日期。
- `source_url` (TEXT) — 可选：法规来源或在线链接。
- `clauses` (JSON) — 可选：法规条款结构化表示。
- `tags` (JSON) — 可选：用于分类、检索的标签数组。
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：记录创建时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间。
- `properties` (JSON) — 可选：扩展属性，用于存放额外的元数据。


### req_regulation_relationship

作用：表示法规与需求之间的关系，用于表明某条法规如何约束、引用或被需求实现。
关键字段：
- `id` (CHAR(36)) — 必需：主键。
- `regulation_id` (CHAR(36)) — 必需：指向 `req_regulation.id`，表示被关联的法规实体。
- `requirement_group_id` (CHAR(36)) — 可选：指向逻辑需求 `req_requirement.requirement_group_id`，将法规关联到某一个逻辑需求（跨版本）。
- `requirement_id` (CHAR(36)) — 可选：指向具体需求版本 `req_requirement.id`，当需要精确到某一版本时使用。
- `rel_type` (VARCHAR(50)) — 可选：关系类型。
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间。
- `properties` (JSON) — 可选：关系的扩展属性。

### req_test_case
作用：存储测试用例，每条记录为一个测试用例版本或条目，测试用例内容以 JSON 格式直接存储，便于在前端/自动化里直接读写和执行。
关键字段：
- `id` (CHAR(36)) — 必需：主键，测试用例唯一标识。
- `name` (VARCHAR(200)) — 可选：用例名称或简短描述。
- `project_id` (CHAR(36)) — 可选：所属项目，便于按项目分区查询（外键引用 `req_project.id`）。
- `test_content` (JSON) — 必需：测试用例的主要内容，存为结构化 JSON，例如包含输入、期望输出、前置条件、步骤等。
- `related_requirements` (JSON) — 可选：与该用例关联的需求 id 或 name 列表。
- `related_scenarios` (JSON) — 可选：与该用例关联的测试场景 id 列表（字符串数组）。
- `properties` (JSON) — 可选：扩展属性，用于存放额外元数据（例如标签、执行环境、自动化脚本引用等）。
- `created_by` (CHAR(36)) — 可选：创建者标识。
- `created_at` (TIMESTAMP) — 必需：创建时间，默认当前时间。
- `updated_at` (TIMESTAMP) — 必需：最后更新时间，更新时自动刷新为当前时间。
