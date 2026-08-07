export interface LspWsConfig {
  internalConstraints: string
  environment: string
  interaction: string
  internalComposition: string
  dialogMap: string
}

export interface RuntimeConfig {
  appTarget: 'local' | 'platform'
  apiBaseUrl: string
  projectWsBaseUrl: string
  qwenPawBaseUrl: string
  qwenPawChatTimeoutMs: number
  qwenPawUploadMaxBytes: number
  platformApiBaseUrl: string
  platformWebBaseUrl: string
  lspWs: LspWsConfig
}

export type WebviewToExtensionMessage =
  | { type: 'clipboard:readText'; payload: { requestId: string } }
  | { type: 'installation:get'; payload: { requestId: string } }
  | {
      type: 'path:select'
      payload: {
        requestId: string
        kind: 'file' | 'folder'
        title: string
        openLabel: string
        filters?: Record<string, string[]>
      }
    }

export type ExtensionToWebviewMessage =
  | { type: 'clipboard:text'; payload: { requestId: string; text: string } }
  | { type: 'clipboard:error'; payload: { requestId: string; message: string } }
  | { type: 'installation:id'; payload: { requestId: string; installationId: string } }
  | { type: 'installation:error'; payload: { requestId: string; message: string } }
  | { type: 'path:selected'; payload: { requestId: string; path: string | null } }
  | { type: 'path:error'; payload: { requestId: string; message: string } }
