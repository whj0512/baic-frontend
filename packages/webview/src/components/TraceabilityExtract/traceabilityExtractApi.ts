import { API_ENDPOINTS, authFetch } from '../../config/api'
import type {
  TraceabilityExtractNodeKind,
  TraceabilityGraphEdge,
  TraceabilityGraphNode,
  TraceabilityGraphRequest,
  TraceabilityGraphResponse,
  TraceabilityPersistence,
  TraceabilitySummary,
} from './types'

const SUMMARY_FIELDS: Array<keyof TraceabilitySummary> = [
  'requirement_count',
  'path_count',
  'dependency_count',
  'scenario_count',
  'test_case_count',
  'matched_test_case_count',
]

const NODE_KINDS = new Set<TraceabilityExtractNodeKind>([
  'requirement',
  'scenario',
  'testCase',
])

const RELATION_TYPES = new Set([
  'PART_OF_SCENARIO',
  'COVERED_BY',
])

export class TraceabilityGraphRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'TraceabilityGraphRequestError'
    this.status = status
  }
}

export async function fetchTraceabilityGraph(
  projectId: string,
  signal?: AbortSignal,
): Promise<TraceabilityGraphResponse> {
  const request: TraceabilityGraphRequest = {
    project_id: projectId,
    response_mode: 'graph',
    minimum_path_score: 0.35,
    minimum_scenario_coverage: 0.5,
    include_singletons: true,
    persist: false,
  }

  const response = await authFetch(API_ENDPOINTS.traceabilityExtract, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    const detail = await readErrorDetail(response)
    const fallbackMessage = `获取测试用例关系失败（HTTP ${response.status}）`
    throw new TraceabilityGraphRequestError(
      response.status,
      detail ? `${fallbackMessage}：${detail}` : fallbackMessage,
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('追溯接口返回了无法解析的数据')
  }

  if (!isTraceabilityGraphResponse(payload)) {
    throw new Error('追溯接口返回了无效的关系图数据')
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
      .map(item => isRecord(item) && typeof item.msg === 'string' ? item.msg : '')
      .filter(Boolean)
      .join('；')
  } catch {
    return ''
  }
}

function isTraceabilityGraphResponse(value: unknown): value is TraceabilityGraphResponse {
  if (!isRecord(value) || value.response_mode !== 'graph') return false
  if (!isSummary(value.summary) || !isPersistence(value.persistence) || !isRecord(value.g6)) {
    return false
  }

  return Array.isArray(value.g6.nodes)
    && value.g6.nodes.every(isTraceabilityGraphNode)
    && Array.isArray(value.g6.edges)
    && value.g6.edges.every(isTraceabilityGraphEdge)
}

function isSummary(value: unknown): value is TraceabilitySummary {
  if (!isRecord(value)) return false
  return SUMMARY_FIELDS.every(field => (
    typeof value[field] === 'number'
    && Number.isFinite(value[field])
    && value[field] >= 0
  ))
}

function isPersistence(value: unknown): value is TraceabilityPersistence {
  if (!isRecord(value)) return false
  return typeof value.requested === 'boolean'
    && Array.isArray(value.persisted_test_case_ids)
    && value.persisted_test_case_ids.every(id => typeof id === 'string')
}

function isTraceabilityGraphNode(value: unknown): value is TraceabilityGraphNode {
  if (!isRecord(value) || typeof value.id !== 'string' || !isRecord(value.data)) return false

  return typeof value.data.name === 'string'
    && typeof value.data.category === 'number'
    && NODE_KINDS.has(value.data.kind as TraceabilityExtractNodeKind)
}

function isTraceabilityGraphEdge(value: unknown): value is TraceabilityGraphEdge {
  if (!isRecord(value) || !isRecord(value.data)) return false

  return typeof value.id === 'string'
    && typeof value.source === 'string'
    && typeof value.target === 'string'
    && RELATION_TYPES.has(value.data.relation as string)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
