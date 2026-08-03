import type { ConversationPart } from '../../../qwenPaw/types'
import type {
  FunctionRelation,
  FunctionRelationsData,
  FunctionRelationsEnvelope,
  FunctionRelationsPanelPayload,
  FunctionRelationsSummary,
} from './types'

type ToolPart = Extract<ConversationPart, { type: 'tool' }>

const SKILL_SCRIPT_PATTERN =
  /(?:^|[\/\s"'])query_function_relations\.py\b/iu
const PROTOCOL_ENVELOPE_PREFIX =
  '{"protocol_version":"1.0","panel":"function-relations",'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function getCommand(input: unknown): string | null {
  let value = input
  if (typeof value === 'string') {
    value = parseJson(value) ?? value
  }

  if (typeof value === 'string') {
    return value
  }
  if (isRecord(value) && typeof value.command === 'string') {
    return value.command
  }
  return null
}

function unwrapTextOutput(value: unknown): string | null {
  if (typeof value === 'string') {
    const expanded = parseJson(value)
    if (expanded !== undefined && expanded !== value) {
      return unwrapTextOutput(expanded) ?? value
    }
    return value
  }

  if (Array.isArray(value)) {
    const textParts = value.flatMap((item) =>
      isRecord(item) && item.type === 'text' && typeof item.text === 'string'
        ? [item.text]
        : [])
    return textParts.length > 0 ? textParts.join('') : null
  }

  if (isRecord(value)) {
    if (value.type === 'text' && typeof value.text === 'string') {
      return value.text
    }
    if (value.output !== undefined) {
      return unwrapTextOutput(value.output)
    }
    if (value.result !== undefined) {
      return unwrapTextOutput(value.result)
    }
  }

  return null
}

function parseNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= 0
    ? value
    : null
}

function parseCountMap(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) {
    return null
  }

  const counts: Record<string, number> = {}
  for (const [key, rawCount] of Object.entries(value)) {
    const count = parseNonNegativeInteger(rawCount)
    if (!key.trim() || count === null) {
      return null
    }
    counts[key] = count
  }
  return counts
}

function parseRelations(value: unknown): FunctionRelation[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const relations: FunctionRelation[] = []
  for (const item of value) {
    if (
      !isRecord(item)
      || typeof item.relationType !== 'string'
      || !item.relationType.trim()
      || typeof item.relationSource !== 'string'
      || !item.relationSource.trim()
      || typeof item.relationTarget !== 'string'
      || !item.relationTarget.trim()
      || typeof item.isInferred !== 'boolean'
      || typeof item.subtype !== 'string'
      || !Array.isArray(item.evidence)
      || typeof item.confidence !== 'string'
      || !item.confidence.trim()
      || typeof item.inferenceRule !== 'string'
    ) {
      return null
    }
    relations.push(item as FunctionRelation)
  }
  return relations
}

function parseSummary(
  value: unknown,
  relations: FunctionRelation[],
): FunctionRelationsSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const totalRelations = parseNonNegativeInteger(value.total_relations)
  const inferred = parseNonNegativeInteger(value.inferred)
  const declared = parseNonNegativeInteger(value.declared)
  const byType = parseCountMap(value.by_type)
  if (
    totalRelations === null
    || inferred === null
    || declared === null
    || !byType
  ) {
    return null
  }

  const actualByType: Record<string, number> = {}
  let actualInferred = 0
  for (const relation of relations) {
    actualByType[relation.relationType] =
      (actualByType[relation.relationType] ?? 0) + 1
    actualInferred += relation.isInferred ? 1 : 0
  }
  const actualEntries = Object.entries(actualByType)
  if (
    totalRelations !== relations.length
    || inferred !== actualInferred
    || declared !== relations.length - actualInferred
    || actualEntries.length !== Object.keys(byType).length
    || actualEntries.some(([key, count]) => byType[key] !== count)
  ) {
    return null
  }

  return {
    total_relations: totalRelations,
    by_type: byType,
    inferred,
    declared,
  }
}

function parseNullableString(value: unknown): string | null | undefined {
  return value === null || typeof value === 'string' ? value : undefined
}

