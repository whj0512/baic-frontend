import { Stencil } from '@antv/x6'
import React from 'react'
import { Tooltip } from 'antd'
import { createRoot } from 'react-dom/client'
import type { Graph, Node } from '@antv/x6'
import type { GraphStrategy } from '../strategies/types'
import {
  beginPreConnection,
  cancelPreConnection,
  registerPreConnectionDocumentEvents,
  transferPreConnectionTarget,
} from './preConnection'

const STENCIL_TOOLTIP_DATA_KEY = '__stencilTooltip'

interface StencilTooltipState {
  open: boolean
  title: string
  left: number
  top: number
}

interface StencilTooltipController {
  hide: () => void
  dispose: () => void
}

interface StencilWithInternalGraphs extends Stencil {
  graphs?: Record<string, Graph>
}

interface StencilNodeMouseEvent {
  node: Node
  e: MouseEvent
  view?: {
    container?: Element
  }
}

const stencilTooltipControllers = new WeakMap<Stencil, StencilTooltipController>()

const getNodeStencilTooltip = (node: Node) => {
  const tooltip = node.getData()?.[STENCIL_TOOLTIP_DATA_KEY]
  return typeof tooltip === 'string' ? tooltip : ''
}

const removeStencilTooltipData = (node: Node) => {
  const data = node.getData()
  if (data && Object.prototype.hasOwnProperty.call(data, STENCIL_TOOLTIP_DATA_KEY)) {
    const nextData = { ...data }
    delete nextData[STENCIL_TOOLTIP_DATA_KEY]
    node.setData(nextData, { overwrite: true })
  }
  return node
}

const createStencilTooltipController = (
  stencil: Stencil,
  container: HTMLDivElement,
): StencilTooltipController => {
  const popupContainer = container.closest('.flow-graph-container') as HTMLElement | null
  if (window.getComputedStyle(container).position === 'static') {
    container.style.position = 'relative'
  }
  const tooltipHost = document.createElement('div')
  tooltipHost.className = 'flow-graph-stencil-tooltip-host'
  tooltipHost.style.position = 'absolute'
  tooltipHost.style.left = '0'
  tooltipHost.style.top = '0'
  tooltipHost.style.width = '0'
  tooltipHost.style.height = '0'
  tooltipHost.style.pointerEvents = 'none'
  container.appendChild(tooltipHost)

  const root = createRoot(tooltipHost)
  let state: StencilTooltipState = {
    open: false,
    title: '',
    left: 0,
    top: 0,
  }

  const render = () => {
    root.render(
      React.createElement(
        Tooltip,
        {
          open: state.open,
          title: state.title,
          placement: 'right',
          getPopupContainer: () => popupContainer || container,
          mouseEnterDelay: 0,
          mouseLeaveDelay: 0,
        },
        React.createElement('span', {
          style: {
            position: 'absolute',
            left: state.left,
            top: state.top,
            width: 1,
            height: 1,
            display: 'block',
            pointerEvents: 'none',
          },
        }),
      ),
    )
  }

  const moveToNode = ({ node, view }: StencilNodeMouseEvent) => {
    const rect = container.getBoundingClientRect()
    const nodeRect = view?.container?.getBoundingClientRect()

    if (nodeRect) {
      state = {
        ...state,
        left: nodeRect.right - rect.left,
        top: nodeRect.top - rect.top + nodeRect.height / 2,
      }
      return
    }

    const bbox = node.getBBox()
    state = {
      ...state,
      left: bbox.x + bbox.width,
      top: bbox.y + bbox.height / 2,
    }
  }

  const show = (event: StencilNodeMouseEvent) => {
    const { node } = event
    const title = getNodeStencilTooltip(node)
    if (!title) return

    moveToNode(event)
    state = {
      ...state,
      open: true,
      title,
    }
    render()
  }

  const move = (event: StencilNodeMouseEvent) => {
    if (!state.open) return

    moveToNode(event)
    render()
  }

  const hide = () => {
    if (!state.open) return

    state = {
      ...state,
      open: false,
      title: '',
    }
    render()
  }

  const graphs = Object.values((stencil as StencilWithInternalGraphs).graphs || {})
  graphs.forEach((graph) => {
    graph.on('node:mouseenter', show)
    graph.on('node:mousemove', move)
    graph.on('node:mouseleave', hide)
    graph.on('node:mousedown', hide)
  })
  container.addEventListener('mouseleave', hide)

  render()

  return {
    hide,
    dispose: () => {
      graphs.forEach((graph) => {
        graph.off('node:mouseenter', show)
        graph.off('node:mousemove', move)
        graph.off('node:mouseleave', hide)
        graph.off('node:mousedown', hide)
      })
      container.removeEventListener('mouseleave', hide)
      hide()
      root.unmount()
      if (tooltipHost.parentNode) {
        tooltipHost.parentNode.removeChild(tooltipHost)
      }
    },
  }
}

const disposeStencilTooltipController = (stencil: Stencil) => {
  const tooltipController = stencilTooltipControllers.get(stencil)
  if (!tooltipController) return

  tooltipController.dispose()
  stencilTooltipControllers.delete(stencil)
}

export const createFlowGraphStencil = (
  graph: Graph,
  container: HTMLDivElement,
  strategy: GraphStrategy,
) => {
  let hideStencilTooltip = () => {}

  const dragOptions = {
    getDragNode: (sourceNode: Node) => {
      hideStencilTooltip()
      const draggingNode = removeStencilTooltipData(sourceNode.clone())
      if (strategy.preConnectionRules && beginPreConnection(graph, strategy, draggingNode, { stencil: true })) {
        registerPreConnectionDocumentEvents(graph, strategy)
      }
      return draggingNode
    },
    getDropNode: (draggingNode: Node) => {
      const droppingNode = removeStencilTooltipData(draggingNode.clone())
      if (strategy.preConnectionRules) {
        transferPreConnectionTarget(graph, draggingNode, droppingNode)
      }
      return droppingNode
    },
  }

  const stencil = new Stencil({
    title: '',
    target: graph,
    stencilGraphWidth: strategy.stencilGraphWidth || 160,
    stencilGraphHeight: strategy.stencilGraphHeight || 0,
    stencilGraphPadding: strategy.stencilGraphPadding || 10,
    collapsable: false,
    groups: [
      {
        name: 'default',
        title: '',
        collapsable: false,
      },
    ],
    layoutOptions: strategy.stencilLayoutOptions || {
      columns: 1,
      columnWidth: 'compact',
      rowHeight: 'compact',
      
    },
    ...dragOptions,
  })

  container.appendChild(stencil.container)

  const nodes = strategy.sidebarItems.map((item) => {
    const { data: defaultData, ...otherAttrs } = item.defaultAttrs || {}
    return graph.createNode({
      shape: item.shape,
      ...otherAttrs,
      data: {
        nodeName: item.label,
        ...(defaultData || {}),
        [STENCIL_TOOLTIP_DATA_KEY]: item.tooltip || item.label,
      },
    })
  })

  stencil.load(nodes, 'default')

  const tooltipController = createStencilTooltipController(stencil, stencil.container as HTMLDivElement)
  hideStencilTooltip = tooltipController.hide
  stencilTooltipControllers.set(stencil, tooltipController)

  return stencil
}

export const disposeFlowGraphStencil = (stencil: Stencil | null, graph?: Graph) => {
  if (graph) {
    cancelPreConnection(graph)
  }
  if (!stencil) return

  disposeStencilTooltipController(stencil)

  if (stencil.container?.parentNode) {
    stencil.container.parentNode.removeChild(stencil.container)
  }
  stencil.dispose()
}
