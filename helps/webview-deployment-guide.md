# Webview 构建与部署指南

本文面向拿到 Git 源码压缩包的部署人员，只覆盖 Webview 浏览器静态应用。压缩包不是最终静态成品，需要先解压源码、安装依赖并构建 Webview；不需要构建扩展或 VSIX。

## 1. 压缩包内容

解压后，源码根目录应能看到类似以下文件和目录：

```text
<PROJECT_ROOT>/
├── package.json
├── package-lock.json
├── packages/
│   └── webview/
│       ├── package.json
│       ├── src/
│       └── ...
└── ...其他仓库文件
```

`<PROJECT_ROOT>` 表示解压后包含根 `package.json` 的目录，不是固定的本地路径。Git 源码压缩包可能不包含 `.git` 目录，这不影响构建。

如果压缩包多套了一层目录，请先进入真正包含 `package.json` 和 `package-lock.json` 的目录，再执行后续命令。

## 2. 构建环境

- Node.js：建议使用当前锁文件对应的 LTS 版本。
- npm：使用根目录的 `package-lock.json` 安装依赖。
- 构建机需要能够访问 npm 依赖源；如果使用内部镜像，请先配置 npm registry。
- 生产网关需要准备 BAIC REST API、项目同步 WebSocket 和 DSL Language Server 服务。

## 3. 配置生产环境

Vite 环境变量在构建时写入静态 JavaScript。部署服务器上临时修改环境变量不会改变已经生成的页面；修改地址后必须重新构建。

在源码归档中创建或调整 `packages/webview/.env.production`，只填写本次 Webview 部署需要的配置：

```env
VITE_APP_TARGET=local
VITE_API_BASE_URL=/api
VITE_WS_BASE_URL=wss://baic.example.com

VITE_LSP_WS_INTERNAL_CONSTRAINTS=wss://baic.example.com/lsp/entity
VITE_LSP_WS_ENVIRONMENT=wss://baic.example.com/lsp/environment
VITE_LSP_WS_INTERACTION=wss://baic.example.com/lsp/scenario
VITE_LSP_WS_INTERNAL_COMPOSITION=wss://baic.example.com/lsp/composition
VITE_LSP_WS_DIALOG_MAP=wss://baic.example.com/lsp/dialog-map
```

说明：

- `VITE_API_BASE_URL=/api` 表示浏览器请求同源 `/api`，由网关转发到后端。
- `VITE_WS_BASE_URL` 是 WebSocket 根地址，代码会拼接 `/ws/projects/{project_id}`，不要重复填写 `/ws`。
- HTTPS 站点必须使用 `wss://`；本地 HTTP 调试才使用 `ws://`。
- `VITE_LSP_WS_*` 应填写浏览器能够访问的 WebSocket 地址。如果网关统一提供入口，建议使用同源 `wss://<域名>/lsp/...` 路径。
- 所有 `VITE_*` 值都会进入浏览器资源，不要放入 JWT、Bearer Token、数据库密码或其他服务端密钥。

如果归档中已有环境文件，不要把其中与本次部署无关的配置复制到生产配置；以实际上线域名和网关路径为准。

## 4. 只构建 Webview

在解压后的源码根目录执行：

```bash
npm ci
npm run build:webview
```

其中：

- `npm ci` 按锁文件安装整个 workspace 所需依赖。
- `npm run build:webview` 只执行 `@baic/webview` 的 Vite 生产构建。
- 不要执行 `npm run build`、`npm run build:extension` 或 `vsce package`，这些命令会进入扩展打包流程。

构建成功后，静态文件位于：

```text
<PROJECT_ROOT>/packages/webview/dist/
```

该目录至少应包含：

```text
dist/
├── index.html
├── vite.svg
└── assets/
    ├── index.js
    ├── index.css
    └── ...worker、字体和语言资源
```

## 5. 发布静态文件

只发布整个 `packages/webview/dist` 的内容，不要发布源码目录，也不要只复制 `index.html`。建议在服务器保留版本目录并通过 `current` 切换：

```text
<WEB_ROOT>/
├── releases/
│   ├── 20260812-1200/
│   └── 20260810-1600/
└── current -> releases/20260812-1200
```

部署步骤：

1. 创建新的 `releases/<版本号>` 目录。
2. 将 `packages/webview/dist` 中的全部内容复制到该版本目录。
3. 确认版本目录下直接存在 `index.html` 和 `assets/`。
4. 将 `current` 原子切换到新版本。
5. 检查并重新加载静态服务器配置。

不要直接覆盖正在提供服务的旧目录，以便出现问题时快速回滚。

## 6. 必须提供的网关路由

