import { getRuntimeConfig } from './runtime'

const runtimeConfig = getRuntimeConfig()

export const SERVICE_BASE_URL = runtimeConfig.apiBaseUrl
export const WS_BASE_URL = runtimeConfig.projectWsBaseUrl

export const WS_ENDPOINTS = {
  projectSync: (projectId: string) => `${WS_BASE_URL}/ws/projects/${projectId}`,
}

export const API_ENDPOINTS = {
  rbgToDsl: `${SERVICE_BASE_URL}/rbg-to-dsl`,
  dslToRbg: `${SERVICE_BASE_URL}/dsl-to-rbg`,
  rbgToDslIBD: `${SERVICE_BASE_URL}/rbg-to-dsl/IBD`,
  dslToRbgIBD: `${SERVICE_BASE_URL}/dsl-to-rbg/IBD`,
  rbgToDslBDD: `${SERVICE_BASE_URL}/rbg-to-dsl/BDD`,
  dslToRbgBDD: `${SERVICE_BASE_URL}/dsl-to-rbg/BDD`,
  rbgToDslESD: `${SERVICE_BASE_URL}/rbg-to-dsl/ESD`,
  dslToRbgESD: `${SERVICE_BASE_URL}/dsl-to-rbg/ESD`,
  dslToRbgISD: `${SERVICE_BASE_URL}/dsl-to-rbg/ISD`,
  nlToDsl: `${SERVICE_BASE_URL}/nl-to-dsl`,
  projects: `${SERVICE_BASE_URL}/projects`,
  projectSnapshot: (projectId: string) =>
    `${SERVICE_BASE_URL}/projects/${encodeURIComponent(projectId)}/snapshot?schema_version=1`,
  requirements: `${SERVICE_BASE_URL}/requirements`,
  requirementById: (id: string) => `${SERVICE_BASE_URL}/requirements/${id}`,
  graphdbGraph: `${SERVICE_BASE_URL}/graphdb/graph`,
  traceabilityExtract: `${SERVICE_BASE_URL}/traceability/extract`,
}

// Kept as a stable application-wide request entry point, without auth behavior.
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, init)
}

export function getDslToRbgEndpoint(dimensionCode: string): string {
  switch (dimensionCode) {
    case 'IBD': return API_ENDPOINTS.dslToRbgIBD
    case 'BDD': return API_ENDPOINTS.dslToRbgBDD
    case 'ESD': return API_ENDPOINTS.dslToRbgESD
    case 'ISD': return API_ENDPOINTS.dslToRbgISD
    default: return API_ENDPOINTS.dslToRbg
  }
}

export function createDslToRbgRequest(
  dimensionCode: string,
  dsl: string,
  ibdDsl = '',
): Pick<RequestInit, 'headers' | 'body'> & { endpoint: string } {
  const endpoint = getDslToRbgEndpoint(dimensionCode)

  if (dimensionCode === 'ESD' || dimensionCode === 'ISD') {
    return {
      endpoint,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ environment_dsl: ibdDsl, scenario_dsl: dsl }),
    }
  }

  return {
    endpoint,
    headers: { 'Content-Type': 'text/plain' },
    body: dsl,
  }
}

export function getRbgToDslEndpoint(dimensionCode: string): string {
  switch (dimensionCode) {
    case 'IBD': return API_ENDPOINTS.rbgToDslIBD
    case 'BDD': return API_ENDPOINTS.rbgToDslBDD
    case 'ESD': return API_ENDPOINTS.rbgToDslESD
    case 'ISD': return API_ENDPOINTS.rbgToDslESD
    default: return API_ENDPOINTS.rbgToDsl
  }
}
