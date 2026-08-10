import type { DimensionArtifactDraft } from '../../../../DimensionEditor'
import type { RequirementDimensionCode } from '../../../../../models/RequirementModel'
import type { RequirementModelMetadataValue } from '../../../../RequirementModelMetadataModal'
import type { RequirementDslModelsEnvelope } from './types'

export interface LocalRequirementDraft {
  id: string
  name: string
  description: string
  nlText: string
  reqType: string
}

export interface LocalRequirementModel {
  id: string
  sourceModelId: string | null
  dimensionCode: RequirementDimensionCode
  modelType: string | null
  name: string
  modelKey: string
  dslContent: string
  graphData: object
  contextModelId: string | null
  isPrimary: boolean
  sortOrder: number
  sourcePath: string | null
  dirty: boolean
}

export interface RequirementModelWorkspaceState {
  requirements: Record<string, LocalRequirementDraft>
  modelsByRequirement: Record<string, LocalRequirementModel[]>
}

type SuccessEnvelope = Extract<
  RequirementDslModelsEnvelope,
  { status: 'success' }
>

function normalizePrimaryModels(
  models: LocalRequirementModel[],
): LocalRequirementModel[] {
  const selected = new Set<string>()
  return models.map((model) => {
    const primarySelected = selected.has(model.dimensionCode)
    if (!primarySelected && model.isPrimary) {
      selected.add(model.dimensionCode)
      return model
    }
    if (primarySelected && model.isPrimary) {
      return { ...model, isPrimary: false }
    }
    return model
  }).map((model, _index, normalized) => {
    if (selected.has(model.dimensionCode)) return model
    const first = normalized.find(
      (candidate) => candidate.dimensionCode === model.dimensionCode,
    )
    if (first?.id !== model.id) return model
    selected.add(model.dimensionCode)
    return { ...model, isPrimary: true }
  })
}

export function createRequirementModelWorkspaceState(
  envelope: SuccessEnvelope,
): RequirementModelWorkspaceState {
  const requirements: Record<string, LocalRequirementDraft> = {}
  const modelsByRequirement: Record<string, LocalRequirementModel[]> = {}

  for (const [requirementId, requirement] of Object.entries(
    envelope.requirements,
  )) {
    requirements[requirementId] = {
      id: requirementId,
      name: requirement.name,
      description: requirement.description,
      nlText: requirement.nl_text,
      reqType: requirement.req_type,
    }
    const sourceModels = requirement.model_ids.flatMap((sourceModelId) => {
      const source = envelope.models[sourceModelId]
      if (!source) return []
      return [{
        id: `${requirementId}::${sourceModelId}`,
        sourceModelId,
        dimensionCode: source.dimension_code,
        modelType: source.model_type,
        name: source.name,
        modelKey: source.model_key,
        dslContent: source.dsl_text,
        graphData: source.graph_json ?? {},
        contextModelId: source.context_model_id,
        isPrimary: source.is_primary,
        sortOrder: source.sort_order,
        sourcePath: source.source_path,
        dirty: false,
      } satisfies LocalRequirementModel]
    })
    const localIdBySourceId = new Map(
      sourceModels.flatMap((model) => model.sourceModelId
        ? [[model.sourceModelId, model.id] as const]
        : []),
    )
    const models = sourceModels.map((model) => ({
      ...model,
      contextModelId: model.contextModelId
        ? localIdBySourceId.get(model.contextModelId) ?? model.contextModelId
        : null,
    }))
    modelsByRequirement[requirementId] = normalizePrimaryModels(models)
  }

  return { requirements, modelsByRequirement }
}

export function updateRequirementDraft(
  state: RequirementModelWorkspaceState,
  requirementId: string,
  field: 'name' | 'description' | 'nlText' | 'reqType',
  value: string,
): RequirementModelWorkspaceState {
  const requirement = state.requirements[requirementId]
  if (!requirement) return state
  return {
    ...state,
    requirements: {
      ...state.requirements,
      [requirementId]: { ...requirement, [field]: value },
    },
  }
}

