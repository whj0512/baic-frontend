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
    throw new Error(`模型接口返回了无效数据：${key} 必须是非空字符串`)
  }
  return value
}

export const parseRequirementModel = (value: unknown): RequirementModel => {
  if (!isRecord(value)) throw new Error('模型接口返回了无效数据：模型必须是对象')

  const dimensionCode = value.dimension_code
  if (!isRequirementDimensionCode(dimensionCode)) {
    throw new Error('模型接口返回了无效数据：dimension_code 不受支持')
  }
  if (!isRecord(value.graph_json)) throw new Error('模型接口返回了无效数据：graph_json 必须是对象')
  if (typeof value.dsl_text !== 'string') throw new Error('模型接口返回了无效数据：dsl_text 必须是字符串')
  if (typeof value.is_primary !== 'boolean') throw new Error('模型接口返回了无效数据：is_primary 必须是布尔值')
  if (typeof value.sort_order !== 'number' || !Number.isFinite(value.sort_order)) {
    throw new Error('模型接口返回了无效数据：sort_order 必须是有限数字')
  }

  const nullableStringKeys = [
    'model_type',
    'context_model_group_id',
    'converter_version',
    'source_path',
    'created_by',
  ]
  if (nullableStringKeys.some(key => value[key] !== undefined && !isNullableString(value[key]))) {
    throw new Error('模型接口返回了无效数据：可空字符串字段类型错误')
  }
  if (value.metadata !== undefined && value.metadata !== null && !isRecord(value.metadata)) {
    throw new Error('模型接口返回了无效数据：metadata 必须是对象或 null')
  }
  if (value.created_at !== undefined && typeof value.created_at !== 'string') {
    throw new Error('模型接口返回了无效数据：created_at 必须是字符串')
  }
  if (value.updated_at !== undefined && typeof value.updated_at !== 'string') {
    throw new Error('模型接口返回了无效数据：updated_at 必须是字符串')
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
  if (!Array.isArray(value)) throw new Error('模型接口返回了无效数据：models 必须是数组')
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
  if (!isRecord(body)) throw new Error('模型接口返回了无效数据：响应体必须是对象')
  return body
}

const warnAndIgnoreMutationField = (field: string, error: unknown) => {
  console.warn(
    `[RequirementModels] mutation 响应的 ${field} 不完整，将忽略该字段并在需要时通过 GET 重新加载模型`,
    error,
  )
}

const readOptionalMutationString = (
  body: Record<string, unknown>,
  key: string,
) => {
  const value = body[key]
  if (value === undefined) return undefined
  if (typeof value === 'string' && value.trim()) return value
  warnAndIgnoreMutationField(key, new Error(`${key} 必须是非空字符串`))
  return undefined
}

const parseMutationResult = (
  body: Record<string, unknown>,
  expectedRequirementId: string,
): RequirementModelsMutationResult => {
  const responseRequirementId = body.requirement_id
  if (
    typeof responseRequirementId === 'string'
    && responseRequirementId.trim()
    && responseRequirementId !== expectedRequirementId
  ) {
    console.warn('[RequirementModels] mutation 响应的 requirement_id 与请求不一致，将以请求 ID 为准')
  }
  const result: RequirementModelsMutationResult = { requirement_id: expectedRequirementId }

  const versionId = readOptionalMutationString(body, 'version_id')
  if (versionId) result.version_id = versionId
  if (body.version_code !== undefined) {
    if (typeof body.version_code === 'number') result.version_code = body.version_code
    else warnAndIgnoreMutationField('version_code', new Error('version_code 必须是数字'))
  }
  const projectId = readOptionalMutationString(body, 'project_id')
  if (projectId) result.project_id = projectId
  if (body.model !== undefined) {
    try {
      result.model = parseRequirementModel(body.model)
    } catch (error) {
      warnAndIgnoreMutationField('model', error)
    }
  }
  if (body.models !== undefined) {
    try {
      result.models = parseModels(body.models)
    } catch (error) {
      warnAndIgnoreMutationField('models', error)
    }
  }
  const deletedModelGroupId = readOptionalMutationString(body, 'deleted_model_group_id')
  if (deletedModelGroupId) result.deleted_model_group_id = deletedModelGroupId
  if (body.diff !== undefined) {
    if (isRecord(body.diff)) result.diff = body.diff
    else warnAndIgnoreMutationField('diff', new Error('diff 必须是对象'))
  }
  return result
}

export async function fetchRequirementModels(
  requirementId: string,
  signal?: AbortSignal,
): Promise<RequirementModel[]> {
  const response = await authFetch(API_ENDPOINTS.requirementModels(requirementId), { signal })
  const body = await readJsonResponse(response, '模型加载失败')
  if (!Array.isArray(body.models)) throw new Error('模型接口返回了无效数据：models 必须是数组')
  return parseModels(body.models)
}

async function mutateRequirementModels(
  requirementId: string,
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
  return parseMutationResult(body, requirementId)
}

export const createRequirementModel = (
  requirementId: string,
  input: RequirementModelInput,
) => mutateRequirementModels(requirementId, API_ENDPOINTS.requirementModels(requirementId), 'POST', input)

export const updateRequirementModel = (
  requirementId: string,
  modelGroupId: string,
  input: RequirementModelInput,
) => mutateRequirementModels(
  requirementId,
  API_ENDPOINTS.requirementModel(requirementId, modelGroupId),
  'PUT',
  input,
)

export const setPrimaryRequirementModel = (
  requirementId: string,
  modelGroupId: string,
) => mutateRequirementModels(
  requirementId,
  API_ENDPOINTS.requirementModelPrimary(requirementId, modelGroupId),
  'PUT',
)

export const deleteRequirementModel = (
  requirementId: string,
  modelGroupId: string,
) => mutateRequirementModels(
  requirementId,
  API_ENDPOINTS.requirementModel(requirementId, modelGroupId),
  'DELETE',
)
