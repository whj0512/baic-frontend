import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Graph } from '@antv/g6'
import type { ElementDatum, IPointerEvent } from '@antv/g6'
import type { G6GraphData } from '../types'
import {
  G6_LEGEND_PLUGIN_OPTIONS,
  createG6GraphOptions,
  updateZoomCanvasOrigin,
} from './g6GraphOptions'

interface AntvG6GraphRendererProps {
  graphData: G6GraphData
}

type SelectableElementType = 'node' | 'edge'
type PanelEntry = readonly [string, unknown]

interface SelectedGraphElement {
  targetType: SelectableElementType
  datum: ElementDatum
}

interface GraphElementPanelData {
  targetType: SelectableElementType
  title: string
  primaryEntries: PanelEntry[]
  detailEntries: PanelEntry[]
  rawEntries: PanelEntry[]
}

const NODE_PRIMARY_PANEL_KEYS = ['id', 'name', 'type', 'subtype']
const EDGE_PRIMARY_PANEL_KEYS = [
  'id',
  'source',
  'target',
  'dataName',
  'relationType',
  'sourceName',
  'targetName',
  'dependentRange',
  'dependedRange',
]

const PANEL_LABEL_MAP: Record<string, string> = {
  id: 'ID',
  name: '名称',
  type: '类型',
  subtype: '\u5b50\u7c7b\u578b',
  source: '源节点',
  target: '目标节点',
  dataName: '依赖数据',
  relationType: '\u5173\u7cfb',
  sourceName: '\u6765\u6e90',
  targetName: '\u76ee\u6807',
  dependentRange: '\u4f9d\u8d56\u8303\u56f4',
  dependedRange: '\u88ab\u4f9d\u8d56\u8303\u56f4',
  endpointPairKey: '\u7aef\u70b9\u7ec4',
  properties: '\u6269\u5c55\u5c5e\u6027',
  value: '\u503c',
}

const PANEL_TITLE = '\u5c5e\u6027\u9762\u677f'
const PANEL_EMPTY_TEXT = '\u70b9\u51fb\u8282\u70b9\u6216\u8fb9\u67e5\u770b\u5c5e\u6027'
const PANEL_PRIMARY_SECTION_TITLE = '\u57fa\u672c\u5c5e\u6027'
const PANEL_DETAIL_SECTION_TITLE = '\u8be6\u7ec6\u5c5e\u6027'
const PANEL_RAW_SECTION_TITLE = '\u539f\u59cb\u503c'
const PANEL_EMPTY_DATA_TEXT = '\u6682\u65e0\u53ef\u5c55\u793a\u6570\u636e'
const NODE_KIND_LABEL = '\u8282\u70b9'
const EDGE_KIND_LABEL = '\u5173\u7cfb'
const DATA_KIND_LABEL = '\u6570\u636e'

function renderGraphData(graph: Graph, graphData: G6GraphData) {
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
}

function observeContainerResize(container: HTMLElement, onResize: () => void) {
  if (typeof ResizeObserver === 'undefined') return null

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)
  return resizeObserver
}

function AntvG6GraphRenderer({ graphData }: AntvG6GraphRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)
  const [selectedElement, setSelectedElement] = useState<SelectedGraphElement | null>(null)

  const handleElementClick = useCallback((event: IPointerEvent) => {
    if (event.targetType !== 'node' && event.targetType !== 'edge') {
      setSelectedElement(null)
      return
    }

    const targetId = 'id' in event.target && typeof event.target.id === 'string' ? event.target.id : undefined
    const graph = graphRef.current
    if (!targetId || !graph || graph.destroyed) {
      setSelectedElement(null)
      return
    }

    const datum = graph.getElementData(targetId)
    if (!datum) {
      setSelectedElement(null)
      return
    }

    setSelectedElement({
      targetType: event.targetType,
      datum,
    })
  }, [])

  const panelData = useMemo(
    () => selectedElement && createPanelData(selectedElement),
    [selectedElement],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.replaceChildren()

    const graph = new Graph({
      container,
      ...createG6GraphOptions(container, handleElementClick),
    })
    graphRef.current = graph

    const syncZoomOrigin = () => updateZoomCanvasOrigin(graph, container)
    const resizeObserver = observeContainerResize(container, syncZoomOrigin)
    const syncZoomOriginFrame = window.requestAnimationFrame(syncZoomOrigin)

    return () => {
      resizeObserver?.disconnect()
      window.cancelAnimationFrame(syncZoomOriginFrame)
      graph.destroy()
      graphRef.current = null
      container.replaceChildren()
    }
  }, [handleElementClick])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed) return

    setSelectedElement(null)
    renderGraphData(graph, graphData)
  }, [graphData])

  return (
    <div className="antv-g6-graph-layout">
      <div ref={containerRef} className="antv-g6-graph-container" />
      <GraphElementPropertiesPanel panelData={panelData} />
    </div>
  )
}

