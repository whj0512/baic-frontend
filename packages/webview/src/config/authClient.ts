type WebviewToExtensionMessage =
  | { type: 'clipboard:readText'; payload: { requestId: string } }
  | { type: 'installation:get'; payload: { requestId: string } }

type ExtensionToWebviewMessage =
  | { type: 'clipboard:text'; payload: { requestId: string; text: string } }
  | { type: 'clipboard:error'; payload: { requestId: string; message: string } }
  | { type: 'installation:id'; payload: { requestId: string; installationId: string } }
  | { type: 'installation:error'; payload: { requestId: string; message: string } }

interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi
  }
}

const BROWSER_INSTALLATION_ID_KEY = 'baic.sourceInstallationId'
let vscodeApi: VsCodeApi | null | undefined
let messageListenerAttached = false

const pendingClipboardReads = new Map<string, {
  resolve: (text: string) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}>()
const pendingInstallationReads = new Map<string, {
  resolve: (installationId: string) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}>()

export function isExtensionAuthMode(): boolean {
  return typeof window.acquireVsCodeApi === 'function'
}

export function readExtensionClipboardText(): Promise<string> {
  if (!isExtensionAuthMode()) return navigator.clipboard?.readText?.() ?? Promise.resolve('')

  attachExtensionMessageListener()
  return new Promise((resolve, reject) => {
    const requestId = createRequestId()
    const timer = setTimeout(() => {
      pendingClipboardReads.delete(requestId)
      reject(new Error('Extension clipboard read timed out'))
    }, 5000)
    pendingClipboardReads.set(requestId, { resolve, reject, timer })
    postToExtension({ type: 'clipboard:readText', payload: { requestId } })
  })
}

export function getSourceInstallationId(): Promise<string> {
  if (!isExtensionAuthMode()) {
    const existing = localStorage.getItem(BROWSER_INSTALLATION_ID_KEY)
    if (existing) return Promise.resolve(existing)
    const installationId = createUuid()
    localStorage.setItem(BROWSER_INSTALLATION_ID_KEY, installationId)
    return Promise.resolve(installationId)
  }

  attachExtensionMessageListener()
  return new Promise((resolve, reject) => {
    const requestId = createRequestId()
    const timer = setTimeout(() => {
      pendingInstallationReads.delete(requestId)
      reject(new Error('Extension installation id read timed out'))
    }, 5000)
    pendingInstallationReads.set(requestId, { resolve, reject, timer })
    postToExtension({ type: 'installation:get', payload: { requestId } })
  })
}

function postToExtension(message: WebviewToExtensionMessage): void {
  getVsCodeApi()?.postMessage(message)
}

function getVsCodeApi(): VsCodeApi | null {
  if (!isExtensionAuthMode()) return null
  if (vscodeApi === undefined) vscodeApi = window.acquireVsCodeApi?.() ?? null
  return vscodeApi ?? null
}

function attachExtensionMessageListener(): void {
  if (messageListenerAttached || !isExtensionAuthMode()) return
  messageListenerAttached = true
  window.addEventListener('message', (event: MessageEvent<ExtensionToWebviewMessage>) => {
    const message = event.data
    if (message.type === 'clipboard:text') resolveClipboardRead(message.payload.requestId, message.payload.text)
    if (message.type === 'clipboard:error') rejectClipboardRead(message.payload.requestId, new Error(message.payload.message))
    if (message.type === 'installation:id') resolveInstallationRead(message.payload.requestId, message.payload.installationId)
    if (message.type === 'installation:error') rejectInstallationRead(message.payload.requestId, new Error(message.payload.message))
  })
}

function resolveClipboardRead(requestId: string, text: string): void {
  const pending = pendingClipboardReads.get(requestId)
  if (!pending) return
  clearTimeout(pending.timer)
  pendingClipboardReads.delete(requestId)
  pending.resolve(text)
}

function rejectClipboardRead(requestId: string, error: Error): void {
  const pending = pendingClipboardReads.get(requestId)
  if (!pending) return
  clearTimeout(pending.timer)
  pendingClipboardReads.delete(requestId)
  pending.reject(error)
}

function resolveInstallationRead(requestId: string, installationId: string): void {
  const pending = pendingInstallationReads.get(requestId)
  if (!pending) return
  clearTimeout(pending.timer)
  pendingInstallationReads.delete(requestId)
  pending.resolve(installationId)
}

function rejectInstallationRead(requestId: string, error: Error): void {
  const pending = pendingInstallationReads.get(requestId)
  if (!pending) return
  clearTimeout(pending.timer)
  pendingInstallationReads.delete(requestId)
  pending.reject(error)
}

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
