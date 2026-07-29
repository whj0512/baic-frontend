import type { Requirement } from '../models/Requirement'
import { API_ENDPOINTS, authFetch } from './api'

export async function fetchProjectRequirements(
  projectId: string,
  signal?: AbortSignal,
): Promise<Requirement[]> {
  const response = await authFetch(API_ENDPOINTS.projectRequirements(projectId), {
    signal,
  })

  if (!response.ok) {
    throw new Error(`获取当前项目需求失败（HTTP ${response.status}）`)
  }

  const payload: unknown = await response.json()
  const rawRequirements = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.requirements)
      ? payload.requirements
      : null

  if (!rawRequirements) {
    throw new Error('项目需求接口返回了无效数据')
  }

  return rawRequirements.map((value) => parseRequirement(value, projectId))
}

function parseRequirement(value: unknown, projectId: string): Requirement {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) {
    throw new Error('项目需求接口返回了缺少 id 的需求')
  }

  const requirementProjectId =
    typeof value.project_id === 'string' && value.project_id
      ? value.project_id
      : projectId
  if (requirementProjectId !== projectId) {
    throw new Error('项目需求接口返回了其他项目的数据')
  }

  return {
    ...value,
    id: value.id,
    name: typeof value.name === 'string' ? value.name : value.id,
    project_id: requirementProjectId,
    created_by: typeof value.created_by === 'string' ? value.created_by : '',
    created_at: typeof value.created_at === 'string' ? value.created_at : '',
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : '',
  } as Requirement
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
