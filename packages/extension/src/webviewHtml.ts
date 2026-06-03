import * as vscode from 'vscode'

import { getConnectSources, getRuntimeConfig } from './config'

export function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
): string {
  const nonce = createNonce()
  const webviewRoot = vscode.Uri.joinPath(extensionUri, 'media', 'webview')
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewRoot, 'assets', 'index.js'),
  )
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewRoot, 'assets', 'index.css'),
  )
  const config = getRuntimeConfig()
  const connectSources = getConnectSources(config)

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: https:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource}; worker-src ${webview.cspSource} blob:; connect-src ${connectSources.join(' ')};">
    <link rel="stylesheet" href="${styleUri}">
    <title>BAIC Requirements Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      window.__BAIC_CONFIG__ = ${JSON.stringify(config)}
    </script>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`
}

function createNonce(): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  for (let index = 0; index < 32; index += 1) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }

  return result
}
