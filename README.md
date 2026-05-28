# BAIC Requirements Management

面向 BAIC 需求建模与需求协同的前端工作区。仓库采用 npm workspaces 组织：

- `packages/webview`：React + Vite Web 应用，可独立在浏览器中运行，也会被打包后嵌入 VS Code Webview。
- `packages/extension`：VS Code 扩展宿主，负责创建 WebviewPanel、注入运行时配置、保存认证状态并加载打包后的 webview 资源。

## 功能概览

- 用户登录、注册和认证状态维护。
- 项目列表、项目创建和项目工作区。
- 需求列表、需求创建、需求详情和版本信息展示。
- 项目内需求 WebSocket 实时同步。
- 多维度需求建模编辑：
  - 所处环境：`IBD`
  - 与环境交互：`ESD`
  - 内部组成：`BDD`
  - 组成模块间的响应：`ISD`
  - 内部约束：`SC`
- 图形化编辑器与 DSL 编辑器双视图切换。
- RBG JSON 与 DSL 文本互转。
- 需求关系图和测试用例视图。
- VS Code 扩展内运行，支持扩展侧配置后端地址和 LSP WebSocket 地址。

## 技术栈

- React 19
- TypeScript 5
- Vite 7
- React Router 7
- Ant Design 6
- AntV X6 / AntV G6
- ECharts
- Monaco Editor
- VS Code Extension API

## 目录结构

```text
.
├── helps/                         # 后端接口、DSL、数据模型和示例资料
├── packages/
│   ├── extension/                 # VS Code 扩展宿主
│   │   ├── src/
│   │   │   ├── extension.ts       # 命令注册、WebviewPanel 生命周期、认证消息分发
│   │   │   ├── webviewHtml.ts     # Webview HTML、CSP 和运行时配置注入
│   │   │   ├── config.ts          # VS Code 配置读取
│   │   │   └── auth.ts            # SecretStorage 认证状态管理
│   │   └── scripts/
│   │       └── copy-webview-assets.mjs
│   └── webview/                   # React Web 应用
│       ├── src/
│       │   ├── pages/             # 路由级页面
│       │   ├── components/        # 共享组件、图编辑器、表单控件
│       │   ├── hooks/             # 认证和项目同步 hooks
│       │   ├── models/            # 领域模型和图导入导出策略
│       │   └── config/            # API、认证客户端和运行时配置
│       └── vite.config.ts
├── package.json                   # workspace 根脚本
└── package-lock.json
```

## 环境要求

- Node.js：建议使用当前锁文件对应的 LTS 或更新版本。
- npm：使用 `package-lock.json` 安装依赖。
- VS Code：调试扩展时需要 VS Code `^1.90.0`。
- 后端服务：默认 REST API 和项目同步 WebSocket 使用 `localhost:8000`。
- DSL Language Server：默认使用本地 `3000` 到 `3003` 端口。

## 快速开始

安装依赖：

```bash
npm ci
```

启动独立浏览器版本：

```bash
npm run dev
```

构建 webview 和扩展资源：

```bash
npm run build
```

预览构建产物：

