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
  content: string
  dslContent: string
  graphData: object
  contentRef: MutableRef<string>
  dslContentRef: MutableRef<string>
  graphDataRef: MutableRef<object>
}

export function useDimensionEditorSnapshot({
  initialContent,
  initialDslContent,
  initialGraphData,
  content,
  dslContent,
  graphData,
  contentRef,
  dslContentRef,
  graphDataRef,
}: UseDimensionEditorSnapshotOptions) {
  const savedSnapshotRef = useRef(createEditorSnapshot(
    initialContent,
    initialDslContent,
    initialGraphData,
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
    )

    savedSnapshotRef.current = nextSnapshot
    setSavedSnapshotKey(getEditorSnapshotKey(nextSnapshot))
  }, [])

  const markSnapshotSaved = useCallback((snapshot?: EditorSnapshot) => {
    const nextSnapshot = snapshot ?? createEditorSnapshot(
      contentRef.current,
      dslContentRef.current,
      graphDataRef.current,
    )

    savedSnapshotRef.current = nextSnapshot
    setSavedSnapshotKey(getEditorSnapshotKey(nextSnapshot))
  }, [contentRef, dslContentRef, graphDataRef])

  return {
    savedSnapshotRef,
    hasUnsavedChanges: currentSnapshotKey !== savedSnapshotKey,
    updateSavedSnapshot,
    markSnapshotSaved,
  }
}
