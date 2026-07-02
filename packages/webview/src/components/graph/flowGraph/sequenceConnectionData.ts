import type { Cell } from '@antv/x6'

export const SEQUENCE_CONNECTION_PREVIEW_FLAG = '__sequenceConnectionPreview'

export const sequenceConnectionPreviewData = {
  [SEQUENCE_CONNECTION_PREVIEW_FLAG]: true,
}

export const isSequenceConnectionPreview = (cell: Cell | Record<string, any> | null | undefined) => {
  if (!cell) return false

  const data = typeof (cell as Cell).getData === 'function'
    ? (cell as Cell).getData()
    : (cell as Record<string, any>).data

  return Boolean(data?.[SEQUENCE_CONNECTION_PREVIEW_FLAG])
}
