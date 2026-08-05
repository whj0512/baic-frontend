import type { EditorSnapshot, SectionKey, ViewMode } from '../components/DimensionEditor/types'
import { SECTION_CONFIG, SECTION_TO_DIMENSION_CODE } from '../components/DimensionEditor/dimensionEditorConfig'
import type { RequirementModelDraft } from '../models/RequirementModel'
import type { RequirementDimensionCode } from '../models/RequirementModel'

const DRAFT_SCHEMA_VERSION = 1
const DRAFT_KEY_PREFIX = 'baic:requirement-draft'
const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

export interface CreateRequirementFormData {
  name: string
  req_type: string
  nl_text: string
  relationships: any[]
  sectionData: Record<string, any>
  sectionDslData: Record<string, string>
  dimensionModels: RequirementModelDraft[]
}

export type CreateDraftView = 'create' | 'create-editor'

export interface RequirementCreateDraftRecord {
  schemaVersion: number
  kind: 'requirement-create'
  userId: string
  projectScope: string
  updatedAt: string
  formData: CreateRequirementFormData
  view: CreateDraftView
  section: SectionKey | null
}

export interface DimensionEditorDraftRecord {
  schemaVersion: number
  kind: 'dimension-editor'
  userId: string
  projectScope: string
  requirementId: string
  sectionKey: SectionKey
  modelIdentity?: string
  modelIdentityKind?: 'persisted' | 'draft'
  dimensionCode?: RequirementDimensionCode
  baseRequirementUpdatedAt?: string
  baseModelUpdatedAt?: string
  modelName?: string
  modelType?: string | null
  modelKey?: string
  contextModelGroupId?: string | null
  modelIsPrimary?: boolean
  modelSortOrder?: number
  updatedAt: string
  viewMode: ViewMode
  snapshot: EditorSnapshot
}

const getStorage = () => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
)

const makeKey = (...parts: Array<string | number | null | undefined>) => (
  [DRAFT_KEY_PREFIX, DRAFT_SCHEMA_VERSION, ...parts.map(part => encodeURIComponent(String(part ?? '')))].join(':')
)

const isExpiredDraft = (value: Record<string, unknown>) => {
  if (typeof value.updatedAt !== 'string') return true

  const updatedAt = new Date(value.updatedAt).getTime()
  return !Number.isFinite(updatedAt) || Date.now() - updatedAt > DRAFT_MAX_AGE_MS
}

const readDraft = <T extends { schemaVersion: number; kind: string }>(
  key: string,
  kind: T['kind'],
): T | null => {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (
      !isRecord(parsed)
      || parsed.schemaVersion !== DRAFT_SCHEMA_VERSION
      || parsed.kind !== kind
      || isExpiredDraft(parsed)
    ) {
      storage.removeItem(key)
      return null
    }

    return parsed as T
  } catch {
    try {
      storage.removeItem(key)
    } catch {
      // ignore cleanup failures
    }
    return null
  }
}

const writeDraft = (key: string, value: unknown) => {
  const storage = getStorage()
  if (!storage) return false

  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const removeDraft = (key: string) => {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(key)
  } catch {
    // ignore cleanup failures
  }
}

export const getDraftUserId = () => {
  const storage = getStorage()
  if (!storage) return 'anonymous'

  try {
    const userId = storage.getItem('user_id')?.trim()
    const username = storage.getItem('username')?.trim()

    return userId || username || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

export const getRequirementCreateDraftKey = (projectScope: string, userId: string) => (
  makeKey('create', userId, projectScope)
)

export const getDimensionEditorDraftKey = (
  projectScope: string,
  userId: string,
  requirementId: string,
  sectionKey: SectionKey,
  modelIdentity?: string,
) => (
  modelIdentity
    ? makeKey('dimension', userId, projectScope, requirementId, sectionKey, modelIdentity)
    : makeKey('dimension', userId, projectScope, requirementId, sectionKey)
)

export const createRequirementModelClientId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `model-${Date.now()}-${Math.random().toString(36).slice(2)}`
)

const hasGraphContent = (value: unknown) => (
  Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length)
)

