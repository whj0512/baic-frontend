// API 配置

// DSL 服务地址
export const DSL_SERVICE_BASE_URL = 'http://localhost:8000'

// API 端点
export const API_ENDPOINTS = {
  // 将图 JSON 转换为 DSL
  rbgToDsl: `${DSL_SERVICE_BASE_URL}/rbg-to-dsl`,
  // 将 DSL 转换为图 JSON
  dslToRbg: `${DSL_SERVICE_BASE_URL}/dsl-to-rbg`,
}
