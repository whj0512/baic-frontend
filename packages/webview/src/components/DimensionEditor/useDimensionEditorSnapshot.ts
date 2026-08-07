import { useCallback, useMemo, useRef, useState } from 'react'
import type { EditorSnapshot } from './types'
import { createEditorSnapshot, getEditorSnapshotKey } from './snapshot'

type MutableRef<T> = {
  current: T
}

interface UseDimensionEditorSnapshotOptions {
  initialContent: string
  initialDslContent: string
  initialGraphData: object
  initialSerializedGraphData?: object | null
  content: string
  dslContent: string
  graphData: object
  contentRef: MutableRef<string>
  dslContentRef: MutableRef<string>
  graphDataRef: MutableRef<object>
  serializedGraphDataRef: MutableRef<object | null>
}

export function useDimensionEditorSnapshot({
  initialContent,
  initialDslContent,
  initialGraphData,
  initialSerializedGraphData,
  content,
  dslContent,
  graphData,
  contentRef,
  dslContentRef,
  graphDataRef,
  serializedGraphDataRef,
}: UseDimensionEditorSnapshotOptions) {
  const savedSnapshotRef = useRef(createEditorSnapshot(
    initialContent,
    initialDslContent,
    initialGraphData,
    initialSerializedGraphData,
  ))
  const [savedSnapshotKey, setSavedSnapshotKey] = useState(() => (
    getEditorSnapshotKey(savedSnapshotRef.current)
  ))

  const currentSnapshotKey = useMemo(() => (
    getEditorSnapshotKey(createEditorSnapshot(content, dslContent, graphData))
  ), [content, dslContent, graphData])

  const updateSavedSnapshot = useCallback((patch: Partial<EditorSnapshot>) => {
    const nextSnapshot = createEditorSnapshot(
      patch.content ?? savedSnapshotRef.current.content,
      patch.dslContent ?? savedSnapshotRef.current.dslContent,
      patch.graphData ?? savedSnapshotRef.current.graphData,
      patch.serializedGraphData ?? savedSnapshotRef.current.serializedGraphData,
    )

    savedSnapshotRef.current = nextSnapshot
    setSavedSnapshotKey(getEditorSnapshotKey(nextSnapshot))
  }, [])

  const markSnapshotSaved = useCallback((snapshot?: EditorSnapshot) => {
    const nextSnapshot = snapshot ?? createEditorSnapshot(
      contentRef.current,
      dslContentRef.current,
      graphDataRef.current,
      serializedGraphDataRef.current,
    )

    savedSnapshotRef.current = nextSnapshot
    setSavedSnapshotKey(getEditorSnapshotKey(nextSnapshot))
  }, [contentRef, dslContentRef, graphDataRef, serializedGraphDataRef])

  return {
    savedSnapshotRef,
    hasUnsavedChanges: currentSnapshotKey !== savedSnapshotKey,
    updateSavedSnapshot,
    markSnapshotSaved,
  }
}
