import * as vscode from 'vscode'

import type { LspWsConfig, RuntimeConfig } from './types'

export type BackendMode = 'bundled' | 'external'
export type LspMode = 'bundled' | 'external'

interface RuntimeConfigOverride {
  apiBaseUrl?: string
  projectWsBaseUrl?: string
  lspWs?: Partial<LspWsConfig>
}

export function getLspMode(): LspMode {
  const mode = vscode.workspace
    .getConfiguration('baic')
    .get<string>('lsp.mode', 'bundled')

  return mode === 'external' ? 'external' : 'bundled'
}

export function getGraphdbConfigPath(): string {
  return vscode.workspace
    .getConfiguration('baic')
    .get<string>('graphdbConfigPath', '')
    .trim()
}

export function getBackendMode(): BackendMode {
  const config = vscode.workspace.getConfiguration('baic')
  const mode = config.get<string>('backend.mode', 'bundled')

  return mode === 'external' ? 'external' : 'bundled'
}

export function getRuntimeConfig(
  override?: RuntimeConfigOverride,
): RuntimeConfig {
  const config = vscode.workspace.getConfiguration('baic')

  return {
    appTarget: 'local',
    apiBaseUrl:
      override?.apiBaseUrl ??
      config.get<string>('apiBaseUrl', 'http://localhost:8000'),
    projectWsBaseUrl:
      override?.projectWsBaseUrl ??
      config.get<string>('projectWsBaseUrl', 'ws://localhost:8000'),
    qwenPawBaseUrl: config.get<string>(
      'qwenPawBaseUrl',
      'http://localhost:7706',
    ),
    qwenPawChatTimeoutMs: config.get<number>(
      'qwenPawChatTimeoutMs',
      120000,
    ),
    qwenPawUploadMaxBytes: config.get<number>(
      'qwenPawUploadMaxBytes',
      20 * 1024 * 1024,
    ),
    lspWs: {
      internalConstraints: override?.lspWs?.internalConstraints ?? config.get<string>(
        'lspWs.internalConstraints',
        'ws://127.0.0.1:3000',
      ),
      environment: override?.lspWs?.environment ?? config.get<string>(
        'lspWs.environment',
        'ws://127.0.0.1:3001',
      ),
      interaction: override?.lspWs?.interaction ?? config.get<string>(
        'lspWs.interaction',
        'ws://127.0.0.1:3002',
      ),
      internalComposition: override?.lspWs?.internalComposition ?? config.get<string>(
        'lspWs.internalComposition',
        'ws://127.0.0.1:3003',
      ),
      dialogMap: override?.lspWs?.dialogMap ?? config.get<string>(
        'lspWs.dialogMap',
        'ws://127.0.0.1:3004',
      ),
    },
  }
}

export function getConnectSources(config: RuntimeConfig): string[] {
  return [
    getOrigin(config.apiBaseUrl),
    getOrigin(config.projectWsBaseUrl),
    getOrigin(config.qwenPawBaseUrl),
    getOrigin(config.lspWs.internalConstraints),
    getOrigin(config.lspWs.environment),
    getOrigin(config.lspWs.interaction),
    getOrigin(config.lspWs.internalComposition),
    getOrigin(config.lspWs.dialogMap),
  ].filter(Boolean)
}

function getOrigin(value: string): string {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}