```bash
npm run preview
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 `@baic/webview` 的 Vite 开发服务器 |
| `npm run build` | 先构建 webview，再编译扩展并复制 webview 产物 |
| `npm run build:webview` | 仅构建 React webview |
| `npm run build:extension` | 编译 VS Code 扩展并复制 webview 静态资源 |
| `npm run build:debug-extension` | VS Code 调试前置构建任务 |
| `npm run lint` | 对 webview 包运行 ESLint |
| `npm run preview` | 本地预览 webview 构建产物 |

## 运行配置

### 浏览器模式

浏览器模式读取 `packages/webview/.env.*` 中的 Vite 环境变量。

开发环境默认值：

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

可选 LSP WebSocket 变量：

```env
VITE_LSP_WS_INTERNAL_CONSTRAINTS=ws://127.0.0.1:3000
VITE_LSP_WS_ENVIRONMENT=ws://127.0.0.1:3001
VITE_LSP_WS_INTERACTION=ws://127.0.0.1:3002
VITE_LSP_WS_INTERNAL_COMPOSITION=ws://127.0.0.1:3003
```

### VS Code 扩展模式

扩展模式不会依赖 Vite env，而是在宿主侧读取 VS Code 配置并通过 `window.__BAIC_CONFIG__` 注入 webview。

可配置项：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `baic.apiBaseUrl` | `http://localhost:8000` | REST API 根地址 |
| `baic.projectWsBaseUrl` | `ws://localhost:8000` | 项目同步 WebSocket 根地址 |
| `baic.lspWs.internalConstraints` | `ws://127.0.0.1:3000` | 内部约束 DSL LSP |
| `baic.lspWs.environment` | `ws://127.0.0.1:3001` | 所处环境 DSL LSP |
| `baic.lspWs.interaction` | `ws://127.0.0.1:3002` | 交互 DSL LSP |
| `baic.lspWs.internalComposition` | `ws://127.0.0.1:3003` | 内部组成 DSL LSP |

## VS Code 扩展调试

仓库已提供 `.vscode/launch.json` 和 `.vscode/tasks.json`。

1. 在 VS Code 中打开仓库根目录。
2. 选择调试配置 `Run BAIC Extension`。
3. 启动调试。调试前置任务会执行 `npm run build:debug-extension`。
4. 在扩展开发宿主窗口中执行命令：
   - `BAIC: Open Requirements Manager`
   - `BAIC: Login`
   - `BAIC: Logout`

扩展开发路径指向：

```text
packages/extension
```

webview 构建产物会复制到：

```text
packages/extension/media/webview
```

## 认证模型

- 浏览器模式使用 `localStorage` 保存 `token`、`user_id` 和 `username`。
- 扩展模式使用 VS Code `SecretStorage` 保存认证状态。
- webview 内部通过 `authClient` 抽象两种运行环境：
  - 浏览器模式直接使用登录接口和本地存储。
  - 扩展模式通过 `postMessage` 向扩展宿主请求 `auth:get`、`auth:login`、`auth:logout`。

## 后端与接口资料

接口、数据模型、DSL 和示例数据位于 `helps/`：

- `helps/API_DOCUMENTATION_v3.md`
- `helps/DSL-JSON.md`
- `helps/models.md`
- `helps/strategy.md`
- `helps/ProjectWorkSpace.md`

前端主要调用的接口集中在 `packages/webview/src/config/api.ts`，包括：

- `/projects`
- `/requirements`
- `/dependency`
- `/rbg-to-dsl`
- `/dsl-to-rbg`
- `/auth/email`
- `/ws/projects/{project_id}`

## 开发约定

- 路由级页面放在 `packages/webview/src/pages/`。
- 共享 UI 放在 `packages/webview/src/components/`。
- 可复用 hooks 放在 `packages/webview/src/hooks/`。
- 领域模型和图导入导出策略放在 `packages/webview/src/models/`。
- API 与 WebSocket endpoint 统一维护在 `packages/webview/src/config/api.ts`。
- 组件样式优先使用同目录 `.css` 文件。
- React 组件、页面和模型文件使用 PascalCase。
- hooks 和工具函数使用 camelCase，hooks 以 `use` 开头。
- 代码风格遵循现有 React + TypeScript 写法：函数组件、ES modules、2 空格缩进、无分号。

## 验证建议

当前仓库没有配置独立测试脚本。提交前建议至少验证：

- 浏览器模式能正常启动并完成登录流程。
- 项目列表、项目创建和工作区加载正常。
- 需求创建、需求选择、需求编辑和版本展示正常。
- 图编辑器、DSL 编辑器以及 RBG/DSL 转换接口正常。
- 项目 WebSocket 同步状态正常。
- VS Code 扩展能打开 webview，并能完成登录、退出和配置注入。

CI 会负责 `eslint` 和 TypeScript 类型检查。
