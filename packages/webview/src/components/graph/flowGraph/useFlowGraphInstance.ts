import { useEffect } from 'react'
import { Graph } from '@antv/x6'
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react'
import type { Stencil } from '@antv/x6'
import {
  ensureGraphConnectionPorts,
  scheduleGraphConnectionViewRefresh,
} from '../edgeConnection'
import type { GraphStrategy } from '../strategies/types'
import { syncInitialEdgeLabels } from './edgeLabels'
import {
  type FlowGraphContextMenuState,
  registerGraphEventHandlers,
} from './graphEventRegistry'
import { createFlowGraphOptions } from './graphOptions'
import {
  createFlowGraphStencil,
  disposeFlowGraphStencil,
} from './stencil'
import { cancelPreConnection } from './preConnection'
import { cancelSequenceConnection } from './sequenceConnection'

interface UseFlowGraphInstanceOptions {
  sectionKey: string
  data?: any
  onChange?: (data: any) => void
  readOnly: boolean
  strategy: GraphStrategy
  containerRef: RefObject<HTMLDivElement | null>
  stencilContainerRef: RefObject<HTMLDivElement | null>
  graphRef: MutableRefObject<Graph | null>
  stencilRef: MutableRefObject<Stencil | null>
  setGraphReady: Dispatch<SetStateAction<boolean>>
  setContextMenu: Dispatch<SetStateAction<FlowGraphContextMenuState>>
  setFormPanelCollapsed: Dispatch<SetStateAction<boolean>>
  preserveFormPanelOnBlank: boolean
}

export const useFlowGraphInstance = ({
  sectionKey,
  data,
  onChange,
  readOnly,
  strategy,
  containerRef,
  stencilContainerRef,
  graphRef,
  stencilRef,
  setGraphReady,
  setContextMenu,
  setFormPanelCollapsed,
  preserveFormPanelOnBlank,
}: UseFlowGraphInstanceOptions) => {
  useEffect(() => {
    strategy.registerNodes?.()

    const container = containerRef.current
    if (!container) return

    const graphInnerContainer = document.createElement('div')
    graphInnerContainer.style.width = '100%'
    graphInnerContainer.style.height = '100%'
    container.appendChild(graphInnerContainer)

    const graph = new Graph(createFlowGraphOptions(graphInnerContainer, strategy, readOnly))

    graphRef.current = graph
    setGraphReady(true)

    if (!readOnly && stencilContainerRef.current) {
      stencilRef.current = createFlowGraphStencil(graph, stencilContainerRef.current, strategy)
    }

    if (data && Object.keys(data).length > 0) {
      scheduleGraphConnectionViewRefresh(graph, strategy)
      graph.fromJSON(data)
      if ((data as any).canvasData && typeof (data as any).canvasData === 'object') {
        ;(graph as any).canvasData = (data as any).canvasData
      }
      ensureGraphConnectionPorts(graph, strategy)
      syncInitialEdgeLabels(graph)
    }

    ensureGraphConnectionPorts(graph, strategy)

    registerGraphEventHandlers(graph, {
      strategy,
      sectionKey,
      readOnly,
      onChange,
      setContextMenu,
      setFormPanelCollapsed,
      preserveFormPanelOnBlank,
    })
    strategy.ensureRequiredNodes?.(graph)

    return () => {
      const currentStencil = stencilRef.current
      stencilRef.current = null
      graphRef.current = null

      cancelPreConnection(graph)
      cancelSequenceConnection(graph)

      setTimeout(() => {
        disposeFlowGraphStencil(currentStencil, graph)
        graph.dispose()
        if (graphInnerContainer.parentNode) {
          graphInnerContainer.parentNode.removeChild(graphInnerContainer)
        }
      }, 0)

      setGraphReady(false)
    }
  }, [strategy, sectionKey, readOnly, preserveFormPanelOnBlank])
}
