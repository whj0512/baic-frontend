import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Graph } from '@antv/g6'
import type { ElementDatum, GraphOptions, IElementEvent } from '@antv/g6'
import type { G6GraphData } from '../types'

const G6_LEGEND_PLUGIN_OPTIONS = {
  type: 'legend',
  key: 'req-relationship-legend',
  nodeField: 'type',
  edgeField: 'relationType',
}

const G6_ZOOM_CANVAS_KEY = 'req-relationship-zoom-canvas'

const G6_GRAPH_OPTIONS: Omit<GraphOptions, 'container' | 'data' | 'behaviors'> = {
  autoResize: true,
  autoFit: 'center',
  zoomRange: [0.5, 2],
  padding: 48,
  animation: true,
  layout: {
    type: 'd3-force',
    preventOverlap: true,
    nodeSize: 64,
    linkDistance: 180,
  },
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
      enterable: true,
      onOpenChange: () => undefined,
    },
    {
      ...G6_LEGEND_PLUGIN_OPTIONS,
    },
  ],
}

function createG6GraphOptions(container: HTMLElement): Omit<GraphOptions, 'container' | 'data'> {
  return {
    ...G6_GRAPH_OPTIONS,
    behaviors: [
      { type: 'drag-canvas' },
      {
        type: 'zoom-canvas',
        key: G6_ZOOM_CANVAS_KEY,
        origin: getContainerCenter(container),
      },
      { type: 'drag-element' },
    ],
  }
}

function getContainerCenter(container: HTMLElement): [number, number] {
  return [container.clientWidth / 2, container.clientHeight / 2]
}

function updateZoomCanvasOrigin(graph: Graph, container: HTMLElement) {
  if (graph.destroyed) return

  graph.updateBehavior({
    key: G6_ZOOM_CANVAS_KEY,
    origin: getContainerCenter(container),
  })
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

  return renderToStaticMarkup(
    <DataTooltip
      targetType={event.targetType}
      title={getTooltipTitle(event.targetType, normalizedData)}
      primaryEntries={primaryEntries}
      detailEntries={detailEntries}
      rawEntries={rawEntries}
    />,
  )
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

type TooltipEntry = readonly [string, unknown]

interface DataTooltipProps {
  targetType: IElementEvent['targetType']
  title: string
  primaryEntries: TooltipEntry[]
  detailEntries: TooltipEntry[]
  rawEntries: TooltipEntry[]
}

function DataTooltip({ targetType, title, primaryEntries, detailEntries, rawEntries }: DataTooltipProps) {
  const hasEntries = primaryEntries.length > 0 || detailEntries.length > 0 || rawEntries.length > 0

  return (
    <div className="g6-data-tooltip">
      <div className="g6-data-tooltip__header">
        <div className="g6-data-tooltip__title" title={title}>
          {title}
        </div>
        <span className={`g6-data-tooltip__badge g6-data-tooltip__badge--${targetType}`}>
          {getTooltipKindLabel(targetType)}
        </span>
      </div>

      {primaryEntries.length > 0 && <TooltipSection title="核心信息" entries={primaryEntries} />}
      {detailEntries.length > 0 && <TooltipSection title="详细属性" entries={detailEntries} />}
      {rawEntries.length > 0 && <TooltipSection title="原始值" entries={rawEntries} />}
      {!hasEntries && <div className="g6-data-tooltip__empty">暂无可展示数据</div>}
    </div>
  )
}

function TooltipSection({ title, entries }: { title: string, entries: TooltipEntry[] }) {
  return (
    <section className="g6-data-tooltip__section">
      <div className="g6-data-tooltip__section-title">{title}</div>
      <div className="g6-data-tooltip__list">
        {entries.map(([key, value]) => (
          <div className="g6-data-tooltip__row" key={key}>
            <div className="g6-data-tooltip__label">{formatTooltipKey(key)}</div>
            <div className="g6-data-tooltip__value">
              <TooltipValue value={value} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TooltipValue({ value }: { value: unknown }) {
  if (isRecord(value) || Array.isArray(value)) {
    return <pre className="g6-data-tooltip__code">{stringifyTooltipData(value)}</pre>
  }

  return <span className="g6-data-tooltip__text">{toDisplayText(value)}</span>
}

function getTooltipKindLabel(targetType: IElementEvent['targetType']) {
  if (targetType === 'node') return '节点'
  if (targetType === 'edge') return '关系'
  return String(targetType)
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
      ...createG6GraphOptions(container),
    })
    graphRef.current = graph
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => updateZoomCanvasOrigin(graph, container))
    resizeObserver?.observe(container)
    const syncZoomOriginFrame = window.requestAnimationFrame(() => updateZoomCanvasOrigin(graph, container))

    return () => {
      resizeObserver?.disconnect()
      window.cancelAnimationFrame(syncZoomOriginFrame)
      graph.destroy()
      graphRef.current = null
      container.replaceChildren()
    }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    graph.setData(graphData)
    graph.render()
      .then(() => {
        if (!graph.destroyed) {
          graph.updatePlugin(G6_LEGEND_PLUGIN_OPTIONS)
        }
      })
      .catch((error) => {
        console.debug('[ReqRelationShip][G6 render error]', error)
      })
  }, [graphData])

  return <div ref={containerRef} className="antv-g6-graph-container" />
}

export default AntvG6GraphRenderer
