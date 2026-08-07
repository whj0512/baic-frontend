import * as vscode from 'vscode'
import { randomUUID } from 'crypto'

import { BackendServiceManager } from './backendService'
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from './types'
import { RequirementsSidebarProvider } from './sidebarView'
import { getErrorMessage } from './utils'
import { getWebviewHtml } from './webviewHtml'

let activeBackendService: BackendServiceManager | undefined
const INSTALLATION_ID_KEY = 'baic.sourceInstallationId'

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const backendService = new BackendServiceManager(context)
  activeBackendService = backendService
  const sidebarDisposable = vscode.window.registerWebviewViewProvider(
    'baicRequirementsManagerSidebar',
    new RequirementsSidebarProvider(),
  )

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

      panel.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
        void handleWebviewMessage(
          message,
          panel.webview,
          context.globalState,
        )
      })

      panel.webview.html = getWebviewHtml(
        panel.webview,
        context.extensionUri,
        runtimeConfig,
      )
    },
  )

  const startServices = async () => {
    try {
      await backendService.start()
      await vscode.window.showInformationMessage('BAIC local services are running')
    } catch (error) {
      await showBackendError(error, backendService)
    }
  }
  const stopServices = async () => {
    await backendService.stop()
    await vscode.window.showInformationMessage('BAIC local services stopped')
  }
  const restartServices = async () => {
    try {
      await backendService.restart()
      await vscode.window.showInformationMessage('BAIC local services restarted')
    } catch (error) {
      await showBackendError(error, backendService)
    }
  }
  const showServiceLogs = () => backendService.showLogs()
  const startServicesDisposables = ['baic.startServices', 'baic.startBackend']
    .map(command => vscode.commands.registerCommand(command, startServices))
  const stopServicesDisposables = ['baic.stopServices', 'baic.stopBackend']
    .map(command => vscode.commands.registerCommand(command, stopServices))
  const restartServicesDisposables = ['baic.restartServices', 'baic.restartBackend']
    .map(command => vscode.commands.registerCommand(command, restartServices))
  const showServiceLogsDisposables = ['baic.showServiceLogs', 'baic.showBackendLogs']
    .map(command => vscode.commands.registerCommand(command, showServiceLogs))

  context.subscriptions.push(
    sidebarDisposable,
    openDisposable,
    ...startServicesDisposables,
    ...stopServicesDisposables,
    ...restartServicesDisposables,
    ...showServiceLogsDisposables,
    backendService,
  )

  try {
    await backendService.start()
  } catch (error) {
    await showBackendError(error, backendService)
  }
}

async function handleWebviewMessage(
  message: WebviewToExtensionMessage,
  webview: vscode.Webview,
  globalState: vscode.Memento,
): Promise<void> {
  try {
    switch (message.type) {
      case 'clipboard:readText':
        postToWebview(webview, {
          type: 'clipboard:text',
          payload: {
            requestId: message.payload.requestId,
            text: await vscode.env.clipboard.readText(),
          },
        })
        return

      case 'installation:get': {
        let installationId = globalState.get<string>(INSTALLATION_ID_KEY)
        if (!installationId) {
          installationId = randomUUID()
          await globalState.update(INSTALLATION_ID_KEY, installationId)
        }

        postToWebview(webview, {
          type: 'installation:id',
          payload: {
            requestId: message.payload.requestId,
            installationId,
          },
        })
        return
      }

      case 'path:select': {
        const selection = await vscode.window.showOpenDialog({
          title: message.payload.title,
          openLabel: message.payload.openLabel,
          canSelectFiles: message.payload.kind === 'file',
          canSelectFolders: message.payload.kind === 'folder',
          canSelectMany: false,
          filters: message.payload.filters,
        })
        postToWebview(webview, {
          type: 'path:selected',
          payload: {
            requestId: message.payload.requestId,
            path: selection?.[0]?.fsPath ?? null,
          },
        })
        return
      }
    }
  } catch (error) {
    switch (message.type) {
      case 'clipboard:readText':
        postToWebview(webview, {
          type: 'clipboard:error',
          payload: {
            requestId: message.payload.requestId,
            message: getErrorMessage(error),
          },
        })
        return

      case 'installation:get':
        postToWebview(webview, {
          type: 'installation:error',
          payload: {
            requestId: message.payload.requestId,
            message: getErrorMessage(error),
          },
        })
        return

      case 'path:select':
        postToWebview(webview, {
          type: 'path:error',
          payload: {
            requestId: message.payload.requestId,
            message: getErrorMessage(error),
          },
        })
        return
    }
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
    `BAIC local services failed to start: ${getErrorMessage(error)}`,
    'Show Logs',
  )

  if (action === 'Show Logs') {
    backendService.showLogs()
  }
}

export function deactivate(): void {
  activeBackendService?.dispose()
}
