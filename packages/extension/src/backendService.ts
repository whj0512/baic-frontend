import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { existsSync } from 'fs'
import * as net from 'net'
import * as path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'

import {
  getBackendMode,
  getGraphdbConfigPath,
  getLspMode,
  getRuntimeConfig,
} from './config'
import type { RuntimeConfig } from './types'

const HOST = '127.0.0.1'
const BACKEND_PORT = 8000
const START_TIMEOUT_MS = 20_000
const HEALTH_CHECK_INTERVAL_MS = 300
const STOP_TIMEOUT_MS = 3_000
const execFileAsync = promisify(execFile)

const LSP_SERVICES = [
  { name: 'Internal constraints LSP', port: 3000, grammar: 'requirement.tx', configKey: 'internalConstraints' },
  { name: 'Environment LSP', port: 3001, grammar: 'environment.tx', configKey: 'environment' },
  { name: 'Interaction LSP', port: 3002, grammar: 'scenario.tx', configKey: 'interaction' },
  { name: 'Internal composition LSP', port: 3003, grammar: 'composition.tx', configKey: 'internalComposition' },
  { name: 'DialogMap LSP', port: 3004, grammar: 'grammar_dialogmap.tx', configKey: 'dialogMap' },
] as const

type ServiceProcess = {
  name: string
  child: ChildProcessWithoutNullStreams
}

export class BackendServiceManager implements vscode.Disposable {
  private readonly outputChannel = vscode.window.createOutputChannel('BAIC Local Services')
  private processes: ServiceProcess[] = []
  private runtimeConfig: RuntimeConfig | undefined
  private startPromise: Promise<RuntimeConfig> | undefined

  constructor(private readonly context: vscode.ExtensionContext) {}

  async start(): Promise<RuntimeConfig> {
    if (this.runtimeConfig && this.isRunning()) return this.runtimeConfig

    if (this.runtimeConfig) await this.stop()

    this.startPromise ??= this.startServices().finally(() => {
      this.startPromise = undefined
    })

    return this.startPromise
  }

  getRuntimeConfig(): RuntimeConfig {
    return this.runtimeConfig ?? this.createRuntimeConfig()
  }

  async restart(): Promise<RuntimeConfig> {
    await this.stop()
    return this.start()
  }

  async stop(): Promise<void> {
    const processes = this.processes
    this.processes = []
    this.runtimeConfig = undefined

    await Promise.all(processes.map(process => this.stopProcess(process)))
  }

  showLogs(): void {
    this.outputChannel.show()
  }

  dispose(): void {
    void this.stop()
    this.outputChannel.dispose()
  }

  private async startServices(): Promise<RuntimeConfig> {
    const startBackend = getBackendMode() === 'bundled'
    const startLsp = getLspMode() === 'bundled'
    const config = this.createRuntimeConfig()

    if (!startBackend && !startLsp) {
      this.outputChannel.appendLine('Using external BAIC backend and language servers.')
      this.runtimeConfig = config
      return config
    }

    const ports = [
      ...(startBackend ? [{ name: 'BAIC-local', port: BACKEND_PORT }] : []),
      ...(startLsp ? LSP_SERVICES.map(({ name, port }) => ({ name, port })) : []),
    ]
    await Promise.all(ports.map(({ name, port }) => assertPortAvailable(name, port)))

    const started: ServiceProcess[] = []
    this.processes = started
    try {
      const readiness = [
        ...(startBackend ? [this.startBackend(started, config.apiBaseUrl)] : []),
        ...(startLsp ? LSP_SERVICES.map(service => this.startLsp(started, service)) : []),
      ]
      await Promise.all(readiness)
      this.runtimeConfig = config
      this.outputChannel.appendLine('All bundled BAIC local services are ready.')
      return config
    } catch (error) {
      this.outputChannel.appendLine(`Local service startup failed: ${getErrorMessage(error)}`)
      await this.stop()
      throw error
    }
  }

  private createRuntimeConfig(): RuntimeConfig {
    const backendBundled = getBackendMode() === 'bundled'
    const lspBundled = getLspMode() === 'bundled'
    const lspWs = Object.fromEntries(
      LSP_SERVICES.map(({ configKey, port }) => [configKey, `ws://${HOST}:${port}`]),
    )

    return getRuntimeConfig({
      ...(backendBundled
        ? {
            apiBaseUrl: `http://${HOST}:${BACKEND_PORT}`,
            projectWsBaseUrl: `ws://${HOST}:${BACKEND_PORT}`,
          }
        : {}),
      ...(lspBundled ? { lspWs } : {}),
    })
  }

  private startBackend(started: ServiceProcess[], apiBaseUrl: string): Promise<void> {
    const executablePath = this.getExecutablePath('baic-local', 'baic-local.exe')
    const dataUri = vscode.Uri.joinPath(this.context.globalStorageUri, 'backend-data')
    const graphdbConfigPath = getGraphdbConfigPath()
    if (graphdbConfigPath && !existsSync(graphdbConfigPath)) {
      throw new Error(`Configured GraphDB config file does not exist: ${graphdbConfigPath}`)
    }

    const child = spawn(executablePath, [], {
      cwd: path.dirname(executablePath),
      env: {
        ...process.env,
        BAIC_HOST: HOST,
        BAIC_PORT: String(BACKEND_PORT),
        BAIC_DATA_DIR: dataUri.fsPath,
        AUTH_ENABLED: '0',
        ...(graphdbConfigPath ? { GRAPHDB_CONFIG_PATH: graphdbConfigPath } : {}),
      },
      windowsHide: true,
    })
    const service = { name: 'BAIC-local', child }
    started.push(service)
    this.attachOutput(service)

    return this.waitForBackendHealth(apiBaseUrl, child)
  }

