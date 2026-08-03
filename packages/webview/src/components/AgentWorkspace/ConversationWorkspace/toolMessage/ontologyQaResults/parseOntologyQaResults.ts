import type { ConversationPart } from '../../../qwenPaw/types'
import type {
  OntologyQaFinding,
  OntologyQaResultsData,
  OntologyQaResultsEnvelope,
  OntologyQaResultsPanelPayload,
  OntologyQaResultsSummary,
} from './types'

type ToolPart = Extract<ConversationPart, { type: 'tool' }>

// Local workspace paths are redacted before matching. The unique executable
// basename survives both original and redacted commands and is the card-type
// discriminator; call_id remains correlation data only.
const SKILL_SCRIPT_PATTERN =
  /(?:^|[\/\s"'])query_ontology_qa_results\.py\b/iu
const PROTOCOL_ENVELOPE_PREFIX = '{"protocol_version":"1.0",'

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
    if (!key || count === null) {
      return null
    }
    counts[key] = count
  }
  return counts
}

function parseSummary(value: unknown): OntologyQaResultsSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const totalInferred = parseNonNegativeInteger(value.total_inferred)
  const dependencies = parseNonNegativeInteger(value.dependencies)
  const conflicts = parseNonNegativeInteger(value.conflicts)
  const stateMachineIssues = parseCountMap(value.state_machine_issues)
  const scenarioIssues = parseCountMap(value.scenario_issues)
  if (
    totalInferred === null
    || dependencies === null
    || conflicts === null
    || !stateMachineIssues
    || !scenarioIssues
  ) {
    return null
  }

  return {
    total_inferred: totalInferred,
    dependencies,
    conflicts,
    state_machine_issues: stateMachineIssues,
    scenario_issues: scenarioIssues,
  }
}

function parseFindings(value: unknown): OntologyQaFinding[] | null {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    return null
  }
  return value as OntologyQaFinding[]
}

function parseNullableString(value: unknown): string | null | undefined {
  return value === null || typeof value === 'string' ? value : undefined
}

function parseData(value: unknown): OntologyQaResultsData | null {
  if (
    !isRecord(value)
    || typeof value.schema_version !== 'string'
    || !value.schema_version.trim()
  ) {
    return null
  }

  const generatedAt = parseNullableString(value.generated_at)
  const generatedBy = parseNullableString(value.generated_by)
  const projectName = parseNullableString(value.project_name)
  const summary = parseSummary(value.summary)
  const inferredDependencies = parseFindings(value.inferred_dependencies)
  const inferredConflicts = parseFindings(value.inferred_conflicts)
  const stateMachineIssues = parseFindings(value.state_machine_issues)
  const scenarioIssues = parseFindings(value.scenario_issues)
  if (
    generatedAt === undefined
    || generatedBy === undefined
    || projectName === undefined
    || Boolean(projectName?.includes('/') || projectName?.includes('\\'))
    || !summary
    || !inferredDependencies
    || !inferredConflicts
    || !stateMachineIssues
    || !scenarioIssues
    || !isRecord(value.root_cause_analysis)
  ) {
    return null
  }

  return {
    schema_version: value.schema_version.trim(),
    generated_at: generatedAt,
    generated_by: generatedBy,
    project_name: projectName,
    summary,
    inferred_dependencies: inferredDependencies,
    inferred_conflicts: inferredConflicts,
    state_machine_issues: stateMachineIssues,
    scenario_issues: scenarioIssues,
    root_cause_analysis: value.root_cause_analysis,
  }
}

function isSafeSourceFile(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && !value.includes('/')
    && !value.includes('\\')
}

function parseEnvelope(value: unknown): OntologyQaResultsEnvelope | null {
  if (
    !isRecord(value)
    || value.protocol_version !== '1.0'
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
    status: 'success',
    source_file: value.source_file,
    data,
    warnings: value.warnings,
    error: null,
  } : null
}

function extractEnvelope(text: string): OntologyQaResultsEnvelope | null {
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

export function isOntologyQaResultsToolPart(part: ToolPart): boolean {
  if (part.name !== 'execute_shell_command') {
    return false
  }

  const command = getCommand(part.input)
  return command
    ? SKILL_SCRIPT_PATTERN.test(command.replaceAll('\\', '/'))
    : false
}

export function parseOntologyQaResultsToolPart(
  part: ToolPart,
): OntologyQaResultsPanelPayload {
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

  // QwenPaw can wrap non-zero exits with diagnostic text. It can also return
  // stdout from an earlier command in the same shell invocation. Select only
  // the final protocol object, then apply the same strict envelope validation.
  const envelope = extractEnvelope(textOutput)
  if (!envelope) {
    return {
      state: 'parse-error',
      message: '工具结果不是完整、有效的场景 9 本体推理结果 v1.0 数据。',
    }
  }

  return envelope.status === 'success'
    ? { state: 'success', envelope }
    : { state: 'remote-error', envelope }
}
