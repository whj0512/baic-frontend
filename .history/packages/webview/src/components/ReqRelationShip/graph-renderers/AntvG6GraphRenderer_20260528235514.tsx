import { useEffect, useRef } from 'react'
import { Graph } from '@antv/g6'
import type { ElementDatum, GraphOptions, IElementEvent } from '@antv/g6'
import type { G6GraphData } from '../types'

const G6_GRAPH_OPTIONS: Omit<GraphOptions, 'container' | 'data'> = {
  autoResize: true,
  autoFit: 'view',
  padding: 48,
  zoomRange: [0.2, 4],
  animation: true,
  layout: {
    type: 'force',
    preventOverlap: true,
    nodeSize: 64,
    linkDistance: 180,
  },
  behaviors: [
    { type: 'drag-canvas' },
    { type: 'zoom-canvas' },
    { type: 'drag-element' },
    { type: 'hover-activate' },
  ],
  transforms: [
    {
      type: 'process-parallel-edges',
      mode: 'bundle',
      distance: 28,
    },
  ],
  plugins: [
    {
      type: 'tooltip',
      trigger: 'hover',
      enable: canShowDataTooltip,
      getContent: getDataTooltipContent,
      mouseEnter:
      onOpenChange: () => undefined,
    },
  ],
}

function canShowDataTooltip(event: IElementEvent, items: ElementDatum[]) {
  return (event.targetType === 'node' || event.targetType === 'edge') && getElementData(items) !== undefined
}

async function getDataTooltipContent(event: IElementEvent, items: ElementDatum[]) {
  const data = getElementData(items)
  const normalizedData = isRecord(data) ? data : {}
  const primaryKeys = getPrimaryTooltipKeys(event.targetType)
  const primaryEntries = primaryKeys
    .map((key) => [key, normalizedData[key]] as const)
    .filter(([, value]) => hasDisplayValue(value))
  const detailEntries = Object.entries(normalizedData)
    .filter(([key, value]) => !primaryKeys.includes(key) && hasDisplayValue(value))
  const rawEntries = !isRecord(data) && hasDisplayValue(data) ? [['value', data] as const] : []

  const content = document.createElement('div')
  content.style.width = '320px'
  content.style.maxHeight = '320px'
  content.style.overflow = 'auto'
  content.style.padding = '2px'
  content.style.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

  const header = document.createElement('div')
  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'
  header.style.gap = '10px'
  header.style.marginBottom = '10px'

  const title = document.createElement('div')
  title.textContent = getTooltipTitle(event.targetType, normalizedData)
  title.style.fontWeight = '600'
  title.style.color = '#1f1f1f'
  title.style.fontSize = '13px'
  title.style.lineHeight = '1.4'
  title.style.overflow = 'hidden'
  title.style.textOverflow = 'ellipsis'
  title.style.whiteSpace = 'nowrap'

  header.append(title, createElementKindBadge(event.targetType))
  content.append(header)

  if (primaryEntries.length > 0) {
    content.append(createTooltipSection('核心信息', primaryEntries))
  }

  if (detailEntries.length > 0) {
    content.append(createTooltipSection('详细属性', detailEntries))
  }

  if (rawEntries.length > 0) {
    content.append(createTooltipSection('原始值', rawEntries))
  }

  if (primaryEntries.length === 0 && detailEntries.length === 0 && rawEntries.length === 0) {
    content.append(createEmptyTip())
  }

  return content
}

function getElementData(items: ElementDatum[]) {
  return items[0]?.data
}

