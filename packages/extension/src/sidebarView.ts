import * as vscode from 'vscode'

interface SidebarMessage {
  type: string
}

const SIDEBAR_OPEN_MESSAGE = 'openRequirementsManager'

export class RequirementsSidebarProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
    }

    webviewView.webview.onDidReceiveMessage((message: SidebarMessage) => {
      if (message.type === SIDEBAR_OPEN_MESSAGE) {
        void vscode.commands.executeCommand('baic.openRequirementsManager')
      }
    })

    webviewView.webview.html = getSidebarHtml(webviewView.webview)
  }
}

function getSidebarHtml(webview: vscode.Webview): string {
  const nonce = createNonce()

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <style>
      body {
        padding: 16px 12px;
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
      }

      .actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      button {
        width: 100%;
        min-height: 32px;
        padding: 4px 12px;
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 2px;
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
        font: inherit;
        cursor: pointer;
      }

      button:hover {
        background: var(--vscode-button-hoverBackground);
      }

      button:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 2px;
      }
    </style>
  </head>
  <body>
    <div class="actions">
      <button id="openButton" type="button">Open Requirements Manager</button>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()
      document.getElementById('openButton').addEventListener('click', () => {
        vscode.postMessage({ type: '${SIDEBAR_OPEN_MESSAGE}' })
      })
    </script>
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
