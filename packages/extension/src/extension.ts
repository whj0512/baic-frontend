import * as vscode from 'vscode'

import { AuthService } from './auth'
import { BackendServiceManager } from './backendService'
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from './types'
import { RequirementsSidebarProvider } from './sidebarView'
import { getErrorMessage } from './utils'
import { getWebviewHtml } from './webviewHtml'

let activeBackendService: BackendServiceManager | undefined

export function activate(context: vscode.ExtensionContext): void {
  const authService = new AuthService(context.secrets, context.extensionUri)
  const backendService = new BackendServiceManager(context)
  activeBackendService = backendService
  const panels = new Set<vscode.WebviewPanel>()
  const sidebarDisposable = vscode.window.registerWebviewViewProvider(
    'baicRequirementsManagerSidebar',
    new RequirementsSidebarProvider(),
  )

  const broadcastAuthState = async () => {
    const snapshot = await authService.getSnapshot()
    panels.forEach(panel => {
      postToWebview(panel.webview, { type: 'auth:state', payload: snapshot })
    })
  }

  const openDisposable = vscode.commands.registerCommand(
    'baic.openRequirementsManager',
    async () => {
      let runtimeConfig
      try {
        runtimeConfig = await backendService.start()
      } catch (error) {
        await showBackendError(error, backendService)
        return
      }

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
        void handleWebviewMessage(message, panel.webview, authService, backendService)
      })

      panel.webview.html = getWebviewHtml(
        panel.webview,
        context.extensionUri,
        runtimeConfig,
      )
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
      const runtimeConfig = await backendService.start()
      await authService.login(email.trim(), runtimeConfig)
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

  const startBackendDisposable = vscode.commands.registerCommand(
    'baic.startBackend',
    async () => {
      try {
        await backendService.start()
        await vscode.window.showInformationMessage('BAIC backend is running')
      } catch (error) {
        await showBackendError(error, backendService)
      }
    },
  )

  const stopBackendDisposable = vscode.commands.registerCommand(
    'baic.stopBackend',
    async () => {
      await backendService.stop()
      await vscode.window.showInformationMessage('BAIC backend stopped')
    },
  )

  const restartBackendDisposable = vscode.commands.registerCommand(
    'baic.restartBackend',
    async () => {
      try {
        await backendService.restart()
        await vscode.window.showInformationMessage('BAIC backend restarted')
      } catch (error) {
        await showBackendError(error, backendService)
      }
    },
  )

  const showBackendLogsDisposable = vscode.commands.registerCommand(
    'baic.showBackendLogs',
    () => {
      backendService.showLogs()
    },
  )

  context.subscriptions.push(
    sidebarDisposable,
    openDisposable,
    loginDisposable,
    logoutDisposable,
    startBackendDisposable,
    stopBackendDisposable,
    restartBackendDisposable,
    showBackendLogsDisposable,
    {
      dispose: () => {
        void backendService.stop()
      },
    },
  )
}

async function handleWebviewMessage(
  message: WebviewToExtensionMessage,
  webview: vscode.Webview,
  authService: AuthService,
  backendService: BackendServiceManager,
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
        const runtimeConfig = await backendService.start()
        postToWebview(webview, {
          type: 'auth:state',
          payload: await authService.login(message.payload.email, runtimeConfig),
        })
        return

      case 'auth:logout':
        await authService.clear()
        postToWebview(webview, {
          type: 'auth:state',
          payload: { status: 'unauthenticated' },
        })
        return

      case 'clipboard:readText':
        postToWebview(webview, {
          type: 'clipboard:text',
          payload: {
            requestId: message.payload.requestId,
            text: await vscode.env.clipboard.readText(),
          },
        })
        return
    }
  } catch (error) {
    if (message.type === 'clipboard:readText') {
      postToWebview(webview, {
        type: 'clipboard:error',
        payload: {
          requestId: message.payload.requestId,
          message: getErrorMessage(error),
        },
      })
      return
    }

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

async function showBackendError(
  error: unknown,
  backendService: BackendServiceManager,
): Promise<void> {
  const action = await vscode.window.showErrorMessage(
    `BAIC backend failed to start: ${getErrorMessage(error)}`,
    'Show Logs',
  )

  if (action === 'Show Logs') {
    backendService.showLogs()
  }
}

export function deactivate(): void {
  void activeBackendService?.stop()
}
