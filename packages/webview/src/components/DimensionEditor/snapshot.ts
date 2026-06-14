import type { EditorSnapshot } from './types'

const normalizeForStableStringify = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeForStableStringify)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeForStableStringify((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }

  return value
}

const stableStringify = (value: unknown): string => (
  JSON.stringify(normalizeForStableStringify(value))
)

export const cloneSerializableData = <T,>(value: T): T => (
  JSON.parse(JSON.stringify(value ?? {})) as T
)

export const createEditorSnapshot = (
  content: string,
  dslContent: string,
  graphData: object,
): EditorSnapshot => ({
  content,
  dslContent,
  graphData: cloneSerializableData(graphData),
})

export const getEditorSnapshotKey = (snapshot: EditorSnapshot): string => (
  stableStringify(snapshot)
)
