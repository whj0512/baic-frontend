// API 配置

// 后端服务地址（由 .env.development / .env.production 注入）
export const SERVICE_BASE_URL = import.meta.env.VITE_API_BASE_URL

// WebSocket 服务地址（由 .env.development / .env.production 注入）
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL

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

  // 将自然语言转换为 DSL
  nlToDsl: `${SERVICE_BASE_URL}/nl-to-dsl`,
  // 用户注册
  register: `${SERVICE_BASE_URL}/register`,
  // 用户登录
  login: `${SERVICE_BASE_URL}/login`,
  // 项目管理
  projects: `${SERVICE_BASE_URL}/projects`,
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


/**
 * 根据维度代码获取对应的 dslToRbg 端点。
 * - IBD / BDD / ESD / ISD 使用各自的类型化端点（ISD 复用 ESD）
 * - SC 使用通用端点
 */
export function getDslToRbgEndpoint(dimensionCode: string): string {
  switch (dimensionCode) {
    case 'IBD': return API_ENDPOINTS.dslToRbgIBD
    case 'BDD': return API_ENDPOINTS.dslToRbgBDD
    case 'ESD': return API_ENDPOINTS.dslToRbgESD
    case 'ISD': return API_ENDPOINTS.dslToRbgESD // ISD 与 ESD 共用
    default: return API_ENDPOINTS.dslToRbg     // SC 等使用通用端点
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
