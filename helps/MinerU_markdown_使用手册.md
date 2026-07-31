# 智能需求化建模平台使用手册

## 1. 使用流程

本平台通过 QwenPaw 对话执行工作。你不需要手工运行 DSL、本体或校验脚本，只需根据当前任务选择下面三条流水线，向对应入口 Agent 发送包含路径和目标的提示词。

<table><tr><td>要完成的工作</td><td>使用的流水线</td><td>从哪里开始</td></tr><tr><td>把一份系统级需求文档拆成多个可建模功能</td><td>流水线一:文档条目化</td><td>requirement_itemizer</td></tr><tr><td>为一个功能生成 DSL、检查模型、生成测试用例</td><td>流水线二:单功能 DSL 建模</td><td>requirement_document_parse</td></tr><tr><td>查看全项目关系、上传图谱、推理依赖或冲突</td><td>流水线三:本体关系管理</td><td>requirement_ontology_manager或对应 ontology Agent</td></tr></table>

处理顺序通常为：先条目化，再逐功能建模，最后进入本体关系管理。文档很长时不需要一次让 QwenPaw 阅读全部正文；条目化完成后按功能逐个处理即可。

## 2. 开始前准备

## 2.1 准备材料

第一次处理项目时准备以下内容：

（1）原始系统需求文档，DOCX 或 PDF；

（2）与原文同一版本的 MinerU Markdown；

（3）一个独立的项目输出目录；

（4）项目名称和你希望得到的成果，例如“拆分功能并生成测试用例”。

原始文档与 Markdown 版本不一致会导致条目缺失、章节错位或关系证据错误。若功能概述存在于表格中，先确认 Markdown 中仍能看到表格内容。

## 2.2 通用提示词写法

每次都写清四件事：输入路径、项目根目录、要做的工作、希望得到的结果。

涉及 GraphDB 时，再写清地址、仓库和是否允许写入。

```txt
（已打开对应 Agent）
请使用 <流水线> 处理：
输入：<绝对路径>
项目根目录：<绝对路径>
目标：<要完成的工作>
要求输出：<希望审核的产物>，
限制：<例如不改原文、不上传、不推理、输出结构……>
```

不要只说“帮我解析这个文档”。路径、输出目录和预期产物不明确时，结果无法可靠复用。

## 3. 流水线一：把长文档拆成条目化需求

## 场景 1：第一次处理一份系统级需求文档

（1）什么时候用：拿到一份几十页或上百页的系统需求文档，需要按功能分别建模、生成 DSL 和测试用例。

（2）打开 requirement_itemizer 后，在 QwenPaw 中这样说：

```txt
请使用 requirement_itemizer 对系统需求文档进行条目化。
原始文档：<DOCX/PDF 绝对路径>
MinerU Markdown：<MD 绝对路径>
项目根目录：<输出目录>
要求：按系统功能拆分为独立 Markdown，保留功能概述和系统概述；
从功能概述、功能列表或正文的明确描述中提取项目级 includes 关系；
不要根据目录层级推断包含关系。
请输出 chunks.json、每个功能条目、关系种子和校验结果。
```

（3）你会得到什么：

<table><tr><td>产物</td><td>用途</td></tr><tr><td>根级功能概述 Markdown</td><td>保留功能总览、模式关系和跨功能描述</td></tr><tr><td>chunks.json</td><td>条目清单、来源章节、分块信息</td></tr><tr><td>project_relation_seed</td><td>从原文功能概述得到的初始 includes 关系</td></tr><tr><td>功能条目 Markdown</td><td>后续逐个生成 DSL 的输入</td></tr><tr><td>校验结果</td><td>告诉你是否有章节、条目或概述遗漏</td></tr></table>