function stringifyTooltipData(data: unknown) {
  if (data === undefined) return ''

  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function getPrimaryTooltipKeys(targetType: IElementEvent['targetType']) {
  if (targetType === 'node') {
    return ['name', 'type', 'subtype']
  }

  if (targetType === 'edge') {
    return ['dataName', 'relationType', 'sourceName', 'targetName', 'dependentRange', 'dependedRange']
  }

  return []
}

function getTooltipTitle(targetType: IElementEvent['targetType'], data: Record<string, unknown>) {
  if (targetType === 'node') {
    return toDisplayText(data.name) || '节点'
  }

  if (targetType === 'edge') {
    const sourceName = toDisplayText(data.sourceName)
    const targetName = toDisplayText(data.targetName)
    if (sourceName && targetName) return `${sourceName} -> ${targetName}`

    return toDisplayText(data.dataName) || '关系'
  }

  return '数据'
}

function createElementKindBadge(targetType: IElementEvent['targetType']) {
  const badge = document.createElement('span')
  badge.textContent = targetType === 'node' ? '节点' : targetType === 'edge' ? '关系' : String(targetType)
  badge.style.flex = '0 0 auto'
  badge.style.padding = '2px 8px'
  badge.style.borderRadius = '999px'
  badge.style.background = targetType === 'edge' ? '#fff7e6' : '#e6f4ff'
  badge.style.color = targetType === 'edge' ? '#ad6800' : '#0958d9'
  badge.style.fontSize = '12px'
  badge.style.fontWeight = '500'
  return badge
}

function createTooltipSection(title: string, entries: ReadonlyArray<readonly [string, unknown]>) {
  const section = document.createElement('section')
  section.style.marginTop = '10px'

  const heading = document.createElement('div')
  heading.textContent = title
  heading.style.marginBottom = '6px'
  heading.style.color = '#8c8c8c'
  heading.style.fontSize = '12px'
  heading.style.fontWeight = '600'

  const list = document.createElement('div')
  list.style.display = 'grid'
  list.style.gap = '6px'

  entries.forEach(([key, value]) => {
    list.append(createInfoRow(key, value))
  })

  section.append(heading, list)
  return section
}

function createInfoRow(key: string, value: unknown) {
  const row = document.createElement('div')
  row.style.display = 'grid'
  row.style.gridTemplateColumns = '88px minmax(0, 1fr)'
  row.style.gap = '8px'
  row.style.alignItems = 'start'
  row.style.padding = '6px 8px'
  row.style.border = '1px solid #f0f0f0'
  row.style.borderRadius = '6px'
  row.style.background = '#fafafa'

  const label = document.createElement('div')
  label.textContent = formatTooltipKey(key)
  label.style.color = '#8c8c8c'
  label.style.fontSize = '12px'
  label.style.lineHeight = '1.5'

  const valueBox = document.createElement('div')
  valueBox.append(createValueNode(value))

  row.append(label, valueBox)
  return row
}

function createValueNode(value: unknown) {
  if (isRecord(value) || Array.isArray(value)) {
    const code = document.createElement('pre')
    code.textContent = stringifyTooltipData(value)
    code.style.margin = '0'
    code.style.padding = '6px'
    code.style.maxHeight = '120px'
    code.style.overflow = 'auto'
    code.style.whiteSpace = 'pre-wrap'
    code.style.wordBreak = 'break-word'
    code.style.borderRadius = '4px'
    code.style.background = '#f5f5f5'
    code.style.color = '#333'
    code.style.fontSize = '12px'
    code.style.lineHeight = '1.5'
    return code
  }

  const text = document.createElement('span')
  text.textContent = toDisplayText(value)
  text.style.color = '#262626'
  text.style.fontSize = '12px'
  text.style.lineHeight = '1.5'
  text.style.wordBreak = 'break-word'
  return text
}

function createEmptyTip() {
  const empty = document.createElement('div')
  empty.textContent = '暂无可展示数据'
  empty.style.padding = '10px'
  empty.style.borderRadius = '6px'
  empty.style.background = '#fafafa'
  empty.style.color = '#8c8c8c'
  empty.style.fontSize = '12px'
  return empty
}

function formatTooltipKey(key: string) {
  const labelMap: Record<string, string> = {
    name: '名称',
    type: '类型',
    subtype: '子类型',
    dataName: '数据',
    relationType: '关系',
    sourceName: '来源',
    targetName: '目标',
    dependentRange: '依赖范围',
    dependedRange: '被依赖范围',
    endpointPairKey: '端点组',
    properties: '扩展属性',
    value: '值',
  }

  return labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
}

function hasDisplayValue(value: unknown) {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  if (isRecord(value)) return Object.keys(value).length > 0
  return true
}

function toDisplayText(value: unknown) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return stringifyTooltipData(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

interface AntvG6GraphRendererProps {
  graphData: G6GraphData
}

function AntvG6GraphRenderer({ graphData }: AntvG6GraphRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.replaceChildren()

    const graph = new Graph({
      container,
      ...G6_GRAPH_OPTIONS,
    })
    graphRef.current = graph

    return () => {
      graph.destroy()
      graphRef.current = null
      container.replaceChildren()
    }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    graph.setData(graphData)
    graph.render().catch((error) => {
      console.debug('[ReqRelationShip][G6 render error]', error)
    })
  }, [graphData])

  return <div ref={containerRef} className="antv-g6-graph-container" />
}

export default AntvG6GraphRenderer
