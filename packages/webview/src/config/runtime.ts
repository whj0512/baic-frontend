export interface RuntimeConfig {
  apiBaseUrl: string
  projectWsBaseUrl: string
  lspWs: {
    internalConstraints: string
    environment: string
    interaction: string
    internalComposition: string
  }
}

declare global {
  interface Window {
    __BAIC_CONFIG__?: RuntimeConfig
  }
}

const envConfig: RuntimeConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  projectWsBaseUrl: import.meta.env.VITE_WS_BASE_URL ?? '',
  lspWs: {
    internalConstraints:
      import.meta.env.VITE_LSP_WS_INTERNAL_CONSTRAINTS ?? 'ws://127.0.0.1:3000',
    environment:
      import.meta.env.VITE_LSP_WS_ENVIRONMENT ?? 'ws://127.0.0.1:3001',
    interaction:
      import.meta.env.VITE_LSP_WS_INTERACTION ?? 'ws://127.0.0.1:3002',
    internalComposition:
      import.meta.env.VITE_LSP_WS_INTERNAL_COMPOSITION ?? 'ws://127.0.0.1:3003',
  },
}

export function getRuntimeConfig(): RuntimeConfig {
  return window.__BAIC_CONFIG__ ?? envConfig
}
