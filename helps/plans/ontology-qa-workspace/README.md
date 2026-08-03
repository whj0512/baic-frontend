# `ontology_qa` 工作区分阶段实施计划

## 1. 文档目的

本文档集用于指导后续实施 Agent 在现有 AgentStore 中接入 `id = "ontology_qa"` 的本体问答界面。改造完成后：

- `tqqRiu` 继续使用现有 `ontology-ingestion` 三流水线工作流；
- `ontology_qa` 保持自由问答，不设置固定执行顺序或业务完成门禁；
- `ontology_qa` 的聊天输入区提供场景 9、场景 10 快捷模板；
- `ontology_qa` 的对话右侧提供默认收起、按需加载的本体关系面板。

本计划只调整前端展示外壳和输入辅助，不新增后端状态，不改变 QwenPaw、GraphDB、Skill 或 Renderer 协议。

## 2. 文档索引与执行顺序

实施 Agent 必须先完整阅读本目录全部文档，再按以下顺序一次只实施一个阶段：

1. [00-boundaries-and-current-contracts.md](./00-boundaries-and-current-contracts.md)：当前代码事实、既有协议和范围边界。
2. [01-agent-mode-and-prompt-templates.md](./01-agent-mode-and-prompt-templates.md)：阶段一，Agent 展示模式与场景 9/10 快捷模板。
3. [02-collapsible-relationship-panel.md](./02-collapsible-relationship-panel.md)：阶段二，右侧可折叠本体关系面板。
4. [03-manual-acceptance-checklist.md](./03-manual-acceptance-checklist.md)：唯一人工验收清单。

## 3. 强制执行规则

### 3.1 分阶段停止

- 一次只实施一个阶段，不得同时完成阶段一和阶段二。
- 阶段一完成后立即停止，交付 A、B 组人工测试编号并等待用户确认。
- 只有用户明确确认阶段一通过后，才允许开始阶段二。
- 阶段二完成后立即停止，交付 C、D 组人工测试编号并等待最终确认。
- 人工清单最后一项未确认前，不得宣布 `ontology_qa` 工作区整体验收完成。

### 3.2 禁止自动验证

实施 Agent 不得运行：

- 任何 `build`、`test`、`lint` 或 `tsc` 命令；
- 浏览器自动化、Playwright、截图对比或自动点击；
- 自建 Smoke、fixture runner、临时测试脚本或自动协议探测；
- 以构建产物、缓存或生成文件代替用户人工验收。

只允许读取源码、检查工作树和查看本阶段代码差异。

### 3.3 工作树保护

- 每个阶段开始前先读取 `git status --short`。
- 当前 `packages/webview/src/pages/AgentStore.tsx` 中将 `ontology_qa` 加入 `EXPOSED_AGENT_IDS` 的修改属于用户输入和实施基线，必须保留。
- 保留 `.history/` 下现有未跟踪文件和所有无关修改；不得删除、覆盖、格式化或加入本阶段交付范围。
- 特别禁止修改或重新打包：
  - `helps/MinerU_markdown_使用手册.md`
  - `helps/query-project-chunks.zip`
  - `helps/query-requirement-dsl-artifacts.zip`
  - `helps/query-project-ontology-instances/`
  - `helps/query-project-ontology-instances.zip`
- 不修改后端、数据库、GraphDB 接口、QwenPaw 服务端或 Extension 打包链。

## 4. 阶段交付报告格式

每个阶段结束时，实施 Agent 必须使用以下格式，不得代替用户填写人工测试结果：

```md
## 阶段 N 交付报告

### 修改文件
- <文件路径及用途>

### 已完成行为
- <实际完成的行为>

### 未解决问题或人工验证依赖
- <问题；没有则写“无已知代码阻塞，等待人工验证”>

### 请人工执行
- <03-manual-acceptance-checklist.md 中的编号>

### 当前边界
- 未运行构建、测试、Lint、类型检查、浏览器自动化或 Smoke 脚本。
- 已停止，等待用户确认后再进入下一阶段或宣布完成。
```

## 5. 阶段与人工验收映射

| 阶段 | 主要结果 | 必须人工验证 |
| --- | --- | --- |
| 阶段一 | `ontology_qa` 自由问答模式与场景 9/10 快捷模板 | A01-A06、B01-B11 |
| 阶段二 | 默认收起、懒加载的本体关系面板 | C01-C10、D01-D08 |

## 6. 总体完成条件

只有以下条件全部满足时才能宣布完成：

- `tqqRiu` 原有工作流行为没有改变；
- `ontology_qa` 不展示工作流阶段，也不限制用户自由聊天顺序；
- 场景 9 使用用户填写的仓库名称并要求独立推理授权；
- 场景 10 明确保持只读语义；
- 快捷模板只写入可编辑草稿，不自动发送或静默覆盖已有草稿；
- 关系面板默认收起、首次展开才加载，并仅由用户手动刷新；
- 现有工具卡片、关系图、附件、历史和流式消息能力无回归；
- 用户已手工填写并确认清单 A-D 的全部适用项目。

