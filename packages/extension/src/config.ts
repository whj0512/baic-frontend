import * as vscode from 'vscode'

import type { RuntimeConfig } from './types'

export function getRuntimeConfig(): RuntimeConfig {
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

export function getConnectSources(config: RuntimeConfig): string[] {
  return [
    getOrigin(config.apiBaseUrl),
    getOrigin(config.projectWsBaseUrl),
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
