export interface LspWsConfig {
  internalConstraints: string
  environment: string
  interaction: string
  internalComposition: string
}

export interface RuntimeConfig {
  appTarget: 'local' | 'platform'
  apiBaseUrl: string
  projectWsBaseUrl: string
  qwenPawBaseUrl: string
  platformApiBaseUrl: string
  platformWebBaseUrl: string
  lspWs: LspWsConfig
}

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export interface AuthSnapshot {
  status: AuthStatus
  token?: string
  user?: {
    id: string
    email: string
  }
  expiresAt?: number
}

export type WebviewToExtensionMessage =
  | { type: 'auth:get' }
  | { type: 'auth:login'; payload: { email: string } }
  | { type: 'auth:logout' }
  | { type: 'clipboard:readText'; payload: { requestId: string } }
  | { type: 'installation:get'; payload: { requestId: string } }

export type ExtensionToWebviewMessage =
  | { type: 'auth:state'; payload: AuthSnapshot }
  | { type: 'auth:error'; payload: { message: string } }
  | { type: 'clipboard:text'; payload: { requestId: string; text: string } }
  | { type: 'clipboard:error'; payload: { requestId: string; message: string } }
  | { type: 'installation:id'; payload: { requestId: string; installationId: string } }
  | { type: 'installation:error'; payload: { requestId: string; message: string } }