```txt
名称 修改日期 类型 大小
4在线音乐 2026/7/22 10:13 文件夹
5在线电台 2026/7/22 10:16 文件夹
6收音机 2026/7/22 9:37 文件夹
7蓝牙音乐 2026/7/22 9:35 文件夹
8U盘音乐 2026/7/22 10:13 文件夹
output 2026/7/22 10:16 文件夹
1变更记录.md 2026/7/22 8:40 Markdown File 3 KB
3整体需求.md 2026/7/22 8:39 Markdown File 1 KB
chunks.json 2026/7/22 9:07 JSON 源文件 38 KB
fixed_MinerU_markdown_多媒体中心... 2026/7/22 8:37 Markdown File 22 KB
MinerU_markdown_多媒体中心功能规... 2026/6/15 18:01 Markdown File 21 KB
requirement_relations.json 2026/7/22 10:05 JSON 源文件 31 KB
多媒体中心功能规范V1.0-20250722.pdf 2026/6/11 11:05 WPS PDF 文档 758 KB
```

（4）完成后先检查：功能概述是否保留；每个主要功能是否有独立条目；project_relation_seed 的 includes 是否都有原文证据；概述和详细章节不一致的问题是否被列出。目录中的父子层级不等于功能包含关系。

（5）如果不满足划分情况，比如合并情况不合理，可以告诉Agent 你的划分想法，重新进行划分。

## 场景 2：功能概述或章节结构修改了

（1）什么时候用：原始文档升级版本，新增/删除功能，或者功能概述表格有变化。

（2）做法：重新运行流水线一，不要只手工移动旧目录。随后比较新旧chunks.json、关系种子和不一致项，再决定哪些功能需要重跑流水线二。

```txt
请重新条目化该项目的新版本文档，并与现有项目结果比较。
原始文档：<新版本路径>
MinerU Markdown: <新版本路径>
项目根目录：<现有项目根目录>
```

请列出新增、删除、改名和需要重新建模的功能；重新校验 includes 关系及其原文证据。不要覆盖旧版本产物，先输出差异报告。

## 4. 流水线二：从一个功能生成 DSL 和测试用例

## 场景 3：为一个功能建立完整模型

（1）什么时候用：条目化完成后，要对一个功能，例如“OnePedal 驾驶模式”或“全地形扭矩控制”，生成 DSL 和测试用例。

## （2）打开 requirement_document_parse，输入：

<table><tr><td>请使用 requirement_analysis_pipeline 对一个功能进行完整建模。</td></tr><tr><td>功能 Markdown: &lt;功能 Markdown 绝对路径&gt;</td></tr><tr><td>项目根目录: &lt;包含 chunks.json 的目录&gt;</td></tr><tr><td>目标: 生成实体、条件逻辑、四类 DSL、DSL 对齐结果和测试用例。</td></tr><tr><td>要求: 从本功能原文中增量维护项目关系; 只有原文唯一确定的内容才可写回 DSL;</td></tr><tr><td>不得修改原始需求 Markdown; DSL 语法或对齐失败时停止测试用例生成并报告原因。</td></tr></table>

## （3）你会得到什么：

<table><tr><td>阶段</td><td>产物</td><td>你需要重点审核什么</td></tr><tr><td>原文解析</td><td>requirements.json实体表if-thenrelation_delta.json</td><td>原子需求、原文证据和责任范围是否完整;跨功能约束是否被保留</td></tr><tr><td>DSL 建模</td><td>EnvironmentExternalScenarioStatechartDialogMaprequirement_dsl_map.json</td><td>每个 requirement_id 是否有 DSL 定位、断言和覆盖状态</td></tr><tr><td>DSL 对齐</td><td>alignment_result.jsonalignment_report.mdcompletion_plan.mdalignment_changes.md</td><td>所有可测试需求是否为 covered,写回项是否有原文依据</td></tr><tr><td>测试设计</td><td>testcase/测试用例.xlsxrequirement_testcase_map.json</td><td>每个可测试需求是否有实际测试断言和DSL/原文追溯</td></tr></table>

