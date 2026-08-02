import type { ChunksEnvelope } from '../../fencedMessage/chunks/types'
import type { RequirementDslArtifactsPanelPayload } from '../../toolMessage/requirementDslArtifacts/types'

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? String(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`
}

function fingerprint(value: unknown): string {
  const text = stableSerialize(value)
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function getChunksEvidenceRevision(
  envelope: ChunksEnvelope,
): string | null {
  if (envelope.status !== 'success' || !envelope.data) {
    return null
  }
  const functions = envelope.data.chunks
    .filter((chunk) => chunk.chunk_type === 'functional_requirement')
    .toSorted((left, right) => left.chunk_id.localeCompare(right.chunk_id))
  return `chunks:v2:${fingerprint({
    projectRoot: envelope.project_root,
    functions,
  })}`
}

export function getDslEvidenceRevision(
  payload: RequirementDslArtifactsPanelPayload,
): string | null {
  if (payload.state !== 'success') {
    return null
  }
  return `dsl:v2:${fingerprint(payload.envelope)}`
}
