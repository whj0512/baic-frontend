---
name: query-project-ontology-qa-results
description: 只读查询场景 9 已输出到项目目录的本体关系推理 JSON，并把结构化工具结果交给 Agent Web 客户端渲染外挂面板。用于用户在场景 9 完成后要求查看数据依赖、写冲突、状态机问题、场景问题、关系证据、统计或根因分析时；不重新执行推理，不访问或修改 GraphDB。
---

# 查询场景 9 本体推理结果

只读取用户明确提供的项目根目录中，由场景 9 生成的
`<repository_name>-ontology-qa.json`。不得运行推理脚本、搜索其他目录或修改源文件。

## 输入契约

必须取得：

- `project_root`：用户明确提供的绝对项目目录；
- `repository_name`：场景 9 使用的 GraphDB 仓库名称。

缺少任一输入时先向用户询问，不得根据当前目录、历史消息或项目名称猜测绝对路径。

## 执行流程

1. 定位当前 Skill 目录。
2. 在一个独立的 `execute_shell_command` 调用中执行：

   ```text
   python scripts/query_ontology_qa_results.py --project-root "<absolute-path>" --repository-name "<repository-name>"
   ```

3. 该 Shell 命令只能运行上述查询脚本，不得用 `&&`、`&`、`;`、`|`
   串联结果生成、文件读取、修复脚本或其他程序。
4. 保留脚本标准输出作为工具结果，不得修改、包装或复制其中的 JSON。
5. 读取工具结果的 `status` 和 `data.summary`。若脚本返回错误，直接报告错误，
   不得创建、修复或覆盖源结果后重试。
6. 发送一条简短的最终文本，只报告统计；详细内容由客户端外挂面板展示。

## 工具结果契约

脚本标准输出必须且只能是一个 UTF-8 JSON 对象：

- `protocol_version` 固定为 `1.0`；
- `status` 为 `success` 或 `error`；
- `source_file` 仅包含文件名，不包含本地绝对路径；
- 成功时 `data` 包含 `schema_version`、生成信息、项目显示名、`summary`、四类结果数组和 `root_cause_analysis`；
- 失败时 `data=null`，并在 `error.code`、`error.message` 中提供稳定错误；
- `warnings` 始终为数组。

客户端通过工具命令中的唯一脚本名 `query_ontology_qa_results.py` 识别卡片。不得把脚本改名，也不得用 `call_id` 作为卡片类型。

## 最终回答

成功时只输出一行统计，例如：

```text
已读取场景 9 推理结果：推理关系 4 条，数据依赖 2 条，写冲突 1 条，状态机问题 1 项，场景问题 3 项。
```

失败时固定输出：

```text
场景 9 推理结果查询失败：错误 1 项。
```

最终文本不得包含 JSON、绝对路径、关系明细、证据或根因分析正文。

## 调用模板

完整模板：

```text
请使用 $query-project-ontology-qa-results，只读查询项目根目录
<project_root> 中 GraphDB 仓库 <repository_name> 的场景 9 本体推理结果。
不要重新推理、修改文件或访问 GraphDB；详细结果交给外挂面板，最终回答只给统计。
```

简写：

```text
$query-project-ontology-qa-results project_root="<absolute-path>" repository_name="<repository-name>"
```

## 安全边界

- 只读取项目根目录下一个确定文件，不递归搜索。
- 拒绝相对项目路径、空仓库名、路径分隔符、路径越界、符号链接越界和超大文件。
- 不读取其他 JSON，不调用 GraphDB、QwenPaw API 或本体推理脚本。
- 不创建、修复、覆盖或删除任何项目文件。
- 工具结果不返回项目绝对路径，并移除源 JSON 的 `project` 路径字段。
