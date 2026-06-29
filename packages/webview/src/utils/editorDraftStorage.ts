import type { EditorSnapshot, SectionKey, ViewMode } from '../components/DimensionEditor/types'

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
  baseRequirementUpdatedAt: string
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
) => (
  makeKey('dimension', userId, projectScope, requirementId, sectionKey)
)

export const readRequirementCreateDraft = (projectScope: string, userId: string) => (
  readDraft<RequirementCreateDraftRecord>(
    getRequirementCreateDraftKey(projectScope, userId),
    'requirement-create',
  )
)

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
) => (
  readDraft<DimensionEditorDraftRecord>(
    getDimensionEditorDraftKey(projectScope, userId, requirementId, sectionKey),
    'dimension-editor',
  )
)

export const saveDimensionEditorDraft = (
  projectScope: string,
  userId: string,
  requirementId: string,
  sectionKey: SectionKey,
  draft: Omit<DimensionEditorDraftRecord, 'schemaVersion' | 'kind' | 'userId' | 'projectScope' | 'requirementId' | 'sectionKey' | 'updatedAt'>,
) => (
  writeDraft(getDimensionEditorDraftKey(projectScope, userId, requirementId, sectionKey), {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    kind: 'dimension-editor',
    userId,
    projectScope,
    requirementId,
    sectionKey,
    updatedAt: new Date().toISOString(),
    ...draft,
  } satisfies DimensionEditorDraftRecord)
)

export const clearDimensionEditorDraft = (
  projectScope: string,
  userId: string,
  requirementId: string,
  sectionKey: SectionKey,
) => {
  removeDraft(getDimensionEditorDraftKey(projectScope, userId, requirementId, sectionKey))
}
