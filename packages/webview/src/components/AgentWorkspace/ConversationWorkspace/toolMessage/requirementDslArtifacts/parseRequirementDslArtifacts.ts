import type { ConversationPart } from '../../../qwenPaw/types'
import type {
  RequirementDslArtifact,
  RequirementDslArtifactsEnvelope,
  RequirementDslArtifactsPanelPayload,
  RequirementDslArtifactType,
  RequirementDslRequirement,
  RequirementDslSummary,
} from './types'

type ToolPart = Extract<ConversationPart, { type: 'tool' }>

const SKILL_SCRIPT_PATTERN =
  /(?:^|[\/\s"'])(?:query-requirement-dsl-artifacts\/)?scripts\/query_requirement_dsl_artifacts\.py(?:["'\s]|$)/iu

const SUMMARY_FIELDS = [
  'feature_count',
  'requirement_count',
  'source_requirement_count',
  'artifact_count',
  'relationship_count',
  'environment_count',
  'external_scenario_count',
  'statechart_count',
  'empty_artifact_requirement_count',
  'missing_name_count',
  'missing_description_count',
  'metadata_missing_count',
  'orphan_requirement_count',
  'unmapped_source_requirement_count',
] as const satisfies readonly (keyof RequirementDslSummary)[]

const ARTIFACT_TYPES = new Set<RequirementDslArtifactType>([
  'environment',
  'external-scenario',
  'statechart',
])

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

export function isRequirementDslArtifactsToolPart(part: ToolPart): boolean {
  if (part.name !== 'execute_shell_command') {
    return false
  }

  const command = getCommand(part.input)
  return command
    ? SKILL_SCRIPT_PATTERN.test(command.replaceAll('\\', '/'))
    : false
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
    if (typeof value.output === 'string') {
      return unwrapTextOutput(value.output)
    }
  }

  return null
}

function parseSummary(value: unknown): RequirementDslSummary | null {
  if (!isRecord(value)) {
    return null
  }

  for (const field of SUMMARY_FIELDS) {
    const fieldValue = value[field]
    if (
      typeof fieldValue !== 'number'
      || !Number.isFinite(fieldValue)
      || fieldValue < 0
    ) {
      return null
    }
  }

  return Object.fromEntries(
    SUMMARY_FIELDS.map((field) => [field, value[field]]),
  ) as unknown as RequirementDslSummary
}

function parseRequirements(
  value: unknown,
): Record<string, RequirementDslRequirement> | null {
  if (!isRecord(value)) {
    return null
  }

  const requirements: Record<string, RequirementDslRequirement> = {}
  for (const [requirementId, rawRequirement] of Object.entries(value)) {
    if (
      !requirementId
      || !isRecord(rawRequirement)
      || typeof rawRequirement.name !== 'string'
      || typeof rawRequirement.description !== 'string'
      || !Array.isArray(rawRequirement.artifacts)
      || rawRequirement.artifacts.some(
        (artifactId) => typeof artifactId !== 'string' || !artifactId,
      )
    ) {
      return null
    }

    requirements[requirementId] = {
      name: rawRequirement.name,
      description: rawRequirement.description,
      artifacts: [...new Set(rawRequirement.artifacts as string[])],
    }
  }
  return requirements
}

function parseArtifacts(
  value: unknown,
): Record<string, RequirementDslArtifact> | null {
  if (!isRecord(value)) {
    return null
  }

  const artifacts: Record<string, RequirementDslArtifact> = {}
  for (const [artifactId, rawArtifact] of Object.entries(value)) {
    if (
      !artifactId
      || !isRecord(rawArtifact)
      || typeof rawArtifact.type !== 'string'
      || !ARTIFACT_TYPES.has(rawArtifact.type as RequirementDslArtifactType)
      || typeof rawArtifact.content !== 'string'
    ) {
      return null
    }

    artifacts[artifactId] = {
      type: rawArtifact.type as RequirementDslArtifactType,
      content: rawArtifact.content,
    }
  }
  return artifacts
}

function matchesSummary(
  summary: RequirementDslSummary,
  requirements: Record<string, RequirementDslRequirement>,
  artifacts: Record<string, RequirementDslArtifact>,
): boolean {
  const requirementValues = Object.values(requirements)
  const artifactValues = Object.values(artifacts)
  const countType = (type: RequirementDslArtifactType) =>
    artifactValues.filter((artifact) => artifact.type === type).length

  return (
    summary.requirement_count === requirementValues.length
    && summary.artifact_count === artifactValues.length
    && summary.relationship_count === requirementValues.reduce(
      (total, requirement) => total + requirement.artifacts.length,
      0,
    )
    && summary.environment_count === countType('environment')
    && summary.external_scenario_count === countType('external-scenario')
    && summary.statechart_count === countType('statechart')
    && summary.empty_artifact_requirement_count === requirementValues.filter(
      (requirement) => requirement.artifacts.length === 0,
    ).length
    && summary.missing_name_count === requirementValues.filter(
      (requirement) => !requirement.name,
    ).length
    && summary.missing_description_count === requirementValues.filter(
      (requirement) => !requirement.description,
    ).length
    && summary.metadata_missing_count === requirementValues.filter(
      (requirement) => !requirement.name || !requirement.description,
    ).length
  )
}

function parseEnvelope(value: unknown): RequirementDslArtifactsEnvelope | null {
  if (
    !isRecord(value)
    || value.protocol_version !== '1.0'
    || !Array.isArray(value.warnings)
  ) {
    return null
  }

  if (value.status === 'error') {
    if (
      value.summary !== null
      || !isRecord(value.requirements)
      || Object.keys(value.requirements).length > 0
      || !isRecord(value.artifacts)
      || Object.keys(value.artifacts).length > 0
      || !isRecord(value.error)
      || typeof value.error.code !== 'string'
      || typeof value.error.message !== 'string'
    ) {
      return null
    }

    return {
      protocol_version: '1.0',
      status: 'error',
      summary: null,
      requirements: {},
      artifacts: {},
      warnings: value.warnings,
      error: {
        code: value.error.code,
        message: value.error.message,
      },
    }
  }

  if (value.status !== 'success' || value.error !== null) {
    return null
  }

  const summary = parseSummary(value.summary)
  const requirements = parseRequirements(value.requirements)
  const artifacts = parseArtifacts(value.artifacts)
  if (!summary || !requirements || !artifacts) {
    return null
  }

  const hasUnknownReference = Object.values(requirements).some((requirement) =>
    requirement.artifacts.some((artifactId) => !(artifactId in artifacts)))
  if (
    hasUnknownReference
    || !matchesSummary(summary, requirements, artifacts)
  ) {
    return null
  }

  return {
    protocol_version: '1.0',
    status: 'success',
    summary,
    requirements,
    artifacts,
    warnings: value.warnings,
    error: null,
  }
}

export function parseRequirementDslArtifactsToolPart(
  part: ToolPart,
): RequirementDslArtifactsPanelPayload {
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

  const envelope = parseEnvelope(parseJson(textOutput))
  if (!envelope) {
    return {
      state: 'parse-error',
      message: '工具结果不是完整、有效的 Requirement DSL Artifacts v1.0 数据。',
    }
  }

  return envelope.status === 'success'
    ? { state: 'success', envelope }
    : { state: 'remote-error', envelope }
}
