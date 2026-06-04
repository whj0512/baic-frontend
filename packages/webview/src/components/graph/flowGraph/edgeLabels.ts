import type { Edge, Graph } from '@antv/x6'

const MAX_LABEL_LENGTH = 25

const truncateLabel = (text: string) => {
  return text.length > MAX_LABEL_LENGTH ? `${text.substring(0, MAX_LABEL_LENGTH)}...` : text
}

const formatSequenceLabel = (data: Record<string, any>) => {
  const parts = []
  if (data.stereotype && data.stereotype !== 'base') {
    parts.push(`<<${data.stereotype}>>`)
  }

  const msg = data.message || ''
  const prm = data.params ? data.params.map((item: any) => `${item.name}: ${item.type}`).join(', ') : ''
  const ret = data.returnType ? `: ${data.returnType}` : ''
  const mainPart = `${msg}(${prm})${ret}`

  if (mainPart !== '()') {
    parts.push(mainPart)
  }

  return parts.join('\n')
}

const syncSequenceEdgeLabel = (edge: Edge, data: Record<string, any>) => {
  const labelText = formatSequenceLabel(data)

  if (labelText) {
    edge.setLabels([{ attrs: { label: { text: truncateLabel(labelText) } } }])
  } else {
    edge.setLabels([])
  }

  if (data.msgType === 'async') {
    edge.attr('line/targetMarker/name', 'classic')
  } else if (data.msgType === 'sync') {
    edge.attr('line/targetMarker/name', 'block')
  }

  edge.attr({
    line: {
      strokeDasharray: data.isReturn ? 5 : null,
    },
  })
}

const syncConditionEdgeLabel = (edge: Edge, condition: string) => {
  if (condition) {
    edge.setLabels([{ attrs: { text: { text: truncateLabel(condition) } } }])
  } else {
    edge.setLabels([])
  }
}

export const syncEdgeLabelFromData = (edge: Edge) => {
  const data = edge.getData() || {}

  if (data.sourceId !== undefined && data.targetId !== undefined) {
    syncSequenceEdgeLabel(edge, data)
    return
  }

  if (data.condition !== undefined) {
    syncConditionEdgeLabel(edge, data.condition || '')
  }
}

export const syncInitialEdgeLabels = (graph: Graph) => {
  graph.getEdges().forEach((edge) => {
    const edgeData = edge.getData() || {}
    if (!edgeData.condition || edge.getLabels()?.length) return

    syncConditionEdgeLabel(edge, edgeData.condition)
  })
}
