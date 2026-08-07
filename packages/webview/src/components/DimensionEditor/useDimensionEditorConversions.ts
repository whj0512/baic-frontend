import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { ModelStrategy } from '../../models/strategies'
import type { FlowGraphRef } from '../graph'
import { createDslToRbgRequest, getRbgToDslEndpoint } from '../../config/api'
import type { ConvertedVisualData, DimensionSectionConfig, ViewMode } from './types'

type MutableRef<T> = {
  current: T
}

type ApplyViewOptions = {
  switchView?: boolean
}

interface UseDimensionEditorConversionsOptions {
  config: DimensionSectionConfig
  modelStrategy: ModelStrategy
  viewMode: ViewMode
  ibdDsl: string
  flowGraphRef: MutableRef<FlowGraphRef | null>
  dslContentRef: MutableRef<string>
  graphDataRef: MutableRef<object>
  serializedGraphDataRef: MutableRef<object | null>
  pendingCanvasDataRef: MutableRef<Record<string, any> | null>
  setViewMode: Dispatch<SetStateAction<ViewMode>>
  setGraphData: Dispatch<SetStateAction<object>>
  setDslContent: Dispatch<SetStateAction<string>>
  setDslLoading: Dispatch<SetStateAction<boolean>>
  setDslError: Dispatch<SetStateAction<string | undefined>>
  setGraphError: Dispatch<SetStateAction<string | undefined>>
}

export function useDimensionEditorConversions({
  config,
  modelStrategy,
  viewMode,
  ibdDsl,
  flowGraphRef,
  dslContentRef,
  graphDataRef,
  serializedGraphDataRef,
  pendingCanvasDataRef,
  setViewMode,
  setGraphData,
  setDslContent,
  setDslLoading,
  setDslError,
  setGraphError,
}: UseDimensionEditorConversionsOptions) {
  const convertGraphToDsl = useCallback(async (): Promise<string | null> => {
    if (viewMode === 'dsl') return null

    const graph = flowGraphRef.current?.getGraph()
    if (!graph) return null

    setDslLoading(true)
    setGraphError(undefined)

    try {
      const jsonData = modelStrategy.exportGraphToJSON(graph)
      const response = await fetch(getRbgToDslEndpoint(config.dimensionCode), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => null)
        throw new Error(errBody?.error || `HTTP error! status: ${response.status}`)
      }

      const nextDsl = await response.text()
      serializedGraphDataRef.current = jsonData
      return nextDsl
    } catch (error) {
      setGraphError(error instanceof Error ? error.message : '转换失败，请稍后重试')
      return null
    } finally {
      setDslLoading(false)
    }
  }, [config.dimensionCode, flowGraphRef, modelStrategy, serializedGraphDataRef, setDslLoading, setGraphError, viewMode])

  const convertDslToVisual = useCallback(async (
    sourceDsl = dslContentRef.current,
  ): Promise<ConvertedVisualData | null> => {
    if (!sourceDsl.trim()) {
      return { cellsData: graphDataRef.current }
    }

    setDslLoading(true)
    setDslError(undefined)

    try {
      const request = createDslToRbgRequest(config.dimensionCode, sourceDsl, ibdDsl)
      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => null)
        throw new Error(errBody?.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.text()
      const serializedGraphData = JSON.parse(result) as object
      const x6Data = modelStrategy.importGraphFromJSON(result)
      const { canvasData, ...cellsData } = (x6Data as any)

      return {
        cellsData: canvasData ? { ...cellsData, canvasData } : cellsData,
        canvasData,
        serializedGraphData,
      }
    } catch (error) {
      setDslError(error instanceof Error ? error.message : '转换失败，请稍后重试')
      return null
    } finally {
      setDslLoading(false)
    }
  }, [config.dimensionCode, dslContentRef, graphDataRef, ibdDsl, modelStrategy, setDslError, setDslLoading])

  const applyDslView = useCallback((nextDslContent: string, options: ApplyViewOptions = {}) => {
    const { switchView = true } = options

    dslContentRef.current = nextDslContent
    setDslContent(nextDslContent)
    if (switchView) {
      setViewMode('dsl')
    }
  }, [dslContentRef, setDslContent, setViewMode])

  const applyVisualView = useCallback((
    { cellsData, canvasData, serializedGraphData }: ConvertedVisualData,
    options: ApplyViewOptions = {},
  ) => {
    const { switchView = true } = options

    graphDataRef.current = cellsData
    serializedGraphDataRef.current = serializedGraphData ?? null
    pendingCanvasDataRef.current = canvasData ?? null
    setGraphData(cellsData)
    if (switchView) {
      setViewMode('visual')
    }
  }, [graphDataRef, pendingCanvasDataRef, serializedGraphDataRef, setGraphData, setViewMode])

  const handleDismissError = useCallback(() => {
    setDslError(undefined)
  }, [setDslError])

  const handleDismissGraphError = useCallback(() => {
    setGraphError(undefined)
  }, [setGraphError])

  return {
    convertGraphToDsl,
    convertDslToVisual,
    applyDslView,
    applyVisualView,
    handleDismissError,
    handleDismissGraphError,
  }
}
