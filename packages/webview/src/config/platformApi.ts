import { getRuntimeConfig } from './runtime'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export function getPlatformApiBaseUrl(): string {
  return trimTrailingSlash(getRuntimeConfig().platformApiBaseUrl.trim())
}

export function getPlatformWebBaseUrl(): string {
  return trimTrailingSlash(getRuntimeConfig().platformWebBaseUrl.trim())
}

export function getPlatformPublishEndpoint(): string {
  const baseUrl = getPlatformApiBaseUrl()
  return baseUrl ? `${baseUrl}/platform/projects/publish` : ''
}

export function getRemoteProjectUrl(projectId: string, versionId?: string): string {
  const baseUrl = getPlatformWebBaseUrl()
  if (!baseUrl) return ''

  const projectPath = `/projects/${encodeURIComponent(projectId)}`
  return versionId
    ? `${baseUrl}${projectPath}/versions/${encodeURIComponent(versionId)}`
    : `${baseUrl}${projectPath}`
}

export function platformFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, init)
}