| 浏览器路径 | 类型 | 转发要求 |
| --- | --- | --- |
| `/api/...` | REST API | 去掉 `/api` 前缀后转发到 BAIC 后端 |
| `/ws/projects/{project_id}` | WebSocket | 转发到后端同名路径并保留 Upgrade 握手 |
| `/lsp/entity` | WebSocket | 转发到实体 DSL LSP |
| `/lsp/environment` | WebSocket | 转发到环境 DSL LSP |
| `/lsp/scenario` | WebSocket | 转发到场景 DSL LSP |
| `/lsp/composition` | WebSocket | 转发到组成 DSL LSP |
| `/lsp/dialog-map` | WebSocket | 转发到 DialogMap DSL LSP |

生产后端应保持鉴权开启。HTTPS 页面不能连接 `ws://`，否则浏览器会阻止请求；生产环境应统一使用 HTTPS/WSS。

## 7. Nginx 参考配置

以下示例只包含静态站点、REST API、项目同步 WebSocket 和 DSL LSP。请将 `<WEB_ROOT>`、域名及上游地址替换为实际值。

```nginx
server {
    listen 443 ssl;
    server_name baic.example.com;

    root <WEB_ROOT>/current;
    index index.html;

    # 入口文件和固定名称的入口资源不要长期缓存
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
    location = /assets/index.js {
        add_header Cache-Control "no-cache";
    }
    location = /assets/index.css {
        add_header Cache-Control "no-cache";
    }

    # 带内容哈希的资源可以长期缓存
    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # /api/projects -> 后端 /projects
    location = /api {
        return 308 /api/;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 项目同步 WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # DSL Language Server WebSocket；上游端口按实际进程调整
    location /lsp/entity {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
    location /lsp/environment {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
    location /lsp/scenario {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
    location /lsp/composition {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
    location /lsp/dialog-map {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }

    # 未匹配到文件时返回入口，避免刷新页面出现 404
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`proxy_pass` 的尾斜杠会影响路径重写：上述配置将 `/api/projects` 转发为后端的 `/projects`。如果后端实际保留 `/api` 前缀，需要同步调整 `proxy_pass`，不要让前后端路径重复或缺失。

## 8. 上线验收

### 构建产物

- `packages/webview/dist/index.html` 存在，并引用 `./assets/index.js` 和 `./assets/index.css`。
- `dist/assets` 中的 worker、字体和语言文件完整存在。
- 静态文件中没有 JWT、Bearer Token、数据库密码或其他服务端密钥。

### 浏览器与接口

- 首页、静态资源和站内路由返回 HTTP 200；刷新页面不会出现 404。
- 登录、项目列表、项目工作区和需求读写流程可用。
- 浏览器 Network 中 REST 请求命中 `/api/...`。
- 项目工作区的 WebSocket 成功连接到 `/ws/projects/...`。
- DSL 编辑器使用的五个 LSP WebSocket 均能建立连接。
- 浏览器控制台没有 CSP、CORS 或 mixed-content 错误。

### 缓存

- `index.html`、`assets/index.js` 和 `assets/index.css` 使用 `no-cache` 或等效策略。
- 带内容哈希的资源可以使用长期缓存。

## 9. 回滚

保留至少一个上一版本的完整静态目录。新版本出现问题时：

1. 将 `current` 切回上一版本目录。
2. 重新加载 Nginx 或其他静态服务器。
3. 必要时清理 CDN 或浏览器缓存。
4. 单独检查后端版本兼容性；静态文件回滚不会自动回滚后端数据或数据库。

## 10. 常见问题

**找不到根 `package.json`**

说明当前目录不是源码根目录。进入同时包含 `package.json` 和 `package-lock.json` 的目录后再执行命令。

**`npm ci` 失败**

检查 Node.js/npm 版本、网络或 npm 镜像配置，并确认使用的是归档中的 `package-lock.json`。

**构建后接口仍指向旧地址**

环境变量已经写入静态 JavaScript。修改 `packages/webview/.env.production` 后重新执行 `npm run build:webview`，再发布新的完整 `dist`。

**解压后首页 404**

检查静态服务器 `root` 是否指向直接包含 `index.html` 的目录，确认压缩包没有多套一层目录。

**刷新页面出现 404**

保留 `location /` 中的 `try_files $uri $uri/ /index.html;`，并重新加载静态服务器配置。

**接口请求 404**

检查 `/api/` 的 `proxy_pass` 尾斜杠和后端实际路由，确认 `/api/projects` 没有被转发成重复或缺失路径。

**WebSocket 连接失败**

确认代理设置了 `Upgrade`、`Connection` 请求头，页面为 HTTPS 时使用 WSS，并检查后端鉴权和 `Origin` 策略。
