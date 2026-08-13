import type { Cell, Graph } from '@antv/x6'
import { toSerializableCellJSON } from '../edgeConnection'

const DATA_CHANGE_DELAY = 120

export type GraphChangeScheduler = ReturnType<typeof createGraphChangeScheduler>

const schedulers = new WeakMap<Graph, GraphChangeScheduler>()

export const createGraphChangeScheduler = (
  graph: Graph,
  getOnChange: () => ((data: any) => void) | undefined,
) => {
  const cellCache = new Map<string, any>()
  let orderedCellIds: string[] = []
  let dirtyCellIds = new Set<string>()
  let structureDirty = true
  let canvasDirty = true
  let suspended = 0
  let frameId: number | null = null
  let dataTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  let lastSnapshot: any = null

  const cancelScheduled = () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
    if (dataTimer !== null) {
      clearTimeout(dataTimer)
      dataTimer = null
    }
  }

  const refreshStructure = () => {
    const cells = graph.getCells()
    const nextIds: string[] = []
    const liveIds = new Set<string>()

    cells.forEach((cell) => {
      liveIds.add(cell.id)
      const json = toSerializableCellJSON(cell)
      if (json) {
        nextIds.push(cell.id)
        cellCache.set(cell.id, json)
      } else {
        cellCache.delete(cell.id)
      }
    })

    Array.from(cellCache.keys()).forEach((id) => {
      if (!liveIds.has(id)) cellCache.delete(id)
    })

    orderedCellIds = nextIds
    dirtyCellIds.clear()
    structureDirty = false
  }

  const refreshDirtyCells = () => {
    dirtyCellIds.forEach((id) => {
      const cell = graph.getCellById(id)
      if (!cell) {
        cellCache.delete(id)
        structureDirty = true
        return
      }

      const json = toSerializableCellJSON(cell)
      if (json) {
        cellCache.set(id, json)
      } else {
        cellCache.delete(id)
        structureDirty = true
      }
    })
    dirtyCellIds.clear()
  }

  const buildSnapshot = () => {
    if (structureDirty || orderedCellIds.length === 0) {
      refreshStructure()
    } else if (dirtyCellIds.size > 0) {
      refreshDirtyCells()
      if (structureDirty) refreshStructure()
    }

    const canvasData = (graph as any).canvasData
    lastSnapshot = {
      cells: orderedCellIds.flatMap((id) => {
        const cell = cellCache.get(id)
        return cell ? [cell] : []
      }),
      ...(canvasData && typeof canvasData === 'object' ? { canvasData } : {}),
    }
    canvasDirty = false
    return lastSnapshot
  }

  const flush = (notify = true) => {
    if (disposed) return lastSnapshot
    cancelScheduled()
    const hasChanges = structureDirty || dirtyCellIds.size > 0 || canvasDirty || lastSnapshot === null
    const snapshot = hasChanges ? buildSnapshot() : lastSnapshot
    if (notify && suspended === 0 && hasChanges) getOnChange()?.(snapshot)
    return snapshot
  }

  const snapshot = () => flush(false)

  const snapshot = () => flush(false)

  const scheduleFrame = () => {
    if (disposed || suspended > 0 || frameId !== null) return
    frameId = requestAnimationFrame(() => {
      frameId = null
      flush()
    })
  }

  const scheduleData = () => {
    if (disposed || suspended > 0) return
    if (dataTimer !== null) clearTimeout(dataTimer)
    dataTimer = setTimeout(() => {
      dataTimer = null
      flush()
    }, DATA_CHANGE_DELAY)
  }

  const markCell = (cell: Cell, mode: 'frame' | 'data' | 'manual' = 'frame') => {
    if (disposed) return
    if (!cellCache.has(cell.id)) structureDirty = true
    dirtyCellIds.add(cell.id)
    if (mode === 'frame') scheduleFrame()
    if (mode === 'data') scheduleData()
  }

  const markStructure = (mode: 'frame' | 'manual' = 'frame') => {
    if (disposed) return
    structureDirty = true
    if (mode === 'frame') scheduleFrame()
  }

  const markCanvas = (mode: 'frame' | 'data' | 'manual' = 'data') => {
    if (disposed) return
    canvasDirty = true
    if (mode === 'frame') scheduleFrame()
    if (mode === 'data') scheduleData()
  }

  const suspend = () => {
    suspended += 1
    cancelScheduled()
  }

  const defer = () => cancelScheduled()

  const resume = ({ reset = false }: { reset?: boolean } = {}) => {
    suspended = Math.max(0, suspended - 1)
    if (reset) {
      cellCache.clear()
      orderedCellIds = []
      dirtyCellIds.clear()
      structureDirty = true
      canvasDirty = true
      lastSnapshot = null
    }
  }

  const dispose = () => {
    disposed = true
    cancelScheduled()
    schedulers.delete(graph)
  }

  const scheduler = {
    flush,
    snapshot,
    snapshot,
    markCell,
    markStructure,
    markCanvas,
    defer,
    suspend,
    resume,
    dispose,
  }

  schedulers.set(graph, scheduler)
  return scheduler
}
