import { useCallback, useState } from 'react'
import type { DimensionArtifactDraft } from '../../../../DimensionEditor'
import type { RequirementModelMetadataValue } from '../../../../RequirementModelMetadataModal'
import type { RequirementDslModelsEnvelope } from './types'
import {
  addRequirementModel,
  createRequirementModelWorkspaceState,
  deleteRequirementModel,
  setPrimaryRequirementModel,
  updateRequirementDraft,
  updateRequirementModelDraft,
  updateRequirementModelMetadata,
} from './modelWorkspace'

type SuccessEnvelope = Extract<
  RequirementDslModelsEnvelope,
  { status: 'success' }
>

export function useLocalModelWorkspace(envelope: SuccessEnvelope) {
  const [state, setState] = useState(() =>
    createRequirementModelWorkspaceState(envelope))

  const updateRequirement = useCallback((
    requirementId: string,
    field: 'name' | 'description' | 'nlText' | 'reqType',
    value: string,
  ) => {
    setState((current) => updateRequirementDraft(
      current,
      requirementId,
      field,
      value,
    ))
  }, [])

  const addModel = useCallback((
    requirementId: string,
    value: RequirementModelMetadataValue,
  ) => {
    const modelId = `${requirementId}::local:${crypto.randomUUID()}`
    setState((current) => addRequirementModel(
      current,
      requirementId,
      value,
      modelId,
    ))
    return modelId
  }, [])

  const updateModelMetadata = useCallback((
    requirementId: string,
    value: RequirementModelMetadataValue,
  ) => {
    setState((current) => updateRequirementModelMetadata(
      current,
      requirementId,
      value,
    ))
  }, [])

  const setPrimaryModel = useCallback((
    requirementId: string,
    modelId: string,
  ) => {
    setState((current) => setPrimaryRequirementModel(
      current,
      requirementId,
      modelId,
    ))
  }, [])

  const deleteModel = useCallback((
    requirementId: string,
    modelId: string,
  ) => {
    setState((current) => deleteRequirementModel(
      current,
      requirementId,
      modelId,
    ))
  }, [])

  const updateModelDraft = useCallback((
    requirementId: string,
    modelId: string,
    draft: DimensionArtifactDraft,
  ) => {
    setState((current) => updateRequirementModelDraft(
      current,
      requirementId,
      modelId,
      draft,
    ))
  }, [])

  return {
    state,
    updateRequirement,
    addModel,
    updateModelMetadata,
    setPrimaryModel,
    deleteModel,
    updateModelDraft,
  }
}