export function addRequirementModel(
  state: RequirementModelWorkspaceState,
  requirementId: string,
  value: RequirementModelMetadataValue,
  id: string,
): RequirementModelWorkspaceState {
  const current = state.modelsByRequirement[requirementId] ?? []
  const sameDimension = current.filter(
    (model) => model.dimensionCode === value.dimensionCode,
  )
  const nextModel: LocalRequirementModel = {
    id,
    sourceModelId: null,
    dimensionCode: value.dimensionCode,
    modelType: value.modelType,
    name: value.name,
    modelKey: value.modelKey,
    dslContent: '',
    graphData: {},
    contextModelId: value.contextModelGroupId,
    isPrimary: sameDimension.length === 0 || value.isPrimary,
    sortOrder: sameDimension.length,
    sourcePath: null,
    dirty: true,
  }
  const next = value.isPrimary
    ? current.map((model) => model.dimensionCode === value.dimensionCode
      ? { ...model, isPrimary: false }
      : model)
    : current
  return {
    ...state,
    modelsByRequirement: {
      ...state.modelsByRequirement,
      [requirementId]: normalizePrimaryModels([...next, nextModel]),
    },
  }
}

export function updateRequirementModelMetadata(
  state: RequirementModelWorkspaceState,
  requirementId: string,
  value: RequirementModelMetadataValue,
): RequirementModelWorkspaceState {
  if (!value.identity) return state
  const current = state.modelsByRequirement[requirementId] ?? []
  const target = current.find((model) => model.id === value.identity)
  if (!target) return state
  const next = current.map((model) => {
    if (model.id === target.id) {
      return {
        ...model,
        modelType: value.modelType,
        name: value.name,
        modelKey: value.modelKey,
        contextModelId: value.contextModelGroupId,
        isPrimary: value.isPrimary || model.isPrimary,
        dirty: true,
      }
    }
    if (value.isPrimary && model.dimensionCode === target.dimensionCode) {
      return { ...model, isPrimary: false }
    }
    return model
  })
  return {
    ...state,
    modelsByRequirement: {
      ...state.modelsByRequirement,
      [requirementId]: normalizePrimaryModels(next),
    },
  }
}

export function setPrimaryRequirementModel(
  state: RequirementModelWorkspaceState,
  requirementId: string,
  modelId: string,
): RequirementModelWorkspaceState {
  const current = state.modelsByRequirement[requirementId] ?? []
  const target = current.find((model) => model.id === modelId)
  if (!target) return state
  return {
    ...state,
    modelsByRequirement: {
      ...state.modelsByRequirement,
      [requirementId]: current.map((model) => (
        model.dimensionCode === target.dimensionCode
          ? { ...model, isPrimary: model.id === modelId, dirty: true }
          : model
      )),
    },
  }
}

export function deleteRequirementModel(
  state: RequirementModelWorkspaceState,
  requirementId: string,
  modelId: string,
): RequirementModelWorkspaceState {
  const current = state.modelsByRequirement[requirementId] ?? []
  const target = current.find((model) => model.id === modelId)
  if (!target) return state
  const remaining = normalizePrimaryModels(
    current.filter((model) => model.id !== modelId),
  )
  const replacementIbd = remaining.find(
    (model) => model.dimensionCode === 'IBD' && model.isPrimary,
  )
  return {
    ...state,
    modelsByRequirement: {
      ...state.modelsByRequirement,
      [requirementId]: remaining.map((model) => (
        model.contextModelId === modelId
          ? { ...model, contextModelId: replacementIbd?.id ?? null, dirty: true }
          : model
      )),
    },
  }
}

export function updateRequirementModelDraft(
  state: RequirementModelWorkspaceState,
  requirementId: string,
  modelId: string,
  draft: DimensionArtifactDraft,
): RequirementModelWorkspaceState {
  const current = state.modelsByRequirement[requirementId] ?? []
  return {
    ...state,
    modelsByRequirement: {
      ...state.modelsByRequirement,
      [requirementId]: current.map((model) => model.id === modelId
        ? {
            ...model,
            dslContent: draft.dslContent,
            graphData: draft.graphData,
            dirty: true,
          }
        : model),
    },
  }
}