function createPanelData(selectedElement: SelectedGraphElement): GraphElementPanelData {
  const { targetType, datum } = selectedElement
  const normalizedData = isRecord(datum.data) ? datum.data : {}
  const panelProperties = {
    ...normalizedData,
    id: datum.id,
    source: 'source' in datum ? datum.source : undefined,
    target: 'target' in datum ? datum.target : undefined,
  }
  const primaryKeys = getPrimaryPanelKeys(targetType)
  const primaryEntries = primaryKeys
    .map((key) => [key, panelProperties[key]] as const)
    .filter(([, value]) => hasDisplayValue(value))
  const detailEntries = Object.entries(panelProperties)
    .filter(([key, value]) => !primaryKeys.includes(key) && hasDisplayValue(value))
  const rawEntries = !isRecord(datum.data) && hasDisplayValue(datum.data) ? [['value', datum.data] as const] : []

  return {
    targetType,
    title: getPanelTitle(targetType, panelProperties),
    primaryEntries,
    detailEntries,
    rawEntries,
  }
}

function GraphElementPropertiesPanel({ panelData }: { panelData: GraphElementPanelData | null }) {
  const hasEntries = panelData
    && (panelData.primaryEntries.length > 0 || panelData.detailEntries.length > 0 || panelData.rawEntries.length > 0)

  return (
    <aside className="g6-properties-panel">
      <div className="g6-properties-panel__heading">{PANEL_TITLE}</div>
      {!panelData ? (
        <div className="g6-properties-panel__empty">{PANEL_EMPTY_TEXT}</div>
      ) : (
        <>
          <div className="g6-properties-panel__header">
            <div className="g6-properties-panel__title" title={panelData.title}>
              {panelData.title}
            </div>
            <span className={`g6-properties-panel__badge g6-properties-panel__badge--${panelData.targetType}`}>
              {getPanelKindLabel(panelData.targetType)}
            </span>
          </div>

          {panelData.primaryEntries.length > 0 && (
            <PanelSection title={PANEL_PRIMARY_SECTION_TITLE} entries={panelData.primaryEntries} />
          )}
          {panelData.detailEntries.length > 0 && (
            <PanelSection title={PANEL_DETAIL_SECTION_TITLE} entries={panelData.detailEntries} />
          )}
          {panelData.rawEntries.length > 0 && (
            <PanelSection title={PANEL_RAW_SECTION_TITLE} entries={panelData.rawEntries} />
          )}
          {!hasEntries && <div className="g6-properties-panel__empty">{PANEL_EMPTY_DATA_TEXT}</div>}
        </>
      )}
    </aside>
  )
}

function PanelSection({ title, entries }: { title: string, entries: PanelEntry[] }) {
  return (
    <section className="g6-properties-panel__section">
      <div className="g6-properties-panel__section-title">{title}</div>
      <div className="g6-properties-panel__list">
        {entries.map(([key, value]) => (
          <div className="g6-properties-panel__row" key={key}>
            <div className="g6-properties-panel__label">{formatPanelKey(key)}</div>
            <div className="g6-properties-panel__value">
              <PanelValue value={value} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PanelValue({ value }: { value: unknown }) {
  if (isRecord(value) || Array.isArray(value)) {
    return <pre className="g6-properties-panel__code">{stringifyPanelData(value)}</pre>
  }

  return <span className="g6-properties-panel__text">{toDisplayText(value)}</span>
}

function getPrimaryPanelKeys(targetType: SelectableElementType) {
  if (targetType === 'node') return NODE_PRIMARY_PANEL_KEYS
  return EDGE_PRIMARY_PANEL_KEYS
}

function getPanelTitle(targetType: SelectableElementType, data: Record<string, unknown>) {
  if (targetType === 'node') {
    return toDisplayText(data.name) || toDisplayText(data.id) || NODE_KIND_LABEL
  }

  const sourceName = toDisplayText(data.sourceName)
  const targetName = toDisplayText(data.targetName)
  if (sourceName && targetName) return `${sourceName} -> ${targetName}`

  return toDisplayText(data.dataName) || toDisplayText(data.relationType) || toDisplayText(data.id) || EDGE_KIND_LABEL
}

function getPanelKindLabel(targetType: SelectableElementType) {
  if (targetType === 'node') return NODE_KIND_LABEL
  if (targetType === 'edge') return EDGE_KIND_LABEL
  return DATA_KIND_LABEL
}

function formatPanelKey(key: string) {
  return PANEL_LABEL_MAP[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
}

function stringifyPanelData(data: unknown) {
  if (data === undefined) return ''

  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
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
  return stringifyPanelData(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export default AntvG6GraphRenderer
