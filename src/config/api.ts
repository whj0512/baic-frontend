// API 配置

// DSL 服务地址
export const DSL_SERVICE_BASE_URL = 'http://localhost:8000'

// API 端点
export const API_ENDPOINTS = {
  // 将图 JSON 转换为 DSL
  rbgToDsl: `${DSL_SERVICE_BASE_URL}/rbg-to-dsl`,
  // 将 DSL 转换为图 JSON
  dslToRbg: `${DSL_SERVICE_BASE_URL}/dsl-to-rbg`,
  // 将自然语言转换为 DSL
  nlToDsl: `${DSL_SERVICE_BASE_URL}/nl-to-dsl`,
  // 用户注册
  register: `${DSL_SERVICE_BASE_URL}/register`,
  // 用户登录
  login: `${DSL_SERVICE_BASE_URL}/login`,
  // 项目管理
  projects: `${DSL_SERVICE_BASE_URL}/projects`,
  // 需求管理
  requirements: `${DSL_SERVICE_BASE_URL}/requirements`,
}
