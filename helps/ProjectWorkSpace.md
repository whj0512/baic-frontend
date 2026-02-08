## 布局



### 需求工作台 (Project Workspace) — 核心页面

采用“左树右布”的经典 IDE 布局，非常适合处理复杂层次结构。

* **左侧：需求树 (Hierarchy Tree)**
* 按 **System → Module/Software → Component** 层次展示。
* 支持拖拽调整 `req_relationship`（如 `refines` 或 `depends_on`）。


* **中间：多维编辑器 (Multi-dimensional Editor)**
* **顶部 Tab**：切换五个维度（IBD, ESD, SC, BDD, ISD）。
* **主画布**：基于 **AntV X6** 开发，支持从侧边栏拖入 `entity` 或其他需求块进行建模。
* **属性栏**：编辑 `nl_text`（自然语言）和 `dsl_text`（DSL 文本）。


* **右侧：版本与协作 (Version & Context)**
* **版本记录**：展示 `requirement_version` 列表，支持点击“回滚”或“对比”。
* **AI 助手面板**：基于 `dsl_text` 自动生成图表，或根据 `nl_text` 推荐需求分类。
