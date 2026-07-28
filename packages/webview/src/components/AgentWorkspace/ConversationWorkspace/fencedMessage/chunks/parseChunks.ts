import type { FenceParseResult } from '../types'
import type {
  ChunkRecord,
  ChunksData,
  ChunksEnvelope,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseChunkRecords(value: unknown): ChunkRecord[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const ids = new Set<string>()
  const chunks: ChunkRecord[] = []

  for (const item of value) {
    if (!isRecord(item)) {
      return null
    }

    const chunkId =
      typeof item.chunk_id === 'string' ? item.chunk_id.trim() : ''
    if (!chunkId || ids.has(chunkId)) {
      return null
    }

    ids.add(chunkId)
    chunks.push({
      ...item,
      chunk_id: chunkId,
    })
  }

  return chunks
}

function parseChunksData(value: unknown): ChunksData | null {
  if (
    !isRecord(value)
    || !isRecord(value.document_info)
    || !isRecord(value.chunking_summary)
  ) {
    return null
  }

  const chunks = parseChunkRecords(value.chunks)
  if (!chunks) {
    return null
  }

  const relationSeed = value.project_relation_seed
  if (
    relationSeed !== undefined
    && relationSeed !== null
    && !isRecord(relationSeed)
  ) {
    return null
  }

  return {
    ...value,
    document_info: value.document_info,
    chunking_summary: value.chunking_summary,
    chunking_rules_applied: value.chunking_rules_applied,
    chunks,
    project_relation_seed: relationSeed,
  }
}

export function parseChunksEnvelope(
  rawBody: string,
): FenceParseResult<ChunksEnvelope> {
  let value: unknown
  try {
    value = JSON.parse(rawBody)
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }

  if (!isRecord(value)) {
    return { ok: false, reason: 'invalid-schema' }
  }
  if (value.protocol_version !== '1.0') {
    return { ok: false, reason: 'unsupported' }
  }
  if (value.status !== 'success' && value.status !== 'error') {
    return { ok: false, reason: 'invalid-schema' }
  }
  if (!Array.isArray(value.warnings)) {
    return { ok: false, reason: 'invalid-schema' }
  }

  const data =
    value.status === 'success' ? parseChunksData(value.data) : null
  if (
    (value.status === 'success' && !data)
    || (value.status === 'error' && value.data !== null)
  ) {
    return { ok: false, reason: 'invalid-schema' }
  }

  return {
    ok: true,
    payload: {
      ...value,
      protocol_version: '1.0',
      status: value.status,
      project_root: value.project_root,
      source_file: value.source_file,
      detail: value.detail,
      data,
      warnings: value.warnings,
      error: value.error,
    },
  }
}
