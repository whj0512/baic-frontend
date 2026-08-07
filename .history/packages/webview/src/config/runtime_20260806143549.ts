export type AppTarget = 'local' | 'platform'

export interface RuntimeConfig {
  appTarget: AppTarget
  apiBaseUrl: string
  projectWsBaseUrl: string
  qwenPawBaseUrl: string
  qwenPawChatTimeoutMs: number
  qwenPawUploadMaxBytes: number
  platformApiBaseUrl: string
  platformWebBaseUrl: string
  lspWs: {
    internalConstraints: string
    environment: string
    interaction: string
    internalComposition: string
    dialogMap: string
  }
}

declare global {
  interface Window {
    __BAIC_CONFIG__?: RuntimeConfig
  }
}

function readPositiveNumber(value: unknown, fallback: number): number {
  const parsedValue =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback
}

const envConfig: RuntimeConfig = {
  appTarget: import.meta.env.VITE_APP_TARGET === 'platform' ? 'platform' : 'local',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  projectWsBaseUrl: import.meta.env.VITE_WS_BASE_URL ?? '',
  qwenPawBaseUrl: import.meta.env.VITE_QWENPAW_BASE_URL ?? '',
  qwenPawChatTimeoutMs: readPositiveNumber(
    import.meta.env.VITE_QWENPAW_CHAT_TIMEOUT_MS,
    120000,
  ),
  qwenPawUploadMaxBytes: readPositiveNumber(
    import.meta.env.VITE_QWENPAW_UPLOAD_MAX_BYTES,
    20 * 1024 * 1024,
  ),
  platformApiBaseUrl: import.meta.env.VITE_PLATFORM_API_BASE_URL ?? '',
  platformWebBaseUrl: import.meta.env.VITE_PLATFORM_WEB_BASE_URL ?? '',
  lspWs: {
    internalConstraints:
      import.meta.env.VITE_LSP_WS_INTERNAL_CONSTRAINTS ?? 'ws://127.0.0.1:3000',
    environment:
      import.meta.env.VITE_LSP_WS_ENVIRONMENT ?? 'ws://127.0.0.1:3001',
    interaction:
      import.meta.env.VITE_LSP_WS_INTERACTION ?? 'ws://127.0.0.1:3002',
    internalComposition:
      import.meta.env.VITE_LSP_WS_INTERNAL_COMPOSITION ?? 'ws://127.0.0.1:3003',
    dialogMap:
      import.meta.env.VITE_LSP_WS_DIALOG_MAP ?? 'ws://127.0.0.1;3004',
  },
}

export function getRuntimeConfig(): RuntimeConfig {
  const runtimeConfig = window.__BAIC_CONFIG__
  if (!runtimeConfig) {
    return envConfig
  }

  return {
    ...runtimeConfig,
    qwenPawChatTimeoutMs: readPositiveNumber(
      runtimeConfig.qwenPawChatTimeoutMs,
      envConfig.qwenPawChatTimeoutMs,
    ),
    qwenPawUploadMaxBytes: readPositiveNumber(
      runtimeConfig.qwenPawUploadMaxBytes,
      envConfig.qwenPawUploadMaxBytes,
    ),
  }
}