export const normalizeCreateRequirementFormData = (
  value: Partial<CreateRequirementFormData> | null | undefined,
): CreateRequirementFormData => {
  const sectionData = value?.sectionData && typeof value.sectionData === 'object'
    ? value.sectionData
    : {}
  const sectionDslData = value?.sectionDslData && typeof value.sectionDslData === 'object'
    ? value.sectionDslData
    : {}

  let dimensionModels = Array.isArray(value?.dimensionModels)
    ? value.dimensionModels
    : []

  if (!dimensionModels.length) {
    dimensionModels = Object.entries(SECTION_TO_DIMENSION_CODE).flatMap(([sectionKey, dimensionCode]) => {
      const graphData = sectionData[sectionKey]
      const dslText = sectionDslData[sectionKey]
      if (!hasGraphContent(graphData) && !(typeof dslText === 'string' && dslText.trim())) {
        return []
      }

      return [{
        clientId: createRequirementModelClientId(),
        dimension_code: dimensionCode,
        model_type: null,
        name: `${SECTION_CONFIG[sectionKey as keyof typeof SECTION_CONFIG].label} 1`,
        model_key: `${dimensionCode.toLowerCase()}-1`,
        dsl_text: typeof dslText === 'string' ? dslText : '',
        graph_json: hasGraphContent(graphData) ? graphData : {},
        context_model_group_id: null,
        is_primary: true,
        sort_order: 0,
      }]
    })
  }

  return {
    name: typeof value?.name === 'string' ? value.name : '',
    req_type: typeof value?.req_type === 'string' ? value.req_type : '',
    nl_text: typeof value?.nl_text === 'string' ? value.nl_text : '',
    relationships: Array.isArray(value?.relationships) ? value.relationships : [],
    sectionData,
    sectionDslData,
    dimensionModels,
  }
}

export const readRequirementCreateDraft = (projectScope: string, userId: string) => {
  const draft = readDraft<RequirementCreateDraftRecord>(
    getRequirementCreateDraftKey(projectScope, userId),
    'requirement-create',
  )
  if (!draft) return null

  return {
    ...draft,
    formData: normalizeCreateRequirementFormData(draft.formData),
  }
}

export const saveRequirementCreateDraft = (
  projectScope: string,
  userId: string,
  draft: Omit<RequirementCreateDraftRecord, 'schemaVersion' | 'kind' | 'userId' | 'projectScope' | 'updatedAt'>,
) => (
  writeDraft(getRequirementCreateDraftKey(projectScope, userId), {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    kind: 'requirement-create',
    userId,
    projectScope,
    updatedAt: new Date().toISOString(),
    ...draft,
    formData: normalizeCreateRequirementFormData(draft.formData),
  } satisfies RequirementCreateDraftRecord)
)

export const clearRequirementCreateDraft = (projectScope: string, userId: string) => {
  removeDraft(getRequirementCreateDraftKey(projectScope, userId))
}

export const readDimensionEditorDraft = (
  projectScope: string,
  userId: string,
  requirementId: string,
  sectionKey: SectionKey,
  modelIdentity?: string,
) => (
  readDraft<DimensionEditorDraftRecord>(
    getDimensionEditorDraftKey(projectScope, userId, requirementId, sectionKey, modelIdentity),
    'dimension-editor',
  )
)

export const readDimensionEditorDraftsForRequirement = (
  projectScope: string,
  userId: string,
  requirementId: string,
) => {
  const storage = getStorage()
  if (!storage) return [] as DimensionEditorDraftRecord[]

  const drafts: DimensionEditorDraftRecord[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key || !key.startsWith(`${DRAFT_KEY_PREFIX}:${DRAFT_SCHEMA_VERSION}:dimension:`)) continue
    try {
      const value = JSON.parse(storage.getItem(key) ?? '')
      if (
        isRecord(value)
        && value.schemaVersion === DRAFT_SCHEMA_VERSION
        && value.kind === 'dimension-editor'
        && value.projectScope === projectScope
        && value.userId === userId
        && value.requirementId === requirementId
        && !isExpiredDraft(value)
      ) {
        drafts.push(value as unknown as DimensionEditorDraftRecord)
      }
    } catch {
      // Ignore unrelated or malformed local storage values.
    }
  }
  return drafts
}

export const saveDimensionEditorDraft = (
  projectScope: string,
  userId: string,
  requirementId: string,
  sectionKey: SectionKey,
  modelIdentity: string | undefined,
  draft: Omit<DimensionEditorDraftRecord, 'schemaVersion' | 'kind' | 'userId' | 'projectScope' | 'requirementId' | 'sectionKey' | 'modelIdentity' | 'updatedAt'>,
) => (
  writeDraft(getDimensionEditorDraftKey(projectScope, userId, requirementId, sectionKey, modelIdentity), {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    kind: 'dimension-editor',
    userId,
    projectScope,
    requirementId,
    sectionKey,
    modelIdentity,
    updatedAt: new Date().toISOString(),
    ...draft,
  } satisfies DimensionEditorDraftRecord)
)

export const clearDimensionEditorDraft = (
  projectScope: string,
  userId: string,
  requirementId: string,
  sectionKey: SectionKey,
  modelIdentity?: string,
) => {
  removeDraft(getDimensionEditorDraftKey(projectScope, userId, requirementId, sectionKey, modelIdentity))
}
