import { API_ENDPOINTS, authFetch } from '../../config/api'

export const REQUIREMENT_EXPLICIT_TYPE_IRI = 'http://example.org/requirement-ontology#Requirement'
export const ROOT_REQUIREMENT_EXPLICIT_TYPE_IRI = 'http://example.org/requirement-ontology#RootRequirement'

export interface RequirementNodeLookupTarget {
  nodeId: string
  name: string
}

export type RequirementNodeLookupState =
  | { status: 'idle'; target: null }
  | { status: 'loading'; target: RequirementNodeLookupTarget }
  | { status: 'success'; target: RequirementNodeLookupTarget; requirementId: string }
  | { status: 'error'; target: RequirementNodeLookupTarget; message: string }

interface RequirementByNameResponse {
  requirement: {
    id: string
  }
}

const REQUIREMENT_LOOKUP_ERROR_MESSAGES: Partial<Record<number, string>> = {
  404: '当前项目下未找到该名称的需求',
  409: '当前项目下存在多个同名需求，无法确定跳转目标',
  422: '需求查询参数无效',
}

export class RequirementNodeLookupError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'RequirementNodeLookupError'
    this.status = status
  }
}

export function getRequirementNodeLookupTarget(
  nodeId: string,
  data: unknown,
): RequirementNodeLookupTarget | null {
  if (!isRecord(data)) return null

  const explicitTypes = Array.isArray(data.explicitTypes)
    ? data.explicitTypes.filter((value): value is string => typeof value === 'string')
    : []
  if (
    !explicitTypes.includes(REQUIREMENT_EXPLICIT_TYPE_IRI)
    || explicitTypes.includes(ROOT_REQUIREMENT_EXPLICIT_TYPE_IRI)
  ) return null

  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name) return null

  return { nodeId, name }
}

export async function fetchRequirementByName(
  projectId: string,
  name: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await authFetch(API_ENDPOINTS.requirementByName(projectId, name), {
    signal,
  })

  if (!response.ok) {
    const fallbackMessage = `查询需求详情失败（HTTP ${response.status}）`
    throw new RequirementNodeLookupError(
      response.status,
      REQUIREMENT_LOOKUP_ERROR_MESSAGES[response.status] || fallbackMessage,
    )
  }

  const payload: unknown = await response.json()
  if (!isRequirementByNameResponse(payload)) {
    throw new Error('需求查询接口返回了无效数据')
  }

  return payload.requirement.id.trim()
}

function isRequirementByNameResponse(value: unknown): value is RequirementByNameResponse {
  if (!isRecord(value) || !isRecord(value.requirement)) return false
  return typeof value.requirement.id === 'string' && value.requirement.id.trim() !== ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
