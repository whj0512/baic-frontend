import type { ElementDatum } from '@antv/g6'

export type SelectableElementType = 'node' | 'edge'

type PanelEntry = readonly [string, unknown]

export interface GraphElementPanelData {
  targetType: SelectableElementType
  title: string
  entries: PanelEntry[]
}

const NODE_PRIMARY_PANEL_KEYS = ['name', 'type', 'subtype']
const EDGE_PRIMARY_PANEL_KEYS = [
  'dataName',
  'relationType',
  'sourceName',
  'targetName',
  'dependentRange',
  'dependedRange',
]

const PANEL_LABEL_MAP: Record<string, string> = {
  name: '名称',
  type: '类型',
  subtype: '子类型',
  dataName: '依赖数据',
  relationType: '关系类型',
  sourceName: '源节点',
  targetName: '目标节点',
  dependentRange: '依赖范围',
  dependedRange: '被依赖范围',
}

const PANEL_TITLE = '属性面板'
const PANEL_EMPTY_TEXT = '点击节点或边查看属性'
const PANEL_PRIMARY_SECTION_TITLE = '基本属性'
const PANEL_EMPTY_DATA_TEXT = '暂无可展示数据'
const NODE_KIND_LABEL = '节点'
const EDGE_KIND_LABEL = '关系'

export function createPanelData(targetType: SelectableElementType, datum: ElementDatum): GraphElementPanelData {
  const data = getElementDataRecord(datum)
  const primaryKeys = getPrimaryPanelKeys(targetType)
  const entries = primaryKeys
    .map((key) => [key, data[key]] as const)
    .filter(([, value]) => hasDisplayValue(value))

  return {
    targetType,
    title: getPanelTitle(targetType, data, datum.id),
    entries,
  }
}

function G6PropertiesPanel({ panelData }: { panelData: GraphElementPanelData | null }) {
  const hasEntries = panelData && panelData.entries.length > 0

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

          {panelData.entries.length > 0 && (
            <PanelSection title={PANEL_PRIMARY_SECTION_TITLE} entries={panelData.entries} />
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
  return <span className="g6-properties-panel__text">{toDisplayText(value)}</span>
}

function getPrimaryPanelKeys(targetType: SelectableElementType) {
  if (targetType === 'node') return NODE_PRIMARY_PANEL_KEYS
  return EDGE_PRIMARY_PANEL_KEYS
}

function getPanelTitle(targetType: SelectableElementType, data: Record<string, unknown>, fallbackId: string) {
  if (targetType === 'node') {
    return toDisplayText(data.name) || fallbackId || NODE_KIND_LABEL
  }

  const sourceName = toDisplayText(data.sourceName)
  const targetName = toDisplayText(data.targetName)
  if (sourceName && targetName) return `${sourceName} -> ${targetName}`

  return toDisplayText(data.dataName) || toDisplayText(data.relationType) || fallbackId || EDGE_KIND_LABEL
}

function getPanelKindLabel(targetType: SelectableElementType) {
  if (targetType === 'node') return NODE_KIND_LABEL
  return EDGE_KIND_LABEL
}

function formatPanelKey(key: string) {
  return PANEL_LABEL_MAP[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
}

function hasDisplayValue(value: unknown) {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

function toDisplayText(value: unknown) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function getElementDataRecord(datum: ElementDatum): Record<string, unknown> {
  return isRecord(datum.data) ? datum.data : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export default G6PropertiesPanel
