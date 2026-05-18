const vscode = require('vscode')

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    'baic.openRequirementsManager',
    () => {
      const panel = vscode.window.createWebviewPanel(
        'baicRequirementsManager',
        'BAIC Requirements Manager',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, 'media', 'webview'),
          ],
        },
      )

      panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri)
    },
  )

  context.subscriptions.push(disposable)
}

function getWebviewHtml(webview, extensionUri) {
  const nonce = createNonce()
  const webviewRoot = vscode.Uri.joinPath(extensionUri, 'media', 'webview')
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewRoot, 'assets', 'index.js'),
  )
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewRoot, 'assets', 'index.css'),
  )
  const config = getRuntimeConfig()

  const connectSources = [
    getOrigin(config.apiBaseUrl),
    getOrigin(config.projectWsBaseUrl),
    getOrigin(config.lspWs.internalConstraints),
    getOrigin(config.lspWs.environment),
    getOrigin(config.lspWs.interaction),
    getOrigin(config.lspWs.internalComposition),
  ].filter(Boolean)

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: https:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}'; connect-src ${connectSources.join(' ')};">
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

function getRuntimeConfig() {
  const config = vscode.workspace.getConfiguration('baic')

  return {
    apiBaseUrl: config.get('apiBaseUrl'),
    projectWsBaseUrl: config.get('projectWsBaseUrl'),
    lspWs: {
      internalConstraints: config.get('lspWs.internalConstraints'),
      environment: config.get('lspWs.environment'),
      interaction: config.get('lspWs.interaction'),
      internalComposition: config.get('lspWs.internalComposition'),
    },
  }
}

function getOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

function createNonce() {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  for (let index = 0; index < 32; index += 1) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }

  return result
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
