import { Clipboard, Keyboard, Selection, Snapline, Transform } from '@antv/x6'
import type { Cell, Edge, Graph, Node } from '@antv/x6'
import type { Dispatch, SetStateAction } from 'react'
import {
  ensureNodeConnectionPorts,
  finalizeNewEdgeConnection,
  setNodeConnectionHotAreaVisible,
  toSerializableGraphJSON,
} from '../edgeConnection'
import type { GraphStrategy } from '../strategies/types'
import { syncEdgeLabelFromData } from './edgeLabels'

export interface FlowGraphContextMenuState {
  visible: boolean
  x: number
  y: number
  cell: Cell | null
}

interface RegisterGraphEventHandlersOptions {
  strategy: GraphStrategy
  sectionKey: string
  readOnly: boolean
  onChange?: (data: any) => void
  setContextMenu: Dispatch<SetStateAction<FlowGraphContextMenuState>>
  setFormPanelCollapsed: Dispatch<SetStateAction<boolean>>
}

type Terminal = {
  cell?: string
  port?: string
}

export const registerGraphEventHandlers = (
  graph: Graph,
  options: RegisterGraphEventHandlersOptions,
) => {
  registerChangeEvents(graph, options)
  registerEdgeLabelEvents(graph)

  if (!options.readOnly) {
    registerPortEvents(graph, options)
    registerUiEvents(graph, options)
  }

  registerPlugins(graph)
  registerKeyboardShortcuts(graph)
}

const registerChangeEvents = (
  graph: Graph,
  { onChange, readOnly }: RegisterGraphEventHandlersOptions,
) => {
  if (!onChange || readOnly) return

  const updateData = () => onChange(toSerializableGraphJSON(graph))
  graph.on('node:change:position', updateData)
  graph.on('node:added', updateData)
  graph.on('node:removed', updateData)
  graph.on('edge:added', updateData)
  graph.on('edge:removed', updateData)
  graph.on('edge:change:source', updateData)
  graph.on('edge:change:target', updateData)
  graph.on('edge:change:vertices', updateData)
  graph.on('cell:change:data', updateData)
}

const registerEdgeLabelEvents = (graph: Graph) => {
  graph.on('edge:change:data', ({ edge }: { edge: Edge }) => {
    syncEdgeLabelFromData(edge)
  })
}

const registerPortEvents = (
  graph: Graph,
  { strategy, onChange }: RegisterGraphEventHandlersOptions,
) => {
  let activeConnectionHotAreaNode: Node | null = null

  const hideActiveConnectionHotArea = (nextNode?: Node) => {
    if (!activeConnectionHotAreaNode) return
    if (nextNode && activeConnectionHotAreaNode.id === nextNode.id) return

    setNodeConnectionHotAreaVisible(activeConnectionHotAreaNode, false)
    activeConnectionHotAreaNode = null
  }

  graph.on('node:added', ({ node }: any) => {
    ensureNodeConnectionPorts(node, strategy)
  })

  graph.on('node:mouseenter', ({ node }: any) => {
    ensureNodeConnectionPorts(node, strategy)
    hideActiveConnectionHotArea(node)
    setNodeConnectionHotAreaVisible(node, true)
    activeConnectionHotAreaNode = node
  })

  graph.on('node:mouseleave', ({ node }: any) => {
    setNodeConnectionHotAreaVisible(node, false)
    if (activeConnectionHotAreaNode?.id === node.id) {
      activeConnectionHotAreaNode = null
    }
  })

  graph.on('node:removed', ({ node }: any) => {
    if (activeConnectionHotAreaNode?.id === node.id) {
      activeConnectionHotAreaNode = null
    }
  })

  graph.on('edge:connected', ({ edge, isNew }: { edge: Edge; isNew: boolean }) => {
    if (!isNew) return

    const keepEdge = finalizeNewEdgeConnection(graph, strategy, edge)
    if (!keepEdge) {
      graph.removeEdge(edge)
      return
    }

    onChange?.(toSerializableGraphJSON(graph))
  })

  graph.on('edge:removed', ({ edge }: { edge: Edge }) => {
    cleanupEdgePorts(graph, strategy, edge)
  })
}

