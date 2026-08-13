import { useEffect, useRef } from 'react'
import { Graph } from '@antv/x6'
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react'
import type { Cell, Stencil } from '@antv/x6'
import type { GraphStrategy } from '../strategies/types'
import {
  createGraphChangeScheduler,
  type GraphChangeScheduler,
} from './changeScheduler'
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
import { loadFlowGraphData } from './loadGraphData'

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
  changeSchedulerRef: MutableRefObject<GraphChangeScheduler | null>
  setGraphReady: Dispatch<SetStateAction<boolean>>
  setContextMenu: Dispatch<SetStateAction<FlowGraphContextMenuState>>
  setFormPanelCollapsed: Dispatch<SetStateAction<boolean>>
  setFormPanelCell: Dispatch<SetStateAction<Cell | null>>
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
  changeSchedulerRef,
  setGraphReady,
  setContextMenu,
  setFormPanelCollapsed,
  setFormPanelCell,
  preserveFormPanelOnBlank,
}: UseFlowGraphInstanceOptions) => {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    strategy.registerNodes?.()

    const container = containerRef.current
    if (!container) return

    const graphInnerContainer = document.createElement('div')
    graphInnerContainer.style.width = '100%'
    graphInnerContainer.style.height = '100%'
    container.appendChild(graphInnerContainer)

    const graph = new Graph(createFlowGraphOptions(graphInnerContainer, strategy, readOnly))
    const changeScheduler = createGraphChangeScheduler(graph, () => onChangeRef.current)

    graphRef.current = graph
    changeSchedulerRef.current = changeScheduler
    setGraphReady(true)

    if (!readOnly && stencilContainerRef.current) {
      stencilRef.current = createFlowGraphStencil(graph, stencilContainerRef.current, strategy)
    }

    loadFlowGraphData({ data, graph, scheduler: changeScheduler, strategy })

    registerGraphEventHandlers(graph, {
      strategy,
      sectionKey,
      readOnly,
      onChange,
      changeScheduler,
      setContextMenu,
      setFormPanelCollapsed,
      setFormPanelCell,
      preserveFormPanelOnBlank,
    })

    return () => {
      const currentStencil = stencilRef.current
      stencilRef.current = null
      graphRef.current = null
      changeSchedulerRef.current = null

      cancelPreConnection(graph)
      cancelSequenceConnection(graph)
      changeScheduler.flush()
      changeScheduler.dispose()

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
