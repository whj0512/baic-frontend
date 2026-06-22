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
      graph.fromJSON(data)
      ensureGraphConnectionPorts(graph, strategy)
      syncInitialEdgeLabels(graph)
      scheduleGraphConnectionViewRefresh(graph, strategy)
    }

    ensureGraphConnectionPorts(graph, strategy)

    registerGraphEventHandlers(graph, {
      strategy,
      sectionKey,
      readOnly,
      onChange,
      setContextMenu,
      setFormPanelCollapsed,
    })
    strategy.ensureRequiredNodes?.(graph)

    return () => {
      const currentStencil = stencilRef.current
      stencilRef.current = null
      graphRef.current = null

      setTimeout(() => {
        disposeFlowGraphStencil(currentStencil)
        graph.dispose()
        if (graphInnerContainer.parentNode) {
          graphInnerContainer.parentNode.removeChild(graphInnerContainer)
        }
      }, 0)

      setGraphReady(false)
    }
  }, [strategy, sectionKey, readOnly])
}
