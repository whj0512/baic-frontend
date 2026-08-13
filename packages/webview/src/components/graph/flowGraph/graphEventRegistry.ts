import { Clipboard, History, Keyboard, Selection, Snapline, Transform } from '@antv/x6'
import type { Cell, Edge, Graph, Node } from '@antv/x6'
import type { Dispatch, SetStateAction } from 'react'
import {
  connectionNoopHighlighting,
  ensureNodeConnectionPorts,
  ensureSequenceEdgeVerticesTool,
  finalizeNewEdgeConnection,
  isSequenceEdgeMode,
  setNodeConnectionHotAreaVisible,
} from '../edgeConnection'
import type { GraphStrategy } from '../strategies/types'
import type { GraphChangeScheduler } from './changeScheduler'
import { syncEdgeLabelFromData } from './edgeLabels'
import {
  beginPreConnection,
  completePreConnection,
  handlePreConnectionNodeRemoved,
  updatePreConnection,
} from './preConnection'
import { isPreConnectionPreview } from './preConnectionData'
import {
  registerSequenceConnection,
} from './sequenceConnection'
import { isSequenceConnectionPreview } from './sequenceConnectionData'

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
  changeScheduler: GraphChangeScheduler
  setContextMenu: Dispatch<SetStateAction<FlowGraphContextMenuState>>
  setFormPanelCollapsed: Dispatch<SetStateAction<boolean>>
  setFormPanelCell: Dispatch<SetStateAction<Cell | null>>
  preserveFormPanelOnBlank: boolean
}

type Terminal = {
  cell?: string
  port?: string
}

export const registerGraphEventHandlers = (
  graph: Graph,
  options: RegisterGraphEventHandlersOptions,
) => {
  if (!options.readOnly && options.strategy.preConnectionRules) {
    registerPreConnectionEvents(graph, options.strategy)
  }
  if (!options.readOnly && options.strategy.sequenceConnection) {
    registerSequenceConnection(graph, options.strategy)
  }
  if (!options.readOnly && options.strategy.initializeNode) {
    graph.on('node:added', ({ node }: { node: Node }) => {
      options.strategy.initializeNode?.(node, graph)
    })
  }
  registerChangeEvents(graph, options)
  registerEdgeLabelEvents(graph)

  if (!options.readOnly) {
    registerPortEvents(graph, options)
    registerUiEvents(graph, options)
  }

  if (!options.readOnly) {
    registerPlugins(graph)
    registerKeyboardShortcuts(graph, options.strategy)
  }
}

const registerPreConnectionEvents = (graph: Graph, strategy: GraphStrategy) => {
  graph.on('node:move', ({ node }: { node: Node }) => {
    if (beginPreConnection(graph, strategy, node)) {
      updatePreConnection(graph, strategy, node)
    }
  })

  graph.on('node:moving', ({ node }: { node: Node }) => {
    updatePreConnection(graph, strategy, node)
  })

  graph.on('node:moved', ({ node }: { node: Node }) => {
    completePreConnection(graph, strategy, node)
  })

  graph.on('node:added', ({ node }: { node: Node }) => {
    completePreConnection(graph, strategy, node)
  })

  graph.on('node:removed', ({ node }: { node: Node }) => {
    handlePreConnectionNodeRemoved(graph, node)
  })
}

const registerChangeEvents = (
  graph: Graph,
  { changeScheduler, readOnly }: RegisterGraphEventHandlersOptions,
) => {
  if (readOnly) return

  const movingNodes = new Set<string>()
  let edgeBatchDepth = 0

  const updateEdgeData = ({ edge }: { edge: Edge }) => {
    if (!isPreConnectionPreview(edge) && !isSequenceConnectionPreview(edge)) {
      changeScheduler.markCell(edge, edgeBatchDepth > 0 ? 'manual' : 'frame')
    }
  }
  const updateCellData = ({ cell }: { cell: Cell }) => {
    if (!isPreConnectionPreview(cell) && !isSequenceConnectionPreview(cell)) {
      changeScheduler.markCell(cell, 'data')
    }
  }

  graph.on('node:move', ({ node }: { node: Node }) => {
    movingNodes.add(node.id)
    changeScheduler.defer()
  })
  graph.on('node:moved', ({ node }: { node: Node }) => {
    movingNodes.delete(node.id)
    changeScheduler.markCell(node, 'manual')
    changeScheduler.flush()
  })
  graph.on('node:change:position', ({ node }: { node: Node }) => {
    changeScheduler.markCell(node, movingNodes.has(node.id) ? 'manual' : 'frame')
  })
  graph.on('node:added', ({ node }: { node: Node }) => {
    if (!isPreConnectionPreview(node) && !isSequenceConnectionPreview(node)) {
      changeScheduler.markStructure()
    }
  })
  graph.on('node:removed', ({ node }: { node: Node }) => {
    movingNodes.delete(node.id)
    changeScheduler.markStructure()
  })
  graph.on('edge:added', ({ edge }: { edge: Edge }) => {
    if (!isPreConnectionPreview(edge) && !isSequenceConnectionPreview(edge)) {
      changeScheduler.markStructure()
    }
  })
  graph.on('edge:removed', ({ edge }: { edge: Edge }) => {
    if (!isPreConnectionPreview(edge) && !isSequenceConnectionPreview(edge)) {
      changeScheduler.markStructure()
    }
  })
  graph.on('edge:change:source', updateEdgeData)
  graph.on('edge:change:target', updateEdgeData)
  graph.on('edge:change:vertices', updateEdgeData)
  graph.on('cell:change:data', updateCellData)
  graph.on('edge:batch:start', () => {
    edgeBatchDepth += 1
    changeScheduler.defer()
  })
  graph.on('edge:batch:stop', () => {
    edgeBatchDepth = Math.max(0, edgeBatchDepth - 1)
    if (edgeBatchDepth === 0) changeScheduler.flush()
  })
  graph.on('edge:moved', ({ edge }: { edge: Edge }) => {
    changeScheduler.markCell(edge, 'manual')
    changeScheduler.flush()
  })
  graph.on('canvas:change:data', ({ initial }: { initial?: boolean } = {}) => {
    if (!initial) changeScheduler.markCanvas('data')
  })
}

