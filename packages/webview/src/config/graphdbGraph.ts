import { API_ENDPOINTS, authFetch } from './api'
import type { GraphDBGraphRequest, GraphDBGraphResponse } from '../models/GraphDBGraph'

const GRAPHDB_ERROR_MESSAGES: Partial<Record<number, string>> = {
  401: '登录状态已失效，请重新登录',
  404: '未找到指定需求',
  422: '关系图查询参数不合法',
  502: 'GraphDB 查询失败，请稍后重试',
  503: 'GraphDB 服务暂不可用',
}

export class GraphDBGraphRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'GraphDBGraphRequestError'
    this.status = status
  }
}

export async function fetchGraphDBGraph(
  projectId: string,
  request: GraphDBGraphRequest,
  signal?: AbortSignal,
): Promise<GraphDBGraphResponse> {
  const response = await authFetch(API_ENDPOINTS.graphdbGraph(projectId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    const detail = await readErrorDetail(response)
    const fallbackMessage = `获取需求关系失败（HTTP ${response.status}）`
    const baseMessage = GRAPHDB_ERROR_MESSAGES[response.status] || fallbackMessage
    const errorMessage = detail && response.status !== 401
      ? `${baseMessage}：${detail}`
      : baseMessage

    throw new GraphDBGraphRequestError(response.status, errorMessage)
  }

  const payload: unknown = await response.json()
  if (!isGraphDBGraphResponse(payload)) {
    throw new Error('GraphDB 返回了无效的关系图数据')
  }

  return payload
}

async function readErrorDetail(response: Response) {
  try {
    const payload: unknown = await response.json()
    if (!isRecord(payload)) return ''

    const detail = payload.detail
    if (typeof detail === 'string') return detail
    if (!Array.isArray(detail)) return ''

    return detail
      .map((item) => isRecord(item) && typeof item.msg === 'string' ? item.msg : '')
      .filter(Boolean)
      .join('；')
  } catch {
    return ''
  }
}

function isGraphDBGraphResponse(value: unknown): value is GraphDBGraphResponse {
  if (!isRecord(value)) return false
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges) || !isRecord(value.meta)) {
    return false
  }

  return typeof value.meta.nodeCount === 'number'
    && typeof value.meta.edgeCount === 'number'
    && typeof value.meta.truncated === 'boolean'
    && typeof value.meta.propertiesTruncated === 'boolean'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
