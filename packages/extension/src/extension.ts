import * as vscode from 'vscode'

interface LspWsConfig {
  internalConstraints: string
  environment: string
  interaction: string
  internalComposition: string
}

interface RuntimeConfig {
  apiBaseUrl: string
  projectWsBaseUrl: string
  lspWs: LspWsConfig
}

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthSnapshot {
  status: AuthStatus
  token?: string
  user?: {
    id: string
    email: string
  }
  expiresAt?: number
}

type WebviewToExtensionMessage =
  | { type: 'auth:get' }
  | { type: 'auth:login'; payload: { email: string } }
  | { type: 'auth:logout' }

type ExtensionToWebviewMessage =
  | { type: 'auth:state'; payload: AuthSnapshot }
  | { type: 'auth:error'; payload: { message: string } }

const SECRET_TOKEN = 'baic.auth.token'
const SECRET_USER_ID = 'baic.auth.userId'
const SECRET_USERNAME = 'baic.auth.username'
const SECRET_EXPIRES_AT = 'baic.auth.expiresAt'

class AuthService {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getSnapshot(): Promise<AuthSnapshot> {
    const token = await this.secrets.get(SECRET_TOKEN)
    if (!token) {
      return { status: 'unauthenticated' }
    }

    const storedExpiresAt = Number(await this.secrets.get(SECRET_EXPIRES_AT))
    const expiresAt = Number.isFinite(storedExpiresAt)
      ? storedExpiresAt
      : getTokenExpiresAt(token)

    if ((expiresAt && expiresAt <= Date.now()) || isTokenExpired(token)) {
      await this.clear()
      return { status: 'unauthenticated' }
    }

    const userId = await this.secrets.get(SECRET_USER_ID)
    const username = await this.secrets.get(SECRET_USERNAME)

    return {
      status: 'authenticated',
      token,
      user: userId && username ? { id: userId, email: username } : undefined,
      expiresAt,
    }
  }

  async login(email: string, config: RuntimeConfig): Promise<AuthSnapshot> {
    const response = await fetch(`${config.apiBaseUrl}/auth/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const data = await readJsonObject(response)
    if (!response.ok) {
      throw new Error(getString(data.detail) || `Auth request failed: ${response.status}`)
    }

    if (data.matched !== true || typeof data.token !== 'string') {
      throw new Error('Authentication failed')
    }

    const userId = getString(data.user_id) || getString(data.id) || ''
    const username = getString(data.email) || email
    const expiresAt = getTokenExpiresAt(data.token)

    await this.secrets.store(SECRET_TOKEN, data.token)
    await this.secrets.store(SECRET_USER_ID, userId)
    await this.secrets.store(SECRET_USERNAME, username)
    if (expiresAt) {
      await this.secrets.store(SECRET_EXPIRES_AT, String(expiresAt))
    } else {
      await this.secrets.delete(SECRET_EXPIRES_AT)
    }

    return this.getSnapshot()
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.secrets.delete(SECRET_TOKEN),
      this.secrets.delete(SECRET_USER_ID),
      this.secrets.delete(SECRET_USERNAME),
      this.secrets.delete(SECRET_EXPIRES_AT),
    ])
  }
}

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

function getWebviewHtml(
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

function getRuntimeConfig(): RuntimeConfig {
  const config = vscode.workspace.getConfiguration('baic')

  return {
    apiBaseUrl: config.get<string>('apiBaseUrl', 'http://localhost:8000'),
    projectWsBaseUrl: config.get<string>(
      'projectWsBaseUrl',
      'ws://localhost:8000',
    ),
    lspWs: {
      internalConstraints: config.get<string>(
        'lspWs.internalConstraints',
        'ws://127.0.0.1:3000',
      ),
      environment: config.get<string>(
        'lspWs.environment',
        'ws://127.0.0.1:3001',
      ),
      interaction: config.get<string>(
        'lspWs.interaction',
        'ws://127.0.0.1:3002',
      ),
      internalComposition: config.get<string>(
        'lspWs.internalComposition',
        'ws://127.0.0.1:3003',
      ),
    },
  }
}

async function readJsonObject(response: Response): Promise<Record<string, unknown>> {
  try {
    const data = await response.json()
    return typeof data === 'object' && data !== null
      ? data as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

function isTokenExpired(token: string): boolean {
  const expiresAt = getTokenExpiresAt(token)
  return Boolean(expiresAt && expiresAt <= Date.now())
}

function getTokenExpiresAt(token: string): number | undefined {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return undefined

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : undefined
  } catch {
    return undefined
  }
}

function getOrigin(value: string): string {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
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

export function deactivate(): void {}