const registerEdgeLabelEvents = (graph: Graph) => {
  graph.on('edge:change:data', ({ edge }: { edge: Edge }) => {
    syncEdgeLabelFromData(edge)
  })
}

const registerPortEvents = (
  graph: Graph,
  { strategy }: RegisterGraphEventHandlersOptions,
) => {
  const sequenceEdgeMode = isSequenceEdgeMode(strategy)
  let activeConnectionHotAreaNode: Node | null = null

  const hideActiveConnectionHotArea = (nextNode?: Node) => {
    if (!activeConnectionHotAreaNode) return
    if (nextNode && activeConnectionHotAreaNode.id === nextNode.id) return

    setNodeConnectionHotAreaVisible(graph, activeConnectionHotAreaNode, false)
    activeConnectionHotAreaNode = null
  }

  graph.on('node:added', ({ node }: any) => {
    ensureNodeConnectionPorts(node, strategy)
  })

  if (!sequenceEdgeMode) {
    const showConnectionHotArea = ({ node }: { node: Node }) => {
      if (activeConnectionHotAreaNode?.id === node.id) return

      hideActiveConnectionHotArea(node)
      setNodeConnectionHotAreaVisible(graph, node, true)
      activeConnectionHotAreaNode = node
    }

    graph.on('node:mouseenter', showConnectionHotArea)
    graph.on('node:mouseleave', ({ node }: any) => {
      setNodeConnectionHotAreaVisible(graph, node, false)
      if (activeConnectionHotAreaNode?.id === node.id) {
        activeConnectionHotAreaNode = null
      }
    })

    graph.on('node:removed', ({ node }: any) => {
      if (activeConnectionHotAreaNode?.id === node.id) {
        activeConnectionHotAreaNode = null
      }
    })
  }

  graph.on('edge:connected', ({ edge, isNew }: { edge: Edge; isNew: boolean }) => {
    if (!isNew) return

    const keepEdge = finalizeNewEdgeConnection(graph, strategy, edge)
    if (!keepEdge) {
      graph.removeEdge(edge)
      return
    }

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
    setFormPanelCell,
    preserveFormPanelOnBlank,
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
    setFormPanelCell(null)
    if (!preserveFormPanelOnBlank) {
      setFormPanelCollapsed(true)
    }
  })

  graph.on('node:click', ({ node }: { node: Node }) => {
    setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
    setFormPanelCell(node)
    setFormPanelCollapsed(false)
  })

  graph.on('edge:click', ({ edge }: { edge: Edge }) => {
    setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
    setFormPanelCell(edge)
    setFormPanelCollapsed(false)
  })

  graph.on('cell:removed', ({ cell }: { cell: Cell }) => {
    setFormPanelCell(current => current?.id === cell.id ? null : current)
  })

  if (sectionKey === 'interaction' || sectionKey === 'moduleResponses') {
    registerSequenceEdgeTools(graph)
  }
}

