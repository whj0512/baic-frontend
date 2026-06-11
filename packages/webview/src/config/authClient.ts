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

type WebviewToExtensionMessage =
  | { type: 'auth:get' }
  | { type: 'auth:login'; payload: { email: string } }
  | { type: 'auth:logout' }
  | { type: 'clipboard:readText'; payload: { requestId: string } }

type ExtensionToWebviewMessage =
  | { type: 'auth:state'; payload: AuthSnapshot }
  | { type: 'auth:error'; payload: { message: string } }
  | { type: 'clipboard:text'; payload: { requestId: string; text: string } }
  | { type: 'clipboard:error'; payload: { requestId: string; message: string } }

type AuthListener = (snapshot: AuthSnapshot) => void

interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi
  }
}

const AUTH_CHANGE_EVENT = 'baic-auth-change'

let vscodeApi: VsCodeApi | null | undefined
let authSnapshot: AuthSnapshot = createInitialSnapshot()
let messageListenerAttached = false

const listeners = new Set<AuthListener>()
const pendingWaiters = new Set<{
  resolve: (snapshot: AuthSnapshot) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}>()
const pendingClipboardReads = new Map<string, {
  resolve: (text: string) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}>()

export function isExtensionAuthMode(): boolean {
  return typeof window.acquireVsCodeApi === 'function'
}

export function getAuthSnapshotSync(): AuthSnapshot {
  return authSnapshot
}

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function refreshAuthSnapshot(): Promise<AuthSnapshot> {
  if (!isExtensionAuthMode()) {
    const next = createBrowserSnapshot()
    setAuthSnapshot(next)
    return next
  }

  return requestAuthState({ type: 'auth:get' })
}

export async function getToken(): Promise<string | null> {
  const snapshot =
    authSnapshot.status === 'checking' ? await refreshAuthSnapshot() : authSnapshot

  if (snapshot.status !== 'authenticated' || !snapshot.token) {
    return null
  }

  if (isTokenExpired(snapshot.token)) {
    clearAuth()
    return null
  }

  return snapshot.token
}

export async function isAuthenticated(): Promise<boolean> {
  return Boolean(await getToken())
}

export function clearAuth(): void {
  if (isExtensionAuthMode()) {
    setAuthSnapshot({ status: 'unauthenticated' })
    postToExtension({ type: 'auth:logout' })
    return
  }

  localStorage.removeItem('token')
  localStorage.removeItem('user_id')
  localStorage.removeItem('username')
  setAuthSnapshot({ status: 'unauthenticated' })
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function saveBrowserAuth(data: {
  token: string
  userId: string
  username: string
}): void {
  localStorage.setItem('token', data.token)
  localStorage.setItem('user_id', data.userId)
  localStorage.setItem('username', data.username)
  setAuthSnapshot(createBrowserSnapshot())
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export async function loginWithEmail(email: string): Promise<AuthSnapshot> {
  if (!isExtensionAuthMode()) {
    throw new Error('Browser mode should use the existing auth endpoint directly')
  }

  return requestAuthState({ type: 'auth:login', payload: { email } })
}

export function readExtensionClipboardText(): Promise<string> {
  if (!isExtensionAuthMode()) {
    return navigator.clipboard?.readText?.() ?? Promise.resolve('')
  }

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

export function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return false

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded))

    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
  } catch {
    return false
  }
}

function createInitialSnapshot(): AuthSnapshot {
  if (typeof window === 'undefined') {
    return { status: 'unauthenticated' }
  }

  if (isExtensionAuthMode()) {
    return { status: 'checking' }
  }

  return createBrowserSnapshot()
}

function createBrowserSnapshot(): AuthSnapshot {
  const token = localStorage.getItem('token') ?? undefined
  const userId = localStorage.getItem('user_id') ?? undefined
  const username = localStorage.getItem('username') ?? undefined

  if (!token || isTokenExpired(token)) {
    if (token) {
      localStorage.removeItem('token')
      localStorage.removeItem('user_id')
      localStorage.removeItem('username')
    }
    return { status: 'unauthenticated' }
  }

  return {
    status: 'authenticated',
    token,
    user: userId && username ? { id: userId, email: username } : undefined,
    expiresAt: getTokenExpiresAt(token),
  }
}

function getTokenExpiresAt(token: string): number | undefined {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return undefined

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded))

    return typeof payload.exp === 'number' ? payload.exp * 1000 : undefined
  } catch {
    return undefined
  }
}

function requestAuthState(message: WebviewToExtensionMessage): Promise<AuthSnapshot> {
  attachExtensionMessageListener()

  return new Promise((resolve, reject) => {
    const waiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        pendingWaiters.delete(waiter)
        reject(new Error('Extension authentication timed out'))
      }, 10000),
    }
    pendingWaiters.add(waiter)
    postToExtension(message)
  })
}

function postToExtension(message: WebviewToExtensionMessage): void {
  const api = getVsCodeApi()
  if (!api) return
  api.postMessage(message)
}

function getVsCodeApi(): VsCodeApi | null {
  if (!isExtensionAuthMode()) return null

  if (vscodeApi === undefined) {
    vscodeApi = window.acquireVsCodeApi?.() ?? null
  }

  return vscodeApi ?? null
}

function attachExtensionMessageListener(): void {
  if (messageListenerAttached || !isExtensionAuthMode()) return

  messageListenerAttached = true
  window.addEventListener('message', (event: MessageEvent<ExtensionToWebviewMessage>) => {
    const message = event.data

    if (message.type === 'auth:state') {
      setAuthSnapshot(message.payload)
      resolvePending(message.payload)
      return
    }

    if (message.type === 'auth:error') {
      setAuthSnapshot({ status: 'unauthenticated' })
      rejectPending(new Error(message.payload.message))
      return
    }

    if (message.type === 'clipboard:text') {
      resolveClipboardRead(message.payload.requestId, message.payload.text)
      return
    }

    if (message.type === 'clipboard:error') {
      rejectClipboardRead(
        message.payload.requestId,
        new Error(message.payload.message),
      )
    }
  })
}

function setAuthSnapshot(snapshot: AuthSnapshot): void {
  authSnapshot = snapshot
  listeners.forEach(listener => listener(snapshot))
}

function resolvePending(snapshot: AuthSnapshot): void {
  pendingWaiters.forEach(waiter => {
    clearTimeout(waiter.timer)
    waiter.resolve(snapshot)
  })
  pendingWaiters.clear()
}

function rejectPending(error: Error): void {
  pendingWaiters.forEach(waiter => {
    clearTimeout(waiter.timer)
    waiter.reject(error)
  })
  pendingWaiters.clear()
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

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

window.addEventListener('storage', (event) => {
  if (event.key === 'token' && !isExtensionAuthMode()) {
    setAuthSnapshot(createBrowserSnapshot())
  }
})

window.addEventListener(AUTH_CHANGE_EVENT, () => {
  if (!isExtensionAuthMode()) {
    setAuthSnapshot(createBrowserSnapshot())
  }
})
