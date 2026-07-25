import * as vscode from 'vscode'

import type { RuntimeConfig } from './types'

export type BackendMode = 'bundled' | 'external'

interface RuntimeConfigOverride {
  apiBaseUrl: string
  projectWsBaseUrl: string
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
    platformApiBaseUrl: config.get<string>('platformApiBaseUrl', ''),
    platformWebBaseUrl: config.get<string>('platformWebBaseUrl', ''),
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

export function getConnectSources(config: RuntimeConfig): string[] {
  return [
    getOrigin(config.apiBaseUrl),
    getOrigin(config.projectWsBaseUrl),
    getOrigin(config.qwenPawBaseUrl),
    getOrigin(config.platformApiBaseUrl),
    getOrigin(config.lspWs.internalConstraints),
    getOrigin(config.lspWs.environment),
    getOrigin(config.lspWs.interaction),
    getOrigin(config.lspWs.internalComposition),
  ].filter(Boolean)
}

function getOrigin(value: string): string {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}
