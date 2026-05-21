export interface LspWsConfig {
  internalConstraints: string
  environment: string
  interaction: string
  internalComposition: string
}

export interface RuntimeConfig {
  apiBaseUrl: string
  projectWsBaseUrl: string
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

export type ExtensionToWebviewMessage =
  | { type: 'auth:state'; payload: AuthSnapshot }
  | { type: 'auth:error'; payload: { message: string } }