![image](https://cdn-mineru.openxlab.org.cn/result/2026-07-31/2da191fb-7fbd-4df4-85b1-765bc88c5d5f/633c00e572e1a956166e2165b08a8152882c4d16ecb2d01e0c46953295caf1f1.jpg)


（4）批量做法：除了可以多开几个会话进行处理之外，也使用QwenPaw 提供的spawn_subagent 接口，并行解析多个功能。需要注意声明 spawn_subagent 在后台执行，否则当前会话一直轮询任务完成情况导致对话次数达到上限。需要的注意的是，API的并发限制以及后台子agent 任务被取消的风险。

![image](https://cdn-mineru.openxlab.org.cn/result/2026-07-31/2da191fb-7fbd-4df4-85b1-765bc88c5d5f/f16b6439ca7e5e9c5b9a87cdf674235eed3238445dc3b8a239f8c1ee0f006f92.jpg)



一段时间后询问QwenPaw 跟进进度。


![image](https://cdn-mineru.openxlab.org.cn/result/2026-07-31/2da191fb-7fbd-4df4-85b1-765bc88c5d5f/6e58e945f81eeb768b5bbdb7f2958501f4fa5529beebd541df6361b3c85061d8.jpg)


完成之后，项目目录下的 requirement_relations.json 中已包含完整的需求间关系。

```json
{
    "schema_version": "2.0",
    "requirements": [
    {
    "name": "多媒体中心",
    "aliases": [
    "多媒体中心"
    ],
    "requirement_level": "system",
    "source_relative_path": null
    },
    {…,
    },
    {…,
    },
    {…,
    },
    {…,
    },
    {…
    }
    ],
    "relations": [
    {
    "source": "多媒体中心",
    "target": "在线音乐",
    "relation_type": "inclusion",
    "subtype": null,
    "is_inferred": false,
    "evidence": [
    {
    "section_id": "3",
    "text": "音频类功能以聚合的形式体现..."
    }
    ]
    },
    {
    "source": "多媒体中心",
    "target": "在线电台",
    "relation_type": "inclusion",
    "subtype": null,
    "is_inferred": false,
    "evidence": [
    {
    "section_id": "3",
    "text": "音频类功能以聚合的形式体现..."
    }
    ]
}
```

（5）每个功能的测试用例路径在 testcase 目录下

<table><tr><td>序号</td><td>项目</td><td>功能模块</td><td>子功能</td><td>用例编号</td><td>用例名称</td><td>用值类型</td><td>命题条件</td><td>测试变量</td><td>预测结果</td><td>测试类型</td><td></td></tr><tr><td>1</td><td>军线音乐</td><td>登录</td><td>语音模式</td><td>Memphis模式音乐时点击进入音乐展示器模式</td><td>TC_MUSIC_LOG10_02</td><td>Memphis用户点击音乐入口显示请客模式</td><td>L1</td><td>1. 中队算正常运行2. 未查询音乐</td><td>1. 筛语在点中心端上的军线音乐入口2. 对原中队算是你的背景内容</td><td>1. 中队算是会话客模式音乐2. 请客模式则是你在该类课后信息和登录按钮</td><td>功能测试</td></tr><tr><td>2</td><td>军线音乐</td><td>登录</td><td>二维码登录</td><td>用户通过二维码登录QQ音乐完成流程</td><td>TC_MUSIC_LOG10_02</td><td>二维码扫码登录QQ音乐</td><td>L1</td><td>1. 中队算正常运行2. 当面处于语音模式或登录界面</td><td>1. 在语音模式界面点击登录按钮2. 对原中队算是你的内容3. 使用手机识别功能计算编码4. 带单系统回返回登录界面5. 客服设置自动的录像</td><td>1. 中队算是会话音视频3. 手机完成的码操作4. 系统系统回返回登录功能状态5. 中队算通过QQ音乐显示量显示四个功能默认播放</td><td>功能测试</td></tr><tr><td>3</td><td>军线音乐</td><td>登录</td><td>登录后界面</td><td>登录成功后加入QQ音乐主界面展示四个页面</td><td>TC_MUSIC_LOG10_03</td><td>登录成功进入QQ音乐界面</td><td>L1</td><td>1. 用户已登录QQ音乐</td><td>1. 筛语在点中心端上的在线音乐入口2. 对原中队算是你的音乐图3. 可能以从中队算完成</td><td>1. 进入QQ音乐功能2. 回与搜索数字卡类别的四个页面3. 默认中队算完成</td><td>功能测试</td></tr><tr><td>4</td><td>军线音乐</td><td>登录</td><td>登录欢迎</td><td>登录有周期对刷新</td><td>TC_MUSIC_LOG10_04</td><td>登录有周期对刷新验证</td><td>L2</td><td>1. 用户已登录QQ音乐</td><td>1. 进入QQ音乐主题2. 每体呈现和语法可编辑</td><td>1. 正常提示QQ音乐主题的功能2. 系统的创新语言呈现和理解保持功能</td><td>功能测试</td></tr><tr><td>5</td><td>军线音乐</td><td>登录</td><td>登录日期</td><td>登录过程到出现登录</td><td>TC_MUSIC_LOG10_05</td><td>登录过程到出现动态登录</td><td>L2</td><td>1. 用户已登录QQ音乐2. 登录有周期的同步方式正在音乐</td><td>1. 本地出出表达式3. 对原中队算是你的内容</td><td>1. 中队算在点中心端的录像显示重复的执行</td><td>答案测试</td></tr><tr><td>6</td><td>军线音乐</td><td>登录</td><td>进出登录</td><td>进出登录后回到登录界面</td><td>TC_MUSIC_LOG10_06</td><td>进出登录回到登录界面</td><td>L1</td><td>1. 用户已登录QQ音乐</td><td>1. 在等待角色点击退出登录按钮2. 回转至学生界面的录像模式界面</td><td>1. 筛语在点中心端的录像显示功能3. 语音识别系统可以删除录像曲图4. 采用双数字集中和转换器连接的录像图</td><td>功能测试</td></tr><tr><td>7</td><td>军线音乐</td><td>语音搜索</td><td>语音搜索</td><td>语音识别出数据后随机查询在QQ音乐中搜索</td><td>TC_MUSIC_CNCI_01</td><td>语音识别播放器逻辑QQ音乐听乐</td><td>L1</td><td>1. 语音识别系统正常2. 在语音录像帧播放3. 语音识别系统可以删除录像曲图4. 筛语保存的录像界面</td><td>1. 筛语在点中心端的录像曲图5. 语音识别系统可以删除录像曲图6. 语音识别系统中发现时钟通道5. 筛语保存的录像界面</td><td>1. 语音识别系统可以删除录像曲图7. 语音识别系统中发现时钟通道8. 筛语保存的录像界面</td><td>功能测试</td></tr></table>

## 场景 4：发现关系描述在 DSL 中没有体现

（1）典型情况：原文写明“One-pedal 优先于普通驾驶模式”“激活后不能切换到其他模式”，但建模结果中没有相关约束。

（2）做法：回到包含该描述的功能条目，重跑流水线二或先让上下文解析器检查。它会把可确认的关系写入该条目的关系增量，并由流水线合并到项目级关系文件；不是通过目录或共享信号猜测关系。

请检查以下功能条目是否遗漏跨功能关系。

功能 Markdown：<路径>

项目根目录：<路径>

重点核对原文中的优先级、互斥、禁止切换和包含关系。

请输出原文证据、relation_delta.json 和需要人工确认的项目关系；

不要根据同名信号、目录关系或领域常识新增依赖。

## 场景 5：DSL 语法报错或模型不一致

（1）典型情况：ExternalScenario 的 if (...) 无法解析，多个条目重复建模同一个状态机，或者 DialogMap 缺页面、控件和跳转。

（2）做法：让 DSL 对齐器定位问题。变量显示名称和 DSL 标识符需要分离，例如“加速踏板信号(两路)”应保留为显示名称，但在表达式中使用 grammar 支持的规范化标识或引用形式；不要删除业务条件来换取语法通过。

```txt
请对该功能的 DSL 执行对齐和语法复验。
功能目录：<路径>
重点问题：<例如 ExternalScenario if 条件解析失败 / 状态机重复 / DialogMap 缺跳转>
请提供 requirements.json、requirement_dsl_map.json 和全部 DSL 路径；仅修复原文唯一确
```

```txt
定且可验证的内容，其余写入 completion_plan.md。  
请返回 alignment_result.json、修改的 DSL 文件、修改依据、复验结果和未解决项。
```

## 场景 6：只想重新生成测试用例

什么时候用：DSL 已经完成修订和对齐，只需刷新 Excel 测试用例。

```txt
请基于已通过语法、统一校验和对齐硬门禁的 DSL 重新生成测试用例。
功能目录：<路径>
请读取 requirements.json、alignment_result.json、requirement_dsl_map.json 和 alignment_report.md。
请输入 testcase/测试用例.xlsx 和 testcase/requirement_testcase_map.json；每个可测试 requirement_id 必须有实际断言。
若前置校验未通过、存在 partial/missing 或未覆盖断言，请停止并列出阻塞项，不生成正式用例。
```

## 5. 流水线三：管理项目本体关系

## 场景 7：在不上库的情况下检查项目关系

（1）什么时候用：想先检查 DSL 能否转换为 TTL，或准备交付图谱但尚未决定写入 GraphDB。

![image](https://cdn-mineru.openxlab.org.cn/result/2026-07-31/2da191fb-7fbd-4df4-85b1-765bc88c5d5f/b056863a85716e533cbcb8acb04d989104f37415131e74e3454232c93463995a.jpg)


```txt
请将该项目已验证的 DSL 和 requirement_relations.json 转换为 TTL。
项目根目录：<路径>
输出 TTL：<路径>
只做本地 Turtle 校验，不连接、不上传、不修改 GraphDB。
```

请返回 TTL 路径、实体/关系统计、校验结果和问题列表。

（2）你会得到什么：ABox TTL、转换统计和本地校验结果。此时所有成果仍在本地项目目录，GraphDB 不会变化。

## 场景 8：把已验证项目上传到 GraphDB

（1）什么时候用：本地 GraphDB 已部署，且你希望在 Workbench 或 QwenPaw中查询本项目关系。

```txt
我明确授权向 GraphDB 写入本项目 ABox。
TTL: <已验证 TTL 路径>
GraphDB 地址: http://localhost:7200
仓库: requirement
仅追加该 ABox；不得清库、不得覆盖 TBox/SHACL、不得执行推理。
请返回上传状态、三元组数量、中文标签抽样和 SHACL 验证结果。
```

![image](https://cdn-mineru.openxlab.org.cn/result/2026-07-31/2da191fb-7fbd-4df4-85b1-765bc88c5d5f/1f98146a90a3d6718f414778e50e6603e9da8e89dc88c18eea158da1c7dd4e02.jpg)


（2）上传前确保仓库地址和 ID 正确。没有明确写入授权时，QwenPaw 应只

生成本地 TTL 或提供待上传清单。

![image](https://cdn-mineru.openxlab.org.cn/result/2026-07-31/2da191fb-7fbd-4df4-85b1-765bc88c5d5f/e22a5e1b66f4f0d497f13cdc09b40810c1de84e5bdbca25c27f43e8003637432.jpg)


## 场景 9：分析需求之间是否存在依赖或冲突

（1）什么时候用：需要跨功能分析数据生产/消费、潜在写冲突或状态机问题，且 ABox、TBox 和 SHACL 已准备完成。

```txt
我明确授权在 GraphDB 仓库 requirement 上执行本体关系推理。
项目：<项目名称或根目录>
请推理并导出数据依赖、写冲突、状态机问题和关系证据。
每条推理关系必须包含 relationSource、relationTarget、isInferred=true、subtype 和 evidence;
不要把同名信号、共享连接或目录层级单独判定为依赖。
```

## 场景 10：只查询或导出已有关系

（1）请查询 GraphDB 仓库 requirement 中与 <功能名> 相关的关系。

```txt
只读，不上传、不推理、不修改仓库。
请按 JSON 导出关系类型、起点、终点、证据和置信度，并给出统计。
```

![image](https://cdn-mineru.openxlab.org.cn/result/2026-07-31/2da191fb-7fbd-4df4-85b1-765bc88c5d5f/96129c4103b5639f24ba84685e0136130e9df4014dbb05b5b7d3c136fa05fa37.jpg)


## （2）这是最安全的图谱操作，适合评审前检查已有结论。

![image](https://cdn-mineru.openxlab.org.cn/result/2026-07-31/2da191fb-7fbd-4df4-85b1-765bc88c5d5f/650cd7489857ae8326b9df924407351ffb4692859ef5aeb2adf8633d5019ba98.jpg)


## 6. 三条流水线的成果与交接

<table><tr><td>完成阶段</td><td>交给下一阶段的主要内容</td><td>进入下一阶段前的确认</td></tr><tr><td>文档条目化</td><td>功能条目、chunks.json、功能概述、关系种子</td><td>条目覆盖完整,包含关系有原文证据</td></tr><tr><td>单功能建模</td><td>requirements.json、四类 DSL、三份阶段映射、测试用例、项目关系JSON</td><td>DSL 语法和统一校验通过;alignment_result.json 与测试映射均无未覆盖断言</td></tr><tr><td>本体关系管理</td><td>TTL、上传/验证/推理报告、关系导出</td><td>GraphDB 操作范围已获得明确授权</td></tr></table>

## 7. 日常维护

<table><tr><td>情况</td><td>正确做法</td></tr><tr><td>新增或更新一个功能</td><td>从requirements.json到requirement_testcase_map.json对该功能进行全流程的解析,再重新生成项目TTL</td></tr><tr><td>要查看已有关系</td><td>使用ontology manager查询;查询不修改GraphDB</td></tr><tr><td>要生成依赖/冲突分析</td><td>先确认ABox、TBox和SHACL已正确上传,再明确授权运行推理</td></tr><tr><td>GraphDB将要升级或重装</td><td>先导出仓库和项目目录,再变更服务</td></tr><tr><td>需要重建仓库</td><td>先单独备份并取得“清库/重建”明确授权;不得把普通上传当作重建</td></tr></table>

建 议 至 少 备 份 项 目 原 始 文 档 、 chunks.json 、 requirement_relations.json 、requirements.json、三份阶段映射文件、DSL、测试用例、TTL、上传报告和GraphDB 仓库导出。推理结果可重算，但原始文档和已校验 DSL 必须保留。

## 8. 常见问题

<table><tr><td>问题</td><td>应如何处理</td></tr><tr><td>文档上百页,是否要一次全部建模?</td><td>不需要。先条目化,后续按功能逐个运行单功能流水线。</td></tr><tr><td>功能之间的描述散落在多个章节,会不会丢失?</td><td>功能概述先产生初始关系种子;每个功能处理时再增量收集明确的跨功能原文关系。</td></tr><tr><td>多个功能都写了“驾驶模式信号”,是否就是依赖?</td><td>不是。共享信号本身不能证明依赖;需有生产/消费或明确原文约束。</td></tr><tr><td>为什么已有项目关系 JSON,还要做本体推理?</td><td>JSON 保存原文事实;本体推理在已验证模型上发现数据依赖、写冲突等分析结论,两者用途不同。</td></tr><tr><td>发现推理结果不合理怎么办?</td><td>不要直接接受或删除结果。先复核原文、DSL、关系证据和规则,再在测试仓库验证。</td></tr><tr><td>不小心写错提示词会清空 GraphDB 吗?</td><td>普通提示词不会。涉及清库、Schema 覆盖或推理时应明确授权;日常上传提示词需写明“仅追加,不得清库”。</td></tr><tr><td>无法打开 localhost:7200</td><td>检查 GraphDB 服务是否已启动、端口是否被占用,重启服务后再试</td></tr><tr><td>Workbench 中没有 requirement</td><td>按 3.2 新建仓库,确认 Repository ID 拼写完全一致</td></tr><tr><td>QwenPaw 只能生成 TTL,不上传</td><td>这是默认安全行为;在审核后明确给出上传授权和目标仓库</td></tr><tr><td>上传后查询为空</td><td>检查上传报告、当前选择的仓库和 TTL 是否为本项目产物</td></tr><tr><td>推理结果异常多</td><td>停止将其作为结论使用,先检查 DSL、关系证据和本体规则,再在测试仓库复核</td></tr></table>