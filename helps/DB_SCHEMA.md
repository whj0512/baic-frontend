数据库模式说明
================

表概览
-------
以下表为当前 schema 的核心表：
- `req_project`
- `req_requirement`
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

作用：需求主表，每次修改插入一条新行作为新版本，使用 `requirement_group_id` 将同一逻辑需求的不同版本归并。
关键字段：
- `id` (CHAR(36)) — 必需：主键，表示某一版本行的唯一标识（也可视为 version_id）。
- `name` (VARCHAR(200)) — 必需：需求名称。
- `description` (TEXT) — 可选：需求的简要描述。
- `requirement_group_id` (CHAR(36)) — 必需：逻辑需求 id，所有属于同一需求的版本行共享该值。
- `version_code` (INT) — 必需：版本号（按每次更新递增）。
- `project_id` (CHAR(36)) — 必需：所属项目外键，引用 `project.id`。
- `nl_text` (TEXT) — 可选：该版本的自然语言描述。
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
- `type` (VARCHAR(50)) — 可选：需求级别/类型，可取值 'component'（部件级）或 'system'（系统级）；用于在依赖/匹配算法中区分不同粒度的需求。
- `subtype` (VARCHAR(100)) — 可选：需求子类型字符串，便于对需求进行更细粒度的分类。
- `created_by` (CHAR(36)) — 可选：创建该版本的用户标识。
- `created_at` (TIMESTAMP) — 必需：版本创建时间。
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