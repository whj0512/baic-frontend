# AgentStore 本体建模工作流实施计划

## 1. 文档目的

本文档集用于指导后续 Agent 将 `AgentStore` 改造成以 QwenPaw 对话为核心的本体建模工作台。实施后只暴露 `id = "tqqRiu"` 的智能体，并在一条对话中按以下顺序引导用户：

```text
流水线一：场景 1 文档条目化
  -> query-project-chunks
  -> 用户审核并选择功能
流水线二：场景 3 单功能建模（可重复）
  -> query-requirement-dsl-artifacts
  -> 用户审核全部功能 DSL
流水线三：场景 7 本地 TTL 校验
  -> 场景 8 GraphDB 上传
  -> 场景 9 本体推理
  -> query-project-ontology-instances
```

本计划只调整前端工作流外壳、引导表单和阶段门禁，不新增后端业务状态，不改变现有 QwenPaw 消息协议、Skill 输出协议或 Renderer 数据结构。

## 2. 阅读与执行顺序

实施 Agent 必须先完整阅读本目录全部文档，再按以下顺序一次只执行一个阶段：

1. [00-boundaries-and-current-contracts.md](./00-boundaries-and-current-contracts.md)：当前代码事实、协议和范围边界。
2. [01-agent-filter-and-workflow-shell.md](./01-agent-filter-and-workflow-shell.md)：Agent 过滤与对话工作流外壳。
3. [02-itemization-and-function-selection.md](./02-itemization-and-function-selection.md)：场景 1、chunks 查询与功能选择。
4. [03-function-modeling-and-dsl-gate.md](./03-function-modeling-and-dsl-gate.md)：重复场景 3 与项目级 DSL 门禁。
5. [04-ontology-management-workflow.md](./04-ontology-management-workflow.md)：场景 7、8、9 与本体实例查询。
6. [05-manual-acceptance-checklist.md](./05-manual-acceptance-checklist.md)：唯一人工验收清单。

## 3. 强制执行规则

### 3.1 分阶段停止

- 一次只实施一个阶段，不得把四个阶段合并完成。
- 每个阶段完成代码修改后，立即停止并提交阶段报告。
- 用户完成该阶段对应的人工清单并明确确认前，不得进入下一阶段。
- 人工清单最后一项未确认前，不得宣布整体改造验收完成。

### 3.2 禁止自动验证

实施 Agent 不得运行：

- 任何 `build`、`test`、`lint` 或 `tsc` 命令；
- 浏览器自动化、Playwright、截图对比或自动点击；
- 自建 Smoke、fixture runner、临时测试脚本或自动协议探测；
- 以构建产物、缓存或生成文件作为替代验收。

只允许读取源码、检查工作树和查看本次代码差异。所有行为验证由用户根据人工清单完成。

### 3.3 工作树保护

- 开始每个阶段前先读取 `git status --short`。
- 保留用户现有未跟踪文件和无关修改，不覆盖、不删除、不格式化无关文件。
- 特别禁止修改或重新打包以下输入资产：
  - `helps/MinerU_markdown_使用手册.md`
  - `helps/query-project-chunks.zip`
  - `helps/query-requirement-dsl-artifacts.zip`
  - `helps/query-project-ontology-instances/`
  - `helps/query-project-ontology-instances.zip`
- 不修改后端、数据库、GraphDB 接口、Extension 打包链或 QwenPaw 服务端。

## 4. 阶段交付报告格式

每个阶段结束时，实施 Agent 必须按以下模板报告，不得代替用户填写测试结果：

```md
## 阶段 N 交付报告

### 修改文件
- <文件路径及用途>

### 已完成行为
- <实际完成的行为>

### 未解决问题或人工验证依赖
- <问题；没有则写“无已知代码阻塞，等待人工验证”>

### 请人工执行
- <05-manual-acceptance-checklist.md 中的编号>

### 当前边界
- 未运行构建、测试、Lint、类型检查、浏览器自动化或 Smoke 脚本。
- 已停止，等待用户确认后再进入下一阶段。
```

## 5. 阶段与人工验收映射

| 实施阶段 | 主要结果 | 必须人工验证 |
| --- | --- | --- |
| 阶段一 | 仅暴露 `tqqRiu`，增加三阶段对话外壳 | A 组、G01-G04、H01-H03 |
| 阶段二 | 场景 1、chunks 查询、功能选择与路径预填 | B 组、F01-F03 |
| 阶段三 | 多功能场景 3、DSL 查询及进入流水线三的门禁 | C 组、D 组、F04-F05 |
| 阶段四 | 场景 7/8/9、授权门禁和本体实例卡片 | E 组、G05-G08、H04-H06 |

## 6. 总体完成条件

仅当以下条件全部满足时，本工作流才算完成：

- 四个阶段均已分别实施并停留等待过用户确认；
- 用户已手工填写并确认人工清单的 A-H 全部项目；
- 页面只允许 `tqqRiu` 创建或继续会话；
- 场景顺序、功能覆盖和 Skill 结果门禁符合本文档；
- GraphDB 上传和推理均需要独立显式授权；
- 原有自由聊天、附件、消息历史及三个现有 Renderer 无回归；
- 没有通过新增后端状态、目录扫描或本地持久化绕开现有协议。

