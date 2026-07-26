# 阶段四：真实侧栏与流式对话 UI 验收记录

## 完成范围

- `AgentSidebar` 已改为使用真实 QwenPaw Agent 和 ChatSpec。
- `ConversationWorkspace` 已改为使用标准化消息和阶段三会话状态。
- 文本输入已接通 `useQwenPawConversation.send`，支持 Enter 发送、Shift+Enter 换行和输入法 composing 保护。
- 生成期间显示停止按钮，失败和停止状态提供重新发送入口。
- 文件入口保持禁用并明确提示在下一阶段开放。
- 静态 `agentWorkspaceData.ts` 已删除。

## 真实侧栏

- Agent 列表展示真实名称、描述、启用状态和当前项。
- Agent 加载、失败、空列表均有独立状态。
- 历史列表展示真实名称、更新时间、置顶、运行中和定时来源标记。
- Agent 列表和历史列表独立滚动。
- 项目区和 AI 引擎保持固定可见。
- AI 引擎展示 checking、online、offline 及当前模型。

## 真实消息区

- 历史加载、失败、空会话均有独立 UI。
- 支持 user、assistant、system、tool、unknown 中性渲染。
- 支持 text、file、image、data、tool 和 unknown part。
- 文本使用 `white-space: pre-wrap` 和 `overflow-wrap`，不注入原始 HTML。
- 使用服务端时间；缺失或无效时间不伪造。
- streaming assistant 显示生成指示。
- failed、stopped 显示明确终态和重新发送入口。

## 滚动和切换

- 会话切换通过 `agentId + sessionId` key 重置输入和滚动状态。
- 初次进入自动滚动到底部。
- 用户离开底部后停止自动跟随并显示“回到底部”。
- Agent 和项目切换期间隐藏旧会话状态，避免旧消息闪回。
- ChatSpec 列表记录所属 Agent，切换期间不会短暂展示旧 Agent 会话。

## 验证

### 构建

- AgentStore 定向 esbuild bundle：通过。
- `npm run build --workspace @baic/webview`：通过。
- Vite 构建完成 7001 个模块，仅保留既有大 chunk 提示。
- `git diff --check`：通过。
- 按仓库约定未运行 ESLint 和 `tsc --noEmit`。

### 真实只读数据

- `GET http://localhost:7706/api/agents`：3 个 Agent。
- `GET /qwenpaw/api/agents`：3 个 Agent。
- 代理和直连 Agent ID 完全一致。
- 页面展示 3 个真实 Agent 和 24 条真实 ChatSpec。

### 浏览器

- 页面：`http://127.0.0.1:5174/#/agent/store`
- 桌面视口：1280 × 720。
- 移动视口：390 × 844。
- 页面标题和路由正确。
- 无空白页或框架错误遮罩。
- 控制台 error/warn：0。
- 项目 `proj1` 选择成功，新 draft 和文本输入区出现。
- 输入非空文本后发送按钮启用；测试文本随后清空，未发送请求。
- 移动端侧栏可打开、关闭，遮罩同步创建和移除。

### 验证中修复

1. 侧栏中间容器的 `overflow: hidden` 会在项目聚焦时发生编程滚动，导致当前 Agent 被卷出；改为 `overflow: clip`。
2. 720px 高度下 Agent 区占高过多，历史列表被裁切；收紧 Agent 列表高度和垂直间距，使历史列表与底部 AI 引擎同时可见。

## 人工验收项

本轮未主动发送真实聊天消息，避免生成额外 ChatSpec。请人工验证：

1. 新对话发送文本并观察流式增长。
2. completed 后历史列表出现真实 ChatSpec。
3. 打开该 ChatSpec 发送第二轮消息。
4. failed、空 SSE 和停止生成的 UI。
5. 用户向上滚动时不被流式输出强制拉回。

人工确认后再进入阶段五附件上传和恢复能力。
