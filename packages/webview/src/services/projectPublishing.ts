import { API_ENDPOINTS, authFetch } from '../config/api'
import {
  getPlatformPublishEndpoint,
  platformFetch,
} from '../config/platformApi'
import type {
  ProjectSnapshotV1,
  PublishRequest,
  PublishResponse,
} from '../models/ProjectPublishing'

export class ProjectPublishingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectPublishingError'
  }
}

export async function fetchProjectSnapshot(
  projectId: string,
  installationId: string,
): Promise<ProjectSnapshotV1> {
  const response = await authFetch(API_ENDPOINTS.projectSnapshot(projectId))
  if (!response.ok) {
    throw new ProjectPublishingError(
      await getResponseError(response, '本地项目快照导出失败'),
    )
  }

  const data: unknown = await response.json().catch(() => null)
  if (!isRecord(data)) {
    throw new ProjectPublishingError('本地快照接口返回了无效的 JSON 数据')
  }

  if (data.schema_version !== 1) {
    throw new ProjectPublishingError(
      `不支持的项目快照版本：${String(data.schema_version ?? '缺失')}`,
    )
  }

  if (!isRecord(data.project) || !Array.isArray(data.requirements)) {
    throw new ProjectPublishingError('本地快照缺少 project 或 requirements 数据')
  }

  const entities = isRecord(data.entities) ? data.entities : {}
  const publisher = isRecord(data.publisher) ? data.publisher : {}

  return {
    ...data,
    schema_version: 1,
    source: {
      installation_id: installationId,
      project_id: projectId,
    },
    project: data.project as ProjectSnapshotV1['project'],
    publisher: publisher as ProjectSnapshotV1['publisher'],
    requirements: data.requirements as ProjectSnapshotV1['requirements'],
    entities: {
      devices: Array.isArray(entities.devices) ? entities.devices : [],
      control_units: Array.isArray(entities.control_units) ? entities.control_units : [],
    },
    relationships: Array.isArray(data.relationships)
      ? data.relationships as ProjectSnapshotV1['relationships']
      : [],
    exported_at: typeof data.exported_at === 'string'
      ? data.exported_at
      : new Date().toISOString(),
  }
}

export async function publishProjectSnapshot(
  snapshot: ProjectSnapshotV1,
  versionLabel: string,
  releaseNotes: string,
): Promise<PublishResponse> {
  const endpoint = getPlatformPublishEndpoint()
  if (!endpoint) {
    throw new ProjectPublishingError('未配置远程平台 API 地址')
  }

  const body: PublishRequest = {
    snapshot,
    ...(versionLabel.trim() ? { version_label: versionLabel.trim() } : {}),
    ...(releaseNotes.trim() ? { release_notes: releaseNotes.trim() } : {}),
  }
  const response = await platformFetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ProjectPublishingError(
      await getResponseError(response, '远程平台发布失败'),
    )
  }

  const data: unknown = await response.json().catch(() => null)
  if (!isPublishResponse(data)) {
    throw new ProjectPublishingError('远程平台返回了无效的发布结果')
  }

  return data
}

async function getResponseError(response: Response, fallback: string): Promise<string> {
  const data: unknown = await response.json().catch(() => null)
  if (isRecord(data)) {
    const detail = data.detail ?? data.message ?? data.error
    if (typeof detail === 'string' && detail.trim()) return detail
  }

  return `${fallback}（HTTP ${response.status}）`
}

function isPublishResponse(value: unknown): value is PublishResponse {
  if (!isRecord(value)) return false

  return (
    typeof value.remote_project_id === 'string'
    && typeof value.version_id === 'string'
    && typeof value.version_number === 'number'
    && typeof value.upload_id === 'string'
    && typeof value.deduplicated === 'boolean'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
