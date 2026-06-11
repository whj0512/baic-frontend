import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import * as net from 'net'
import * as path from 'path'
import * as vscode from 'vscode'

import { getBackendMode, getRuntimeConfig } from './config'
import type { RuntimeConfig } from './types'

const BACKEND_HOST = '127.0.0.1'
const BACKEND_PORT = 8000
const HEALTH_CHECK_TIMEOUT_MS = 20_000
const HEALTH_CHECK_INTERVAL_MS = 300
const STOP_TIMEOUT_MS = 3_000

export class BackendServiceManager {
  private readonly outputChannel = vscode.window.createOutputChannel('BAIC Backend')
  private process: ChildProcessWithoutNullStreams | undefined
  private runtimeConfig: RuntimeConfig | undefined
  private startPromise: Promise<RuntimeConfig> | undefined

  constructor(private readonly context: vscode.ExtensionContext) {}

  async start(): Promise<RuntimeConfig> {
    if (getBackendMode() === 'external') {
      return getRuntimeConfig()
    }

    if (this.runtimeConfig && this.process && !this.process.killed) {
      return this.runtimeConfig
    }

    this.startPromise ??= this.startBundledBackend().finally(() => {
      this.startPromise = undefined
    })

    return this.startPromise
  }

  getRuntimeConfig(): RuntimeConfig {
    return this.runtimeConfig ?? getRuntimeConfig()
  }

  async restart(): Promise<RuntimeConfig> {
    await this.stop()
    return this.start()
  }

  async stop(): Promise<void> {
    const child = this.process
    this.process = undefined
    this.runtimeConfig = undefined

    if (!child || child.killed) return

    this.outputChannel.appendLine('Stopping bundled backend...')
    const exited = new Promise<void>(resolve => {
      child.once('exit', () => resolve())
    })

    child.kill()

    await Promise.race([
      exited,
      new Promise<void>(resolve => {
        setTimeout(resolve, STOP_TIMEOUT_MS)
      }),
    ])

    if (!child.killed) {
      child.kill('SIGKILL')
    }
  }

  showLogs(): void {
    this.outputChannel.show()
  }

  dispose(): void {
    void this.stop()
    this.outputChannel.dispose()
  }

  private async startBundledBackend(): Promise<RuntimeConfig> {
    const executablePath = this.getBundledBackendExecutablePath()
    const backendRoot = path.dirname(executablePath)
    const dataUri = vscode.Uri.joinPath(this.context.globalStorageUri, 'backend-data')
    await vscode.workspace.fs.createDirectory(dataUri)

    await assertBackendPortAvailable()
    const apiBaseUrl = `http://${BACKEND_HOST}:${BACKEND_PORT}`
    const runtimeConfig = getRuntimeConfig({
      apiBaseUrl,
      projectWsBaseUrl: `ws://${BACKEND_HOST}:${BACKEND_PORT}`,
    })

    this.outputChannel.appendLine(`Starting bundled backend: ${executablePath}`)
    this.outputChannel.appendLine(`Backend URL: ${apiBaseUrl}`)
    this.outputChannel.appendLine(`Backend data directory: ${dataUri.fsPath}`)

    const child = spawn(executablePath, [], {
      cwd: backendRoot,
      env: {
        ...process.env,
        BAIC_HOST: BACKEND_HOST,
        BAIC_PORT: String(BACKEND_PORT),
        BAIC_DATA_DIR: dataUri.fsPath,
        AUTH_ENABLED: '0',
      },
      windowsHide: true,
    })

    this.process = child
    this.runtimeConfig = runtimeConfig

    child.stdout.on('data', chunk => {
      this.outputChannel.append(chunk.toString())
    })
    child.stderr.on('data', chunk => {
      this.outputChannel.append(chunk.toString())
    })
    child.on('exit', (code, signal) => {
      this.outputChannel.appendLine(
        `Bundled backend exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`,
      )
      if (this.process === child) {
        this.process = undefined
        this.runtimeConfig = undefined
      }
    })
    child.on('error', error => {
      this.outputChannel.appendLine(`Bundled backend process error: ${error.message}`)
    })

    await this.waitForHealthCheck(apiBaseUrl, child)
    this.outputChannel.appendLine('Bundled backend is ready.')

    return runtimeConfig
  }

  private getBundledBackendExecutablePath(): string {
    if (process.platform !== 'win32' || process.arch !== 'x64') {
      throw new Error('Bundled backend currently supports Windows x64 only.')
    }

    const executableUri = vscode.Uri.joinPath(
      this.context.extensionUri,
      'server',
      'win32-x64',
      'baic-backend',
      'baic-backend.exe',
    )

    return executableUri.fsPath
  }

  private async waitForHealthCheck(
    apiBaseUrl: string,
    child: ChildProcessWithoutNullStreams,
  ): Promise<void> {
    const deadline = Date.now() + HEALTH_CHECK_TIMEOUT_MS
    let lastError = ''

    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`Bundled backend exited before it became ready. Exit code: ${child.exitCode}`)
      }

      try {
        const response = await fetch(`${apiBaseUrl}/`)
        if (response.ok) return
        lastError = `Health check returned ${response.status}`
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }

      await sleep(HEALTH_CHECK_INTERVAL_MS)
    }

    throw new Error(`Bundled backend did not become ready: ${lastError || 'timeout'}`)
  }
}

function assertBackendPortAvailable(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.once('error', error => {
      reject(
        new Error(
          `Bundled backend cannot start because ${BACKEND_HOST}:${BACKEND_PORT} is already in use or unavailable: ${error.message}`,
        ),
      )
    })
    server.listen(BACKEND_PORT, BACKEND_HOST, () => {
      server.close(() => resolve())
    })
  })
}

function sleep(timeoutMs: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, timeoutMs)
  })
}