const cleanupEdgePorts = (graph: Graph, strategy: GraphStrategy, edge: Edge) => {
  const src = edge.getSource() as Terminal
  const tgt = edge.getTarget() as Terminal

  cleanupPort(graph, strategy, src?.cell, src?.port)
  cleanupPort(graph, strategy, tgt?.cell, tgt?.port)

  ;[src?.cell, tgt?.cell].forEach((cellId) => {
    if (!cellId) return
    const node = graph.getCellById(cellId)
    if (node?.isNode?.()) {
      ensureNodeConnectionPorts(node, strategy)
    }
  })
}

const cleanupPort = (
  graph: Graph,
  strategy: GraphStrategy,
  cellId: string | undefined,
  portId: string | undefined,
) => {
  if (!cellId || !portId) return
  const node = graph.getCellById(cellId)
  if (!node || !node.isNode()) return

  const supportsMultiple = strategy.edgeRules?.supportsMultiplePorts?.(node.shape) ?? false
  if (!supportsMultiple) return

  const connectedEdges = graph.getConnectedEdges(node)
  const stillInUse = connectedEdges.some((connectedEdge) => {
    const edgeSource = connectedEdge.getSource() as Terminal
    const edgeTarget = connectedEdge.getTarget() as Terminal
    return (edgeSource?.cell === cellId && edgeSource?.port === portId) ||
      (edgeTarget?.cell === cellId && edgeTarget?.port === portId)
  })
  if (stillInUse) return

  try {
    ;(node as any).removePort(portId)
  } catch {
    // Port may already be gone after X6 internal cleanup.
  }
}

const registerUiEvents = (
  graph: Graph,
  {
    sectionKey,
    setContextMenu,
    setFormPanelCollapsed,
  }: RegisterGraphEventHandlersOptions,
) => {
  graph.on('cell:contextmenu', ({ e, cell }: any) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      cell,
    })
  })

  graph.on('blank:click', () => {
    setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
    setFormPanelCollapsed(true)
  })

  graph.on('node:click', () => {
    setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
    setFormPanelCollapsed(false)
  })

  graph.on('edge:click', () => {
    setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
    setFormPanelCollapsed(false)
  })

  if (sectionKey === 'interaction' || sectionKey === 'moduleResponses') {
    registerSequenceEdgeTools(graph)
  }
}

const registerSequenceEdgeTools = (graph: Graph) => {
  graph.on('edge:mouseenter', ({ edge }: { edge: Edge }) => {
    edge.addTools([
      { name: 'source-arrowhead', args: { attrs: { fill: '#1890ff', stroke: '#fff', 'stroke-width': 2, r: 4 } } },
      { name: 'target-arrowhead', args: { attrs: { fill: '#1890ff', stroke: '#fff', 'stroke-width': 2, r: 4 } } },
    ])
  })

  graph.on('edge:mouseleave', ({ edge }: { edge: Edge }) => {
    edge.removeTools()
  })
}

const registerPlugins = (graph: Graph) => {
  graph.use(new Snapline({ enabled: true }))
  graph.use(new Transform({
    resizing: {
      enabled: true,
      orthogonal: false,
      restrict: true,
    },
  }))
  graph.use(new Selection({
    enabled: true,
    showNodeSelectionBox: true,
  }))
  graph.use(new Clipboard({
    enabled: true,
  }))
  graph.use(new Keyboard({
    enabled: true,
  }))
}

const registerKeyboardShortcuts = (graph: Graph) => {
  graph.bindKey('ctrl+c', () => {
    const cells = graph.getSelectedCells()
    if (cells.length) {
      graph.copy(cells)
    }
    return false
  })

  graph.bindKey('ctrl+v', () => {
    if (!graph.isClipboardEmpty()) {
      const cells = graph.paste({ offset: 32 })
      graph.cleanSelection()
      graph.select(cells)
    }
    return false
  })
}
