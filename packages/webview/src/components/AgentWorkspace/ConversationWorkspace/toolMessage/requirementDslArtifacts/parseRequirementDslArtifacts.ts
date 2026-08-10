import type { ConversationPart } from '../../../qwenPaw/types'
import {
  isRequirementDimensionCode,
  REQUIREMENT_DIMENSION_CODES,
} from '../../../../../models/RequirementModel'
import type {
  RequirementDslArtifact,
  RequirementDslArtifactsEnvelope,
  RequirementDslArtifactsPanelPayload,
  RequirementDslArtifactType,
  RequirementDslModel,
  RequirementDslModelsEnvelope,
  RequirementDslModelRequirement,
  RequirementDslModelSummary,
  RequirementDslRequirement,
  RequirementDslSummary,
  RequirementDslToolEnvelope,
} from './types'

type ToolPart = Extract<ConversationPart, { type: 'tool' }>

// Local workspace paths can be redacted before the tool part reaches this
// matcher. Match the Skill's unique script basename so both the original
// command and its redacted form remain recognizable; the payload parser below
// still performs the strict protocol and summary validation.
const SKILL_SCRIPT_PATTERN =
  /(?:^|[\/\s"'])query_requirement_dsl_artifacts\.py\b/iu

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

function parseLegacyEnvelope(
  value: unknown,
): RequirementDslArtifactsEnvelope | null {
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

function parseNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= 0
    ? value
    : null
}

function parseModelSummary(value: unknown): RequirementDslModelSummary | null {
  if (!isRecord(value) || !isRecord(value.dimension_counts)) return null

  const countFields = [
    'feature_count',
    'requirement_count',
    'source_requirement_count',
    'model_count',
    'relationship_count',
    'empty_model_requirement_count',
    'missing_name_count',
    'missing_description_count',
    'metadata_missing_count',
    'orphan_requirement_count',
    'unmapped_source_requirement_count',
  ] as const
  const counts = Object.fromEntries(countFields.map((field) => [
    field,
    parseNonNegativeInteger(value[field]),
  ])) as Record<(typeof countFields)[number], number | null>
  if (countFields.some((field) => counts[field] === null)) return null

  const dimensionCounts = Object.fromEntries(
    REQUIREMENT_DIMENSION_CODES.map((dimensionCode) => [
      dimensionCode,
      parseNonNegativeInteger(value.dimension_counts[dimensionCode]),
    ]),
  ) as Record<(typeof REQUIREMENT_DIMENSION_CODES)[number], number | null>
  if (REQUIREMENT_DIMENSION_CODES.some(
    (dimensionCode) => dimensionCounts[dimensionCode] === null,
  )) return null

  return {
    ...counts,
    dimension_counts: dimensionCounts,
  } as RequirementDslModelSummary
}

function parseModelRequirements(
  value: unknown,
): Record<string, RequirementDslModelRequirement> | null {
  if (!isRecord(value)) return null
  const requirements: Record<string, RequirementDslModelRequirement> = {}
  for (const [requirementId, rawRequirement] of Object.entries(value)) {
    if (
      !requirementId
      || !isRecord(rawRequirement)
      || typeof rawRequirement.name !== 'string'
      || typeof rawRequirement.description !== 'string'
      || typeof rawRequirement.nl_text !== 'string'
      || typeof rawRequirement.req_type !== 'string'
      || !Array.isArray(rawRequirement.model_ids)
      || rawRequirement.model_ids.some(
        (modelId) => typeof modelId !== 'string' || !modelId,
      )
    ) return null
    requirements[requirementId] = {
      name: rawRequirement.name,
      description: rawRequirement.description,
      nl_text: rawRequirement.nl_text,
      req_type: rawRequirement.req_type,
      model_ids: [...new Set(rawRequirement.model_ids as string[])],
    }
  }
  return requirements
}

function parseModels(
  value: unknown,
): Record<string, RequirementDslModel> | null {
  if (!isRecord(value)) return null
  const models: Record<string, RequirementDslModel> = {}
  for (const [modelId, rawModel] of Object.entries(value)) {
    if (
      !modelId
      || !isRecord(rawModel)
      || !isRequirementDimensionCode(rawModel.dimension_code)
      || (rawModel.model_type !== null && typeof rawModel.model_type !== 'string')
      || typeof rawModel.name !== 'string'
      || typeof rawModel.model_key !== 'string'
      || !rawModel.model_key
      || typeof rawModel.dsl_text !== 'string'
      || (rawModel.graph_json !== null && !isRecord(rawModel.graph_json))
      || typeof rawModel.source_representation !== 'string'
      || !rawModel.source_representation
      || (rawModel.context_model_id !== null && typeof rawModel.context_model_id !== 'string')
      || typeof rawModel.is_primary !== 'boolean'
      || parseNonNegativeInteger(rawModel.sort_order) === null
      || (rawModel.source_path !== null && typeof rawModel.source_path !== 'string')
    ) return null
    models[modelId] = rawModel as unknown as RequirementDslModel
  }
  return models
}

function matchesModelSummary(
  summary: RequirementDslModelSummary,
  requirements: Record<string, RequirementDslModelRequirement>,
  models: Record<string, RequirementDslModel>,
): boolean {
  const requirementValues = Object.values(requirements)
  const modelValues = Object.values(models)
  return summary.requirement_count === requirementValues.length
    && summary.model_count === modelValues.length
    && summary.relationship_count === requirementValues.reduce(
      (total, requirement) => total + requirement.model_ids.length,
      0,
    )
    && summary.empty_model_requirement_count === requirementValues.filter(
      (requirement) => requirement.model_ids.length === 0,
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
    && REQUIREMENT_DIMENSION_CODES.every((dimensionCode) => (
      summary.dimension_counts[dimensionCode]
      === modelValues.filter(
        (model) => model.dimension_code === dimensionCode,
      ).length
    ))
}

function parseModelsEnvelope(value: unknown): RequirementDslModelsEnvelope | null {
  if (
    !isRecord(value)
    || value.protocol_version !== '2.0'
    || !Array.isArray(value.warnings)
  ) return null

  if (value.status === 'error') {
    if (
      value.summary !== null
      || !isRecord(value.requirements)
      || Object.keys(value.requirements).length > 0
      || !isRecord(value.models)
      || Object.keys(value.models).length > 0
      || !isRecord(value.error)
      || typeof value.error.code !== 'string'
      || typeof value.error.message !== 'string'
    ) return null
    return {
      protocol_version: '2.0',
      status: 'error',
      summary: null,
      requirements: {},
      models: {},
      warnings: value.warnings,
      error: { code: value.error.code, message: value.error.message },
    }
  }
  if (value.status !== 'success' || value.error !== null) return null

  const summary = parseModelSummary(value.summary)
  const requirements = parseModelRequirements(value.requirements)
  const models = parseModels(value.models)
  if (!summary || !requirements || !models) return null
  const hasUnknownReference = Object.values(requirements).some((requirement) =>
    requirement.model_ids.some((modelId) => !(modelId in models)))
  const hasUnknownContext = Object.values(models).some((model) =>
    model.context_model_id !== null && !(model.context_model_id in models))
  if (
    hasUnknownReference
    || hasUnknownContext
    || !matchesModelSummary(summary, requirements, models)
  ) return null
  return {
    protocol_version: '2.0',
    status: 'success',
    summary,
    requirements,
    models,
    warnings: value.warnings,
    error: null,
  }
}

function parseEnvelope(value: unknown): RequirementDslToolEnvelope | null {
  if (!isRecord(value)) return null
  return value.protocol_version === '2.0'
    ? parseModelsEnvelope(value)
    : parseLegacyEnvelope(value)
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
      message: '工具结果不是完整、有效的 Requirement DSL Artifacts v1.0/v2.0 数据。',
    }
  }

  return envelope.status === 'success'
    ? { state: 'success', envelope }
    : { state: 'remote-error', envelope }
}
