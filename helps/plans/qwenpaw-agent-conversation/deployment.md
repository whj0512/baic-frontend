# QwenPaw 部署配置说明

## 1. 浏览器模式

Webview 只访问 `VITE_QWENPAW_BASE_URL`。开发、平台和生产环境均建议使用
同源路径 `/qwenpaw`，不要在业务组件中硬编码 QwenPaw 主机地址。

```env
VITE_QWENPAW_BASE_URL=/qwenpaw
VITE_QWENPAW_CHAT_TIMEOUT_MS=120000
VITE_QWENPAW_UPLOAD_MAX_BYTES=20971520
```

- 开发环境由 Vite 将 `/qwenpaw/*` 转发到 `http://localhost:7706/*`。
- 平台和生产环境由入口网关提供同源 `/qwenpaw` 反向代理。
- 远程 QwenPaw 如需认证，应由服务端代理注入凭据；Bearer Token 不得进入
  `.env`、运行时配置或浏览器产物。

## 2. Nginx 参考配置

以下示例保留 SSE 长连接、允许 JSON 与 multipart 请求，并将代理限制设置为
高于前端默认的 20 MiB / 120 秒：

```nginx
location /qwenpaw/ {
    proxy_pass http://qwenpaw:7706/;
    proxy_http_version 1.1;

    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
    client_max_body_size 25m;

    proxy_set_header Host $host;
    proxy_set_header X-Agent-Id $http_x_agent_id;
}
```

若网关需要鉴权，可在此 `location` 内增加由服务端管理的认证请求头。不要把
服务端密钥透传给浏览器。网关还需要允许 `POST`、`Content-Type:
application/json` 和 `multipart/form-data`。

## 3. VS Code 扩展模式

扩展不读取 Vite env，而是从 VS Code 配置生成 `window.__BAIC_CONFIG__`：

| 配置项 | 默认值 |
| --- | --- |
| `baic.qwenPawBaseUrl` | `http://localhost:7706` |
| `baic.qwenPawChatTimeoutMs` | `120000`（对话流连续无数据、附件上传请求超时） |
| `baic.qwenPawUploadMaxBytes` | `20971520` |

`qwenPawBaseUrl` 的 origin 会加入 webview CSP `connect-src`。远程地址必须允许
VS Code webview 的请求；更稳妥的部署方式仍是让它指向受控代理，而不是在
webview 中保存认证信息。

## 4. 上线检查

- `/qwenpaw/api/version`、`/api/agents`、chat 详情和 upload 均可访问。
- SSE 事件按 chunk 到达，代理没有等待完整响应后一次性返回。
- `X-Agent-Id` 能到达 QwenPaw。
- 上传响应中的 `size` 与本地 `File.size` 一致。
- 网关限制大于产品配置的超时与附件上限。
- 构建产物中不存在 Bearer Token 或 QwenPaw 服务端密钥。
