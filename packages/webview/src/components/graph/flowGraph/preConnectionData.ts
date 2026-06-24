import type { Cell } from '@antv/x6'

export const PRE_CONNECTION_PREVIEW_DATA_KEY = '__preConnectionPreview'

type CellLike = Cell | {
  data?: Record<string, any>
  getData?: () => Record<string, any> | null | undefined
}

export const isPreConnectionPreview = (cell: CellLike | null | undefined) => {
  if (!cell) return false

  const data = 'getData' in cell && typeof cell.getData === 'function'
    ? cell.getData()
    : (cell as { data?: Record<string, any> }).data

  return data?.[PRE_CONNECTION_PREVIEW_DATA_KEY] === true
}
