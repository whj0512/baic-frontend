import * as vscode from 'vscode'

import { AuthService } from './auth'
import { getRuntimeConfig } from './config'
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from './types'
import { getErrorMessage } from './utils'
import { getWebviewHtml } from './webviewHtml'

export function activate(context: vscode.ExtensionContext): void {
  const authService = new AuthService(context.secrets)
  const panels = new Set<vscode.WebviewPanel>()

  const broadcastAuthState = async () => {
    const snapshot = await authService.getSnapshot()
    panels.forEach(panel => {
      postToWebview(panel.webview, { type: 'auth:state', payload: snapshot })
    })
  }

  const openDisposable = vscode.commands.registerCommand(
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

      panels.add(panel)
      panel.onDidDispose(() => panels.delete(panel))

      panel.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
        void handleWebviewMessage(message, panel.webview, authService)
      })

      panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri)
    },
  )

  const loginDisposable = vscode.commands.registerCommand('baic.login', async () => {
    const email = await vscode.window.showInputBox({
      title: 'BAIC Login',
      prompt: 'Enter the email or identity token recognized by the backend.',
      ignoreFocusOut: true,
      validateInput: value => value.trim() ? undefined : 'Email is required',
    })

    if (!email) return

    try {
      await authService.login(email.trim(), getRuntimeConfig())
      await vscode.window.showInformationMessage('BAIC login succeeded')
      await broadcastAuthState()
    } catch (error) {
      await vscode.window.showErrorMessage(getErrorMessage(error))
    }
  })

  const logoutDisposable = vscode.commands.registerCommand('baic.logout', async () => {
    await authService.clear()
    await vscode.window.showInformationMessage('BAIC login state cleared')
    await broadcastAuthState()
  })

  context.subscriptions.push(openDisposable, loginDisposable, logoutDisposable)
}

async function handleWebviewMessage(
  message: WebviewToExtensionMessage,
  webview: vscode.Webview,
  authService: AuthService,
): Promise<void> {
  try {
    switch (message.type) {
      case 'auth:get':
        postToWebview(webview, {
          type: 'auth:state',
          payload: await authService.getSnapshot(),
        })
        return

      case 'auth:login':
        postToWebview(webview, {
          type: 'auth:state',
          payload: await authService.login(message.payload.email, getRuntimeConfig()),
        })
        return

      case 'auth:logout':
        await authService.clear()
        postToWebview(webview, {
          type: 'auth:state',
          payload: { status: 'unauthenticated' },
        })
        return
    }
  } catch (error) {
    postToWebview(webview, {
      type: 'auth:error',
      payload: { message: getErrorMessage(error) },
    })
  }
}

function postToWebview(
  webview: vscode.Webview,
  message: ExtensionToWebviewMessage,
): void {
  void webview.postMessage(message)
}

export function deactivate(): void {}