  private startLsp(
    started: ServiceProcess[],
    service: (typeof LSP_SERVICES)[number],
  ): Promise<void> {
    const executablePath = this.getExecutablePath('textx-dsl-server', 'textx-dsl-server.exe')
    const child = spawn(executablePath, [
      '--ws',
      '--host', HOST,
      '--port', String(service.port),
      '--grammar-name', service.grammar,
    ], {
      cwd: path.dirname(executablePath),
      env: process.env,
      windowsHide: true,
    })
    const serviceProcess = { name: service.name, child }
    started.push(serviceProcess)
    this.attachOutput(serviceProcess)

    return this.waitForLspReady(serviceProcess, service.port)
  }

  private getExecutablePath(serviceDirectory: string, executableName: string): string {
    if (process.platform !== 'win32' || process.arch !== 'x64') {
      throw new Error('Bundled local services currently support Windows x64 only.')
    }

    return vscode.Uri.joinPath(
      this.context.extensionUri,
      'server',
      'win32-x64',
      serviceDirectory,
      executableName,
    ).fsPath
  }

  private attachOutput(service: ServiceProcess): void {
    const write = (stream: 'stdout' | 'stderr', chunk: Buffer) => {
      this.outputChannel.append(`[${service.name}/${stream}] ${chunk.toString()}`)
    }
    service.child.stdout.on('data', chunk => write('stdout', chunk))
    service.child.stderr.on('data', chunk => write('stderr', chunk))
    service.child.on('error', error => {
      this.outputChannel.appendLine(`[${service.name}] process error: ${error.message}`)
    })
    service.child.on('exit', (code, signal) => {
      this.outputChannel.appendLine(
        `[${service.name}] exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`,
      )
    })
  }

  private async waitForBackendHealth(
    apiBaseUrl: string,
    child: ChildProcessWithoutNullStreams,
  ): Promise<void> {
    const deadline = Date.now() + START_TIMEOUT_MS
    let lastError = ''
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`BAIC-local exited before it became ready. Exit code: ${child.exitCode}`)
      }
      try {
        const response = await fetch(`${apiBaseUrl}/health`)
        if (response.ok) return
        lastError = `health check returned ${response.status}`
      } catch (error) {
        lastError = getErrorMessage(error)
      }
      await sleep(HEALTH_CHECK_INTERVAL_MS)
    }
    throw new Error(`BAIC-local did not become ready: ${lastError || 'timeout'}`)
  }

  private waitForLspReady(process: ServiceProcess, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const marker = `BAIC_LSP_READY {"host":"${HOST}","port":${port}}`
      let stdout = ''
      const timeout = setTimeout(() => {
        reject(new Error(`${process.name} did not become ready within ${START_TIMEOUT_MS}ms`))
      }, START_TIMEOUT_MS)
      const finish = (callback: () => void) => {
        clearTimeout(timeout)
        process.child.stdout.off('data', onData)
        process.child.off('error', onError)
        process.child.off('exit', onExit)
        callback()
      }
      const onData = (chunk: Buffer) => {
        stdout += chunk.toString()
        if (stdout.includes(marker)) finish(resolve)
      }
      const onError = (error: Error) => finish(() => reject(error))
      const onExit = (code: number | null) => {
        finish(() => reject(new Error(`${process.name} exited before readiness (code=${code ?? 'null'})`)))
      }
      process.child.stdout.on('data', onData)
      process.child.once('error', onError)
      process.child.once('exit', onExit)
    })
  }

  private isRunning(): boolean {
    const expectedProcesses =
      (getBackendMode() === 'bundled' ? 1 : 0) +
      (getLspMode() === 'bundled' ? LSP_SERVICES.length : 0)
    return this.processes.length === expectedProcesses && this.processes.every(({ child }) => child.exitCode === null)
  }

  private async stopProcess(process: ServiceProcess): Promise<void> {
    const { child } = process
    if (child.exitCode !== null || !child.pid) return
    this.outputChannel.appendLine(`Stopping ${process.name} (pid=${child.pid})...`)
    const exited = waitForExit(child)
    child.kill()
    if (await Promise.race([exited.then(() => true), sleep(STOP_TIMEOUT_MS).then(() => false)])) return

    try {
      await execFileAsync('taskkill', ['/PID', String(child.pid), '/T', '/F'])
    } catch (error) {
      this.outputChannel.appendLine(`Failed to force-stop ${process.name}: ${getErrorMessage(error)}`)
    }
  }
}

function assertPortAvailable(name: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', error => {
      reject(new Error(`${name} cannot start because ${HOST}:${port} is in use or unavailable: ${error.message}`))
    })
    server.listen(port, HOST, () => {
      server.close(() => resolve())
    })
  })
}

function waitForExit(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise(resolve => {
    child.once('exit', () => resolve())
  })
}

function sleep(timeoutMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeoutMs))
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
