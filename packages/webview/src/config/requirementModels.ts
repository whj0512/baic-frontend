import { API_ENDPOINTS, authFetch } from './api'
import {
  isRequirementDimensionCode,
  type RequirementModel,
  type RequirementModelInput,
} from '../models/RequirementModel'

export interface RequirementModelsMutationResult {
  requirement_id: string
  version_id?: string
  version_code?: number
  project_id?: string
  model?: RequirementModel
  models?: RequirementModel[]
  deleted_model_group_id?: string
  diff?: Record<string, unknown>
}

export class RequirementModelsApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'RequirementModelsApiError'
    this.status = status
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
)

const isNullableString = (value: unknown) => value === null || typeof value === 'string'

const requireString = (record: Record<string, unknown>, key: string) => {
  const value = record[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('模型接口返回了无效数据')
  }
  return value
}

export const parseRequirementModel = (value: unknown): RequirementModel => {
  if (!isRecord(value)) throw new Error('模型接口返回了无效数据')

  const dimensionCode = value.dimension_code
  if (!isRequirementDimensionCode(dimensionCode)) {
    throw new Error('模型接口返回了无效数据')
  }
  if (!isRecord(value.graph_json)) throw new Error('模型接口返回了无效数据')
  if (typeof value.dsl_text !== 'string') throw new Error('模型接口返回了无效数据')
  if (typeof value.is_primary !== 'boolean') throw new Error('模型接口返回了无效数据')
  if (typeof value.sort_order !== 'number' || !Number.isFinite(value.sort_order)) {
    throw new Error('模型接口返回了无效数据')
  }

  const nullableStringKeys = [
    'model_type',
    'context_model_group_id',
    'converter_version',
    'source_path',
    'created_by',
  ]
  if (nullableStringKeys.some(key => value[key] !== undefined && !isNullableString(value[key]))) {
    throw new Error('模型接口返回了无效数据')
  }
  if (value.metadata !== undefined && value.metadata !== null && !isRecord(value.metadata)) {
    throw new Error('模型接口返回了无效数据')
  }
  if (value.created_at !== undefined && typeof value.created_at !== 'string') {
    throw new Error('模型接口返回了无效数据')
  }
  if (value.updated_at !== undefined && typeof value.updated_at !== 'string') {
    throw new Error('模型接口返回了无效数据')
  }

  return {
    id: requireString(value, 'id'),
    model_group_id: requireString(value, 'model_group_id'),
    requirement_version_id: requireString(value, 'requirement_version_id'),
    requirement_group_id: requireString(value, 'requirement_group_id'),
    dimension_code: dimensionCode,
    model_type: (value.model_type as string | null | undefined) ?? null,
    name: requireString(value, 'name'),
    model_key: requireString(value, 'model_key'),
    dsl_text: value.dsl_text,
    graph_json: value.graph_json,
    source_representation: typeof value.source_representation === 'string'
      ? value.source_representation
      : 'both',
    context_model_group_id: (value.context_model_group_id as string | null | undefined) ?? null,
    converter_version: value.converter_version as string | null | undefined,
    is_primary: value.is_primary,
    sort_order: value.sort_order,
    source_path: value.source_path as string | null | undefined,
    metadata: value.metadata as Record<string, unknown> | null | undefined,
    created_by: value.created_by as string | null | undefined,
    created_at: value.created_at as string | undefined,
    updated_at: value.updated_at as string | undefined,
  }
}

const parseModels = (value: unknown): RequirementModel[] => {
  if (!Array.isArray(value)) throw new Error('模型接口返回了无效数据')
  return value.map(parseRequirementModel)
}

const formatErrorDetail = (detail: unknown, fallback: string) => {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    return detail.map(item => {
      if (!isRecord(item)) return String(item)
      const location = Array.isArray(item.loc) ? item.loc.join('.') : ''
      const message = typeof item.msg === 'string' ? item.msg : JSON.stringify(item)
      return location ? `${location}: ${message}` : message
    }).join('；')
  }
  return fallback
}

const readJsonResponse = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = isRecord(body) ? body.detail : null
    throw new RequirementModelsApiError(formatErrorDetail(detail, fallback), response.status)
  }
  if (!isRecord(body)) throw new Error('模型接口返回了无效数据')
  return body
}

const parseMutationResult = (body: Record<string, unknown>): RequirementModelsMutationResult => {
  const requirementId = requireString(body, 'requirement_id')
  const result: RequirementModelsMutationResult = { requirement_id: requirementId }

  if (body.version_id !== undefined) result.version_id = requireString(body, 'version_id')
  if (body.version_code !== undefined) {
    if (typeof body.version_code !== 'number') throw new Error('模型接口返回了无效数据')
    result.version_code = body.version_code
  }
  if (body.project_id !== undefined) result.project_id = requireString(body, 'project_id')
  if (body.model !== undefined) result.model = parseRequirementModel(body.model)
  if (body.models !== undefined) result.models = parseModels(body.models)
  if (body.deleted_model_group_id !== undefined) {
    result.deleted_model_group_id = requireString(body, 'deleted_model_group_id')
  }
  if (body.diff !== undefined) {
    if (!isRecord(body.diff)) throw new Error('模型接口返回了无效数据')
    result.diff = body.diff
  }
  return result
}

export async function fetchRequirementModels(
  requirementId: string,
  signal?: AbortSignal,
): Promise<RequirementModel[]> {
  const response = await authFetch(API_ENDPOINTS.requirementModels(requirementId), { signal })
  const body = await readJsonResponse(response, '模型加载失败')
  if (!Array.isArray(body.models)) throw new Error('模型接口返回了无效数据')
  return parseModels(body.models)
}

async function mutateRequirementModels(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  input?: RequirementModelInput,
): Promise<RequirementModelsMutationResult> {
  const response = await authFetch(url, {
    method,
    headers: input ? { 'Content-Type': 'application/json' } : undefined,
    body: input ? JSON.stringify(input) : undefined,
  })
  const body = await readJsonResponse(response, '模型操作失败')
  return parseMutationResult(body)
}

export const createRequirementModel = (
  requirementId: string,
  input: RequirementModelInput,
) => mutateRequirementModels(API_ENDPOINTS.requirementModels(requirementId), 'POST', input)

export const updateRequirementModel = (
  requirementId: string,
  modelGroupId: string,
  input: RequirementModelInput,
) => mutateRequirementModels(API_ENDPOINTS.requirementModel(requirementId, modelGroupId), 'PUT', input)

export const setPrimaryRequirementModel = (
  requirementId: string,
  modelGroupId: string,
) => mutateRequirementModels(API_ENDPOINTS.requirementModelPrimary(requirementId, modelGroupId), 'PUT')

export const deleteRequirementModel = (
  requirementId: string,
  modelGroupId: string,
) => mutateRequirementModels(API_ENDPOINTS.requirementModel(requirementId, modelGroupId), 'DELETE')