const registerSequenceEdgeTools = (graph: Graph) => {
  let previousConnectingHighlight: boolean | null = null
  let previousConnectingSnap: typeof graph.options.connecting.snap | null = null
  let previousConnectionCandidates: Pick<
    typeof graph.options.connecting,
    'allowNode' | 'allowPort'
  > | null = null
  let previousConnectionHighlighting: Pick<
    typeof graph.options.highlighting,
    'nodeAvailable' | 'magnetAvailable' | 'magnetAdsorbed'
  > | null = null

  const suppressConnectionHighlighting = () => {
    if (previousConnectionHighlighting !== null) return

    previousConnectionHighlighting = {
      nodeAvailable: graph.options.highlighting.nodeAvailable,
      magnetAvailable: graph.options.highlighting.magnetAvailable,
      magnetAdsorbed: graph.options.highlighting.magnetAdsorbed,
    }

    graph.options.highlighting.nodeAvailable = connectionNoopHighlighting
    graph.options.highlighting.magnetAvailable = connectionNoopHighlighting
    graph.options.highlighting.magnetAdsorbed = connectionNoopHighlighting
  }

  const restoreConnectionHighlighting = () => {
    if (previousConnectionHighlighting === null) return

    graph.options.highlighting.nodeAvailable = previousConnectionHighlighting.nodeAvailable
    graph.options.highlighting.magnetAvailable = previousConnectionHighlighting.magnetAvailable
    graph.options.highlighting.magnetAdsorbed = previousConnectionHighlighting.magnetAdsorbed
    previousConnectionHighlighting = null
  }

  const suppressConnectionCandidates = () => {
    if (previousConnectionCandidates !== null) return

    previousConnectionCandidates = {
      allowNode: graph.options.connecting.allowNode,
      allowPort: graph.options.connecting.allowPort,
    }

    graph.options.connecting.allowNode = false
    graph.options.connecting.allowPort = false
  }

  const restoreConnectionCandidates = () => {
    if (previousConnectionCandidates === null) return

    graph.options.connecting.allowNode = previousConnectionCandidates.allowNode
    graph.options.connecting.allowPort = previousConnectionCandidates.allowPort
    previousConnectionCandidates = null
  }

  graph.on('edge:batch:start', ({ name }: any) => {
    if (name !== 'move-arrowhead') return
    if (previousConnectingHighlight === null) {
      previousConnectingHighlight = graph.options.connecting.highlight
      graph.options.connecting.highlight = false
    }
    if (previousConnectingSnap === null) {
      previousConnectingSnap = graph.options.connecting.snap
      graph.options.connecting.snap = false
    }

    suppressConnectionHighlighting()
    suppressConnectionCandidates()
  })

  graph.on('edge:batch:stop', ({ name }: any) => {
    if (name !== 'move-arrowhead') return
    restoreConnectionCandidates()
    restoreConnectionHighlighting()

    if (previousConnectingHighlight !== null) {
      graph.options.connecting.highlight = previousConnectingHighlight
      previousConnectingHighlight = null
    }
    if (previousConnectingSnap !== null) {
      graph.options.connecting.snap = previousConnectingSnap
      previousConnectingSnap = null
    }
  })

  graph.on('edge:mouseenter', ({ edge }: { edge: Edge }) => {
    ensureSequenceEdgeVerticesTool(edge)

    if (!edge.hasTool('source-arrowhead')) {
      edge.addTools(
        { name: 'source-arrowhead', args: { attrs: { fill: '#1890ff', stroke: '#fff', 'stroke-width': 2, r: 4 } } },
      )
    }
    if (!edge.hasTool('target-arrowhead')) {
      edge.addTools(
        { name: 'target-arrowhead', args: { attrs: { fill: '#1890ff', stroke: '#fff', 'stroke-width': 2, r: 4 } } },
      )
    }
  })

  graph.on('edge:mouseleave', ({ edge }: { edge: Edge }) => {
    edge.removeTool('vertices')
    edge.removeTool('source-arrowhead')
    edge.removeTool('target-arrowhead')
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
    movable: false,
    pointerEvents: 'none',
  }))
  graph.use(new Clipboard({
    enabled: true,
  }))
  graph.use(new History({
    enabled: true,
  }))
  graph.use(new Keyboard({
    enabled: true,
  }))
}

const preventKeyboardDefault = (event: KeyboardEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

const registerKeyboardShortcuts = (graph: Graph, strategy: GraphStrategy) => {
  graph.bindKey(['backspace', 'del'], (event) => {
    preventKeyboardDefault(event)
    const cells = graph.getSelectedCells().filter(cell => strategy.canRemoveCell?.(cell) !== false)
    if (cells.length) {
      graph.removeCells(cells)
      graph.cleanSelection()
    }
  })

  graph.bindKey(['ctrl+c', 'meta+c', 'command+c'], (event) => {
    preventKeyboardDefault(event)

    const cells = graph.getSelectedCells().filter(cell => strategy.canCopyCell?.(cell) !== false)
    if (cells.length) {
      graph.copy(cells)
    }
  })

  graph.bindKey(['ctrl+v', 'meta+v', 'command+v'], (event) => {
    preventKeyboardDefault(event)
    if (graph.isClipboardEmpty()) return

    const cells = graph.paste({ offset: 32 })
    graph.cleanSelection()
    graph.select(cells)
  })

  graph.bindKey(['ctrl+z', 'meta+z'], (event) => {
    preventKeyboardDefault(event)
    if (!graph.canUndo()) return

    graph.undo()
  })

  graph.bindKey(['ctrl+y', 'meta+y'], (event) => {
    preventKeyboardDefault(event)
    if (!graph.canRedo()) return

    graph.redo()
  })

  graph.bindKey(['ctrl+a', 'meta+a'], (event) => {
    preventKeyboardDefault(event)

    graph.select(graph.getCells())
  })

  graph.bindKey('esc', (event) => {
    preventKeyboardDefault(event)

    graph.cleanSelection()
  })
}
