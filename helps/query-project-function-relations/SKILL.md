---
name: query-project-function-relations
description: 只读查询场景 10 已输出到项目目录的功能关系 JSON，并把结构化工具结果交给 Agent Web 客户端渲染外挂面板。用于用户在场景 10 完成后要求查看某一功能的关系类型、起点、终点、证据、置信度或统计时；不重新查询 GraphDB，不生成或修改关系文件。
---

# 查询场景 10 功能关系结果

只读取用户明确提供的项目根目录中，由场景 10 生成的
`<function_name>-relation.json`。不得访问 GraphDB、重新执行查询或修改源文件。

## 输入契约

必须取得：

- `project_root`：用户明确提供的绝对项目目录；
- `function_name`：场景 10 输出文件使用的完整功能名。

缺少任一输入时先向用户询问。不得根据当前目录、相似文件或历史消息猜测绝对路径或功能名。

## 执行流程

1. 定位当前 Skill 目录。
2. 在一个独立的 `execute_shell_command` 调用中执行：

   ```text
   python scripts/query_function_relations.py --project-root "<absolute-path>" --function-name "<function-name>"
   ```

3. 该 Shell 命令只能运行上述查询脚本，不得用 `&&`、`&`、`;`、`|`
   串联文件生成、读取、修复脚本或其他程序。
4. 保留脚本标准输出作为工具结果，不得修改、包装或复制其中的 JSON。
5. 读取工具结果的 `status` 和 `data.summary`。若脚本返回错误，直接报告错误，
   不得创建、修复或覆盖源结果后重试。
6. 发送一条简短的最终文本，只报告统计；详细内容由客户端外挂面板展示。

## 工具结果契约

脚本标准输出必须且只能是一个 UTF-8 JSON 对象：

- `protocol_version` 固定为 `1.0`；
- `panel` 固定为 `function-relations`；
- `status` 为 `success` 或 `error`；
- `source_file` 仅包含文件名，不包含本地绝对路径；
- 成功时 `data` 包含生成信息、项目显示名、查询条件、统计和关系数组；
- 失败时 `data=null`，并在 `error.code`、`error.message` 中提供稳定错误；
- `warnings` 始终为数组。

客户端通过工具命令中的唯一脚本名 `query_function_relations.py` 识别卡片。
不得把脚本改名，也不得用 `call_id` 作为卡片类型。

## 最终回答

成功时只输出一行统计，例如：

```text
已读取轮端扭矩限制关系结果：关系 6 条，声明关系 6 条，推理关系 0 条，关系类型 5 种。
```

失败时固定输出：

```text
场景 10 功能关系结果查询失败：错误 1 项。
```

最终文本不得包含 JSON、绝对路径、关系明细、IRI 或证据正文。

## 调用模板

完整模板：

```text
请使用 $query-project-function-relations，只读查询项目根目录
<project_root> 中功能 <function_name> 的场景 10 关系结果。
不要访问 GraphDB、重新查询或修改文件；详细结果交给外挂面板，最终回答只给统计。
```

简写：

```text
$query-project-function-relations project_root="<absolute-path>" function_name="<function-name>"
```

## 安全边界

- 只读取项目根目录下一个确定文件，不递归搜索。
- 拒绝相对项目路径、空功能名、路径分隔符、路径越界、符号链接越界和超大文件。
- 不读取其他 JSON，不调用 GraphDB、QwenPaw API 或场景 10 查询脚本。
- 不创建、修复、覆盖或删除任何项目文件。
- 工具结果不返回项目绝对路径，并移除源 JSON 中可能存在的路径字段。
