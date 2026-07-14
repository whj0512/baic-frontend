// API 配置

import {
  clearAuth as clearClientAuth,
  getToken as getClientToken,
  isAuthenticated as isClientAuthenticated,
  isExtensionAuthMode,
  isTokenExpired as isClientTokenExpired,
} from './authClient'
import { getRuntimeConfig } from './runtime'

const runtimeConfig = getRuntimeConfig()

// 后端服务地址（浏览器模式来自 env，extension 模式来自宿主注入）
export const SERVICE_BASE_URL = runtimeConfig.apiBaseUrl

// WebSocket 服务地址（浏览器模式来自 env，extension 模式来自宿主注入）
export const WS_BASE_URL = runtimeConfig.projectWsBaseUrl

// WebSocket 端点
export const WS_ENDPOINTS = {
  projectSync: (projectId: string) =>
    `${WS_BASE_URL}/ws/projects/${projectId}`,
}

// API 端点
export const API_ENDPOINTS = {
  // 通用图 JSON ↔ DSL 转换（SC 维度使用通用端点）
  rbgToDsl: `${SERVICE_BASE_URL}/rbg-to-dsl`,
  dslToRbg: `${SERVICE_BASE_URL}/dsl-to-rbg`,

  // 按维度的图 JSON ↔ DSL 转换（v2 新增）
  rbgToDslIBD: `${SERVICE_BASE_URL}/rbg-to-dsl/IBD`,
  dslToRbgIBD: `${SERVICE_BASE_URL}/dsl-to-rbg/IBD`,
  rbgToDslBDD: `${SERVICE_BASE_URL}/rbg-to-dsl/BDD`,
  dslToRbgBDD: `${SERVICE_BASE_URL}/dsl-to-rbg/BDD`,
  rbgToDslESD: `${SERVICE_BASE_URL}/rbg-to-dsl/ESD`,
  dslToRbgESD: `${SERVICE_BASE_URL}/dsl-to-rbg/ESD`,
  dslToRbgISD: `${SERVICE_BASE_URL}/dsl-to-rbg/ISD`,

  // 将自然语言转换为 DSL
  nlToDsl: `${SERVICE_BASE_URL}/nl-to-dsl`,
  // 用户注册
  register: `${SERVICE_BASE_URL}/register`,
  // 用户登录
  login: `${SERVICE_BASE_URL}/login`,
  // 项目管理
  projects: `${SERVICE_BASE_URL}/projects`,
  projectSnapshot: (projectId: string) =>
    `${SERVICE_BASE_URL}/projects/${encodeURIComponent(projectId)}/snapshot?schema_version=1`,
  // 需求管理
  requirements: `${SERVICE_BASE_URL}/requirements`,
  // 单条需求操作（GET / PUT / DELETE）
  requirementById: (id: string) => `${SERVICE_BASE_URL}/requirements/${id}`,
  // 需求间依赖关系
  dependency: `${SERVICE_BASE_URL}/dependency`,
  // 鉴权登录
  auth: `${SERVICE_BASE_URL}/auth/email`,
}

// 已有系统的登录页面地址 (可按需修改)
export const EXISTING_SYSTEM_LOGIN_URL = 'www.baidu.com';


// ─── 身份认证工具函数 ────────────────────────────────────────────────

/**
 * 从 localStorage 获取当前 JWT token。
 */
export function getToken(): Promise<string | null> {
  return getClientToken()
}

export const isTokenExpired = isClientTokenExpired

/**
 * 构建带有 Authorization: Bearer <token> 的请求头对象。
 * 若 token 不存在则返回空对象（不附加 Authorization）。
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * 清除 localStorage 中的认证信息（token / user_id / username）。
 */
export function clearAuth(): void {
  clearClientAuth()
}

/**
 * 判断当前是否已认证；过期 token 会被清理并视为未登录。
 */
export function isAuthenticated(): Promise<boolean> {
  return isClientAuthenticated()
}

/**
 * 带身份认证的 fetch 封装。
 *
 * - 自动在请求头中注入 `Authorization: Bearer <token>`
 * - 当服务端返回 **401** 时，自动清除本地认证信息并跳转至 `/auth-callback`
 * - 其余行为与原生 `fetch` 完全一致
 *
 * @param input  - 与 `window.fetch` 的第一个参数相同（URL 或 Request）
 * @param init   - 与 `window.fetch` 的第二个参数相同（可选配置）
 * @returns        Promise<Response>
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers)

  // 注入 Authorization（仅当调用方未自行设置时）
  if (!headers.has('Authorization')) {
    const token = await getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(input, { ...init, headers })

  // 处理 401：token 缺失 / 无效 / 过期
  if (response.status === 401 || response.status === 403) {
    clearAuth()

    if (isExtensionAuthMode()) {
      return response
    }

    // 避免在已经处于认证相关页面时重复跳转
    const authPages = ['/login', '/register', '/auth-callback', '/auth-failure']
    const currentPath = window.location.hash.replace(/^#/, '') || window.location.pathname
    if (!authPages.some(p => currentPath.startsWith(p))) {
      window.location.hash = '/auth-callback'
    }
  }

  return response
}


/**
 * 根据维度代码获取对应的 dslToRbg 端点。
 * - IBD / BDD / ESD / ISD 使用各自的类型化端点
 * - SC 使用通用端点
 */
export function getDslToRbgEndpoint(dimensionCode: string): string {
  switch (dimensionCode) {
    case 'IBD': return API_ENDPOINTS.dslToRbgIBD
    case 'BDD': return API_ENDPOINTS.dslToRbgBDD
    case 'ESD': return API_ENDPOINTS.dslToRbgESD
    case 'ISD': return API_ENDPOINTS.dslToRbgISD
    default: return API_ENDPOINTS.dslToRbg     // SC 等使用通用端点
  }
}

/**
 * 构建 DSL 转图请求。
 * ESD / ISD 的场景转换依赖 IBD 环境 DSL，因此使用组合 JSON 请求；其他维度继续发送原始 DSL 文本。
 */
export function createDslToRbgRequest(
  dimensionCode: string,
  dsl: string,
  ibdDsl = '',
): Pick<RequestInit, 'headers' | 'body'> & { endpoint: string } {
  const endpoint = getDslToRbgEndpoint(dimensionCode)

  if (dimensionCode === 'ESD' || dimensionCode === 'ISD') {
    return {
      endpoint,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        environment_dsl: ibdDsl,
        scenario_dsl: dsl,
      }),
    }
  }

  return {
    endpoint,
    headers: { 'Content-Type': 'text/plain' },
    body: dsl,
  }
}

/**
 * 根据维度代码获取对应的 rbgToDsl 端点。
 */
export function getRbgToDslEndpoint(dimensionCode: string): string {
  switch (dimensionCode) {
    case 'IBD': return API_ENDPOINTS.rbgToDslIBD
    case 'BDD': return API_ENDPOINTS.rbgToDslBDD
    case 'ESD': return API_ENDPOINTS.rbgToDslESD
    case 'ISD': return API_ENDPOINTS.rbgToDslESD // ISD 与 ESD 共用
    default: return API_ENDPOINTS.rbgToDsl     // SC 等使用通用端点
  }
}
