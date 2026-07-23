import { API_ENDPOINTS, authFetch } from '../../config/api'
import type { JsonValue, ProjectTestCase } from './types'

export class ProjectTestCasesRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ProjectTestCasesRequestError'
    this.status = status
  }
}

export async function fetchProjectTestCases(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectTestCase[]> {
  const response = await authFetch(API_ENDPOINTS.projectTestCases(projectId), {
    signal,
  })

  if (!response.ok) {
    const detail = await readErrorDetail(response)
    const fallbackMessage = `获取项目测试用例失败（HTTP ${response.status}）`
    throw new ProjectTestCasesRequestError(
      response.status,
      detail ? `${fallbackMessage}：${detail}` : fallbackMessage,
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('项目测试用例接口返回了无法解析的 JSON')
  }

  if (!Array.isArray(payload) || !payload.every(isProjectTestCase)) {
    throw new Error('项目测试用例接口返回了无效的数据结构')
  }

  return payload
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json()
    if (!isJsonObject(payload)) return ''

    const detail = payload.detail
    if (typeof detail === 'string') return detail
    if (!Array.isArray(detail)) return ''

    return detail
      .map(item => (
        isJsonObject(item) && typeof item.msg === 'string'
          ? item.msg
          : ''
      ))
      .filter(Boolean)
      .join('；')
  } catch {
    return ''
  }
}

function isProjectTestCase(value: unknown): value is ProjectTestCase {
  if (!isJsonObject(value)) return false

  if (
    typeof value.id !== 'string'
    || value.id.trim().length === 0
    || typeof value.project_id !== 'string'
    || value.project_id.trim().length === 0
    || (typeof value.name !== 'string' && value.name !== null)
  ) {
    return false
  }

  try {
    JSON.stringify(value)
  } catch {
    return false
  }

  return true
}

function isJsonObject(value: unknown): value is { [key: string]: JsonValue } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(isJsonValue)
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
  ) {
    return true
  }

  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isJsonValue)
  return isJsonObject(value)
}