function parseData(value: unknown): FunctionRelationsData | null {
  if (
    !isRecord(value)
    || typeof value.schema_version !== 'string'
    || !value.schema_version.trim()
    || typeof value.project_name !== 'string'
    || !value.project_name.trim()
    || value.project_name.includes('/')
    || value.project_name.includes('\\')
    || !isRecord(value.query)
    || typeof value.query.keyword !== 'string'
    || !value.query.keyword.trim()
    || typeof value.query.repository !== 'string'
    || !value.query.repository.trim()
  ) {
    return null
  }

  const generatedAt = parseNullableString(value.generated_at)
  const generatedBy = parseNullableString(value.generated_by)
  const relations = parseRelations(value.relations)
  if (generatedAt === undefined || generatedBy === undefined || !relations) {
    return null
  }
  const summary = parseSummary(value.summary, relations)
  if (!summary) {
    return null
  }

  return {
    schema_version: value.schema_version.trim(),
    generated_at: generatedAt,
    generated_by: generatedBy,
    project_name: value.project_name,
    query: {
      keyword: value.query.keyword,
      repository: value.query.repository,
    },
    summary,
    relations,
  }
}

function isSafeSourceFile(value: unknown): value is string {
  return typeof value === 'string'
    && value.endsWith('-relation.json')
    && !value.includes('/')
    && !value.includes('\\')
}

function parseEnvelope(value: unknown): FunctionRelationsEnvelope | null {
  if (
    !isRecord(value)
    || value.protocol_version !== '1.0'
    || value.panel !== 'function-relations'
    || !Array.isArray(value.warnings)
  ) {
    return null
  }

  if (value.status === 'error') {
    if (
      value.data !== null
      || (value.source_file !== null && !isSafeSourceFile(value.source_file))
      || !isRecord(value.error)
      || typeof value.error.code !== 'string'
      || typeof value.error.message !== 'string'
    ) {
      return null
    }
    return {
      protocol_version: '1.0',
      panel: 'function-relations',
      status: 'error',
      source_file: value.source_file,
      data: null,
      warnings: value.warnings,
      error: {
        code: value.error.code,
        message: value.error.message,
      },
    }
  }

  if (
    value.status !== 'success'
    || value.error !== null
    || !isSafeSourceFile(value.source_file)
  ) {
    return null
  }

  const data = parseData(value.data)
  return data ? {
    protocol_version: '1.0',
    panel: 'function-relations',
    status: 'success',
    source_file: value.source_file,
    data,
    warnings: value.warnings,
    error: null,
  } : null
}

function extractEnvelope(text: string): FunctionRelationsEnvelope | null {
  let searchEnd = text.length
  while (searchEnd > 0) {
    const envelopeStart = text.lastIndexOf(
      PROTOCOL_ENVELOPE_PREFIX,
      searchEnd - 1,
    )
    if (envelopeStart < 0) {
      return null
    }
    const envelope = parseEnvelope(parseJson(text.slice(envelopeStart).trim()))
    if (envelope) {
      return envelope
    }
    searchEnd = envelopeStart
  }
  return null
}

export function isFunctionRelationsToolPart(part: ToolPart): boolean {
  if (part.name !== 'execute_shell_command') {
    return false
  }
  const command = getCommand(part.input)
  return command
    ? SKILL_SCRIPT_PATTERN.test(command.replaceAll('\\', '/'))
    : false
}

export function parseFunctionRelationsToolPart(
  part: ToolPart,
): FunctionRelationsPanelPayload {
  if (part.output === undefined) {
    return { state: 'loading' }
  }

  const textOutput = unwrapTextOutput(part.output)
  if (!textOutput) {
    return {
      state: 'parse-error',
      message: '工具结果中没有可解析的文本内容。',
    }
  }

  const envelope = extractEnvelope(textOutput)
  if (!envelope) {
    return {
      state: 'parse-error',
      message: '工具结果不是完整、有效的场景 10 功能关系 v1.0 数据。',
    }
  }

  return envelope.status === 'success'
    ? { state: 'success', envelope }
    : { state: 'remote-error', envelope }
}
