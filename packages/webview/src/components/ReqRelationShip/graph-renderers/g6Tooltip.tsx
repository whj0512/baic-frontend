import { renderToStaticMarkup } from 'react-dom/server'
import type { ElementDatum, IElementEvent } from '@antv/g6'

type TooltipTargetType = IElementEvent['targetType']
type TooltipEntry = readonly [string, unknown]

const NODE_PRIMARY_TOOLTIP_KEYS = ['name', 'type', 'subtype']
const EDGE_PRIMARY_TOOLTIP_KEYS = [
  'dataName',
  'relationType',
  'sourceName',
  'targetName',
  'dependentRange',
  'dependedRange',
]

const TOOLTIP_LABEL_MAP: Record<string, string> = {
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

export function canShowDataTooltip(event: IElementEvent, items: ElementDatum[]) {
  return (event.targetType === 'node' || event.targetType === 'edge') && getElementData(items) !== undefined
}

export async function getDataTooltipContent(event: IElementEvent, items: ElementDatum[]) {
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

function getPrimaryTooltipKeys(targetType: TooltipTargetType) {
  if (targetType === 'node') return NODE_PRIMARY_TOOLTIP_KEYS
  if (targetType === 'edge') return EDGE_PRIMARY_TOOLTIP_KEYS
  return []
}

function getTooltipTitle(targetType: TooltipTargetType, data: Record<string, unknown>) {
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

interface DataTooltipProps {
  targetType: TooltipTargetType
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

function getTooltipKindLabel(targetType: TooltipTargetType) {
  if (targetType === 'node') return '节点'
  if (targetType === 'edge') return '关系'
  return String(targetType)
}

function formatTooltipKey(key: string) {
  return TOOLTIP_LABEL_MAP[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
}

function stringifyTooltipData(data: unknown) {
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
  return stringifyTooltipData(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
