import {
  ApartmentOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import CodeDataView from '../../CodeDataView'
import {
  formatMessageTime,
  stringifyData,
} from '../../conversationUtils'
import type { FencePanelProps } from '../types'
import type {
  ChunkRecord,
  ChunksEnvelope,
} from './types'

function getStatusLabel(status?: string): string | null {
  switch (status) {
    case 'generating':
      return '正在生成'
    case 'failed':
      return '生成失败'
    case 'stopped':
      return '已停止'
    case 'sending':
      return '发送中'
    case 'sent':
      return '已发送'
    default:
      return null
  }
}

function toDisplayText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return null
}

function toTagValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => (
    toDisplayText(item) ?? stringifyData(item)
  ))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

const FIELD_LABELS: Record<string, string> = {
  chunk_id: '分块 ID',
  title: '标题',
  chunk_type: '分块类型',
  canonical_function_name: '规范功能名',
  parent_requirement: '父级需求',
  requirement_path: '需求路径',
  hierarchy_evidence: '层级证据',
  physical_segments: '物理片段',
  source_sections: '来源章节',
  sub_elements: '子元素',
  subfunction: '子功能',
  semantic_description: '语义描述',
  keywords: '关键词',
  merged_from: '合并来源',
  source_relative_path: '来源相对路径',
  req_id: '需求 ID',
  section_id: '章节 ID',
  name: '名称',
  text: '文本',
  id: 'ID',
  role: '角色',
  dsl_dimension: 'DSL 维度',
  end_before_section_id: '结束边界章节',
}

const KNOWN_CHUNK_FIELDS = new Set([
  'chunk_id',
  'title',
  'chunk_type',
  'canonical_function_name',
  'parent_requirement',
  'requirement_path',
  'hierarchy_evidence',
  'physical_segments',
  'source_sections',
  'sub_elements',
  'subfunction',
  'semantic_description',
  'keywords',
  'merged_from',
  'source_relative_path',
  'req_id',
])

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key
}

function hasOwnField(chunk: ChunkRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(chunk, key)
}

function getValueSummary(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} 项`
  }
  if (isRecord(value)) {
    return `${Object.keys(value).length} 个字段`
  }
  if (value === null || value === undefined || value === '') {
    return '未设置'
  }
  return '已提供'
}

function StructuredRecord({
  value,
  depth,
}: {
  value: Record<string, unknown>
  depth: number
}) {
  const entries = Object.entries(value)
  if (entries.length === 0) {
    return <span className="chunks-panel__empty-value">空对象</span>
  }

  return (
    <dl
      className={`chunks-panel__record${
        depth > 0 ? ' chunks-panel__record--nested' : ''
      }`}
    >
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt>
            <span>{getFieldLabel(key)}</span>
            {getFieldLabel(key) !== key ? <code>{key}</code> : null}
          </dt>
          <dd>
            <StructuredValue value={item} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function StructuredValue({
  value,
  depth = 0,
}: {
  value: unknown
  depth?: number
}) {
  if (value === null || value === undefined || value === '') {
    return <span className="chunks-panel__empty-value">未设置</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="chunks-panel__empty-value">空数组</span>
    }

    const hasStructuredItems = value.some((item) => (
      Array.isArray(item) || isRecord(item)
    ))
    if (!hasStructuredItems) {
      return renderTags(value.map((item) => (
        toDisplayText(item) ?? stringifyData(item)
      )))
    }

    return (
      <div className="chunks-panel__record-list">
        {value.map((item, index) => (
          <article key={index}>
            <span className="chunks-panel__record-index">{index + 1}</span>
            <StructuredValue value={item} depth={depth + 1} />
          </article>
        ))}
      </div>
    )
  }

  if (isRecord(value)) {
    return <StructuredRecord value={value} depth={depth} />
  }

  return (
    <span className="chunks-panel__scalar">
      {toDisplayText(value) ?? stringifyData(value)}
    </span>
  )
}

function ChunkInfoItem({
  label,
  rawKey,
  value,
}: {
  label: string
  rawKey: string
  value: unknown
}) {
  return (
    <div>
      <dt>
        <span>{label}</span>
        <code>{rawKey}</code>
      </dt>
      <dd><StructuredValue value={value} /></dd>
    </div>
  )
}

function ChunkPropertySection({
  label,
  rawKey,
  value,
}: {
  label: string
  rawKey: string
  value: unknown
}) {
  return (
    <section className="chunks-panel__property">
      <header>
        <div>
          <strong>{label}</strong>
          <code>{rawKey}</code>
        </div>
        <span>{getValueSummary(value)}</span>
      </header>
      <div className="chunks-panel__property-body">
        <StructuredValue value={value} />
      </div>
    </section>
  )
}

function getChunkTypeCounts(chunks: ChunkRecord[]): Array<[string, number]> {
  const counts = new Map<string, number>()
  chunks.forEach((chunk) => {
    const type = toDisplayText(chunk.chunk_type) ?? 'unknown'
    counts.set(type, (counts.get(type) ?? 0) + 1)
  })
  return Array.from(counts)
}

function getSummaryTypeCounts(
  summary: Record<string, unknown>,
  chunks: ChunkRecord[],
): Array<[string, number]> {
  const configured = summary.chunk_types
  if (configured && typeof configured === 'object' && !Array.isArray(configured)) {
    const entries = Object.entries(configured).flatMap(([type, count]) => (
      typeof count === 'number' && Number.isFinite(count)
        ? [[type, count] as [string, number]]
        : []
    ))
    if (entries.length > 0) {
      return entries
    }
  }
  return getChunkTypeCounts(chunks)
}

function renderTags(values: string[]): ReactNode {
  if (values.length === 0) {
    return <span className="chunks-panel__empty-value">暂无</span>
  }

  return (
    <span className="chunks-panel__tags">
      {values.map((value, index) => (
        <span key={`${value}:${index}`}>{value}</span>
      ))}
    </span>
  )
}

interface RelationEdge {
  parent: string
  child: string
}

const KNOWN_DOCUMENT_FIELDS = new Set([
  'name',
  'type',
  'input_path',
  'extraction_timestamp',
  'total_pages',
])

const KNOWN_RELATION_FIELDS = new Set([
  'project_name',
  'function_id',
  'includes_evidence',
  'includes_relations',
  'consistency_issues',
])

function getExtraFields(
  value: Record<string, unknown>,
  knownFields: Set<string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !knownFields.has(key)),
  )
}

function formatDocumentTime(value: unknown): string | null {
  const text = toDisplayText(value)
  if (!text) {
    return null
  }

  const timestamp = Date.parse(text)
  if (Number.isNaN(timestamp)) {
    return text
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function parseRelationEdges(value: unknown): RelationEdge[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }
    const parent = toDisplayText(item.parent)
    const child = toDisplayText(item.child)
    return parent && child ? [{ parent, child }] : []
  })
}

function RelationshipTopology({
  relationSeed,
}: {
  relationSeed: Record<string, unknown>
}) {
  const projectName = toDisplayText(relationSeed.project_name)
  const functionId = toDisplayText(relationSeed.function_id)
  const edges = parseRelationEdges(relationSeed.includes_relations)
  const groupedEdges = new Map<string, string[]>()

  edges.forEach(({ parent, child }) => {
    const children = groupedEdges.get(parent) ?? []
    if (!children.includes(child)) {
      children.push(child)
    }
    groupedEdges.set(parent, children)
  })

  if (groupedEdges.size === 0 && projectName) {
    groupedEdges.set(projectName, [])
  }

  return (
    <section className="chunks-panel__relation-section">
      <header className="chunks-panel__subheading">
        <span><ApartmentOutlined /></span>
        <div>
          <strong>项目包含关系</strong>
          <small>{edges.length > 0 ? `${edges.length} 条直接关系` : '暂无直接关系'}</small>
        </div>
      </header>

      {groupedEdges.size > 0 ? (
        <div className="chunks-panel__relation-groups">
          {Array.from(groupedEdges).map(([parent, children]) => (
            <div className="chunks-panel__relation-group" key={parent}>
              <div className="chunks-panel__relation-root">
                <ApartmentOutlined />
                <span>
                  <small>父级功能</small>
                  <strong>{parent}</strong>
                </span>
                {functionId && parent === projectName ? <code>{functionId}</code> : null}
              </div>
              {children.length > 0 ? (
                <>
                  <div className="chunks-panel__relation-trunk" aria-hidden="true" />
                  <div className="chunks-panel__relation-children">
                    {children.map((child) => (
                      <div className="chunks-panel__relation-child" key={child}>
                        <span>包含</span>
                        <strong>{child}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="chunks-panel__relation-empty">尚未提供子功能关系</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="chunks-panel__relation-empty">未提供可视化关系数据</p>
      )}
    </section>
  )
}

function RelationEvidence({
  value,
}: {
  value: unknown
}) {
  const evidenceItems = Array.isArray(value) ? value : []
  if (evidenceItems.length === 0) {
    return null
  }

  return (
    <section className="chunks-panel__evidence-section">
      <header className="chunks-panel__subheading">
        <span><BranchesOutlined /></span>
        <div>
          <strong>关系判定证据</strong>
          <small>{evidenceItems.length} 条证据</small>
        </div>
      </header>
      <div className="chunks-panel__evidence-list">
        {evidenceItems.map((item, index) => {
          if (!isRecord(item)) {
            return (
              <article className="chunks-panel__evidence-card" key={index}>
                <StructuredValue value={item} />
              </article>
            )
          }

          const sectionId = toDisplayText(item.section_id)
          const evidenceType = toDisplayText(item.evidence_type)
          const parentFunction = toDisplayText(item.parent_function)
          const childFunctions = toTagValues(item.child_functions)
          const text = toDisplayText(item.text)
          const extras = getExtraFields(item, new Set([
            'section_id',
            'evidence_type',
            'parent_function',
            'child_functions',
            'text',
          ]))

          return (
            <article className="chunks-panel__evidence-card" key={index}>
              <header>
                <strong>{sectionId ? `章节 ${sectionId}` : `证据 ${index + 1}`}</strong>
                {evidenceType ? <code>{evidenceType}</code> : null}
              </header>
              {text ? <p>{text}</p> : null}
              {parentFunction ? (
                <div className="chunks-panel__evidence-parent">
                  <span>父级功能</span>
                  <strong>{parentFunction}</strong>
                </div>
              ) : null}
              {childFunctions.length > 0 ? (
                <div className="chunks-panel__evidence-children">
                  <span>涉及子功能</span>
                  {renderTags(childFunctions)}
                </div>
              ) : null}
              {Object.keys(extras).length > 0 ? (
                <details className="chunks-panel__relation-extras">
                  <summary>扩展证据字段</summary>
                  <StructuredValue value={extras} />
                </details>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ConsistencyStatus({ value }: { value: unknown }) {
  const issues = Array.isArray(value) ? value : []

  return (
    <section
      className={`chunks-panel__consistency${
        issues.length > 0 ? ' chunks-panel__consistency--warning' : ''
      }`}
    >
      {issues.length > 0 ? <WarningOutlined /> : <SafetyCertificateOutlined />}
      <div>
        <strong>
          {issues.length > 0
            ? `发现 ${issues.length} 项一致性问题`
            : '未发现一致性问题'}
        </strong>
        {issues.length > 0 ? (
          <div className="chunks-panel__consistency-issues">
            {issues.map((issue, index) => (
              <article key={index}>
                <StructuredValue value={issue} />
              </article>
            ))}
          </div>
        ) : (
          <span>当前文档关系与项目结构保持一致</span>
        )}
      </div>
    </section>
  )
}

function DocumentRelationView({
  documentInfo,
  relationSeed,
}: {
  documentInfo: Record<string, unknown>
  relationSeed?: Record<string, unknown> | null
}) {
  const name = toDisplayText(documentInfo.name) ?? '未命名文档'
  const type = toDisplayText(documentInfo.type)
  const inputPath = toDisplayText(documentInfo.input_path)
  const extractionTime = formatDocumentTime(documentInfo.extraction_timestamp)
  const totalPages = toDisplayText(documentInfo.total_pages)
  const documentExtras = getExtraFields(documentInfo, KNOWN_DOCUMENT_FIELDS)
  const relationExtras = relationSeed
    ? getExtraFields(relationSeed, KNOWN_RELATION_FIELDS)
    : {}

  return (
    <div className="chunks-panel__document-view">
      <section className="chunks-panel__document-card">
        <header>
          <span className="chunks-panel__document-icon"><FileTextOutlined /></span>
          <div>
            <small>来源文档</small>
            <strong>{name}</strong>
          </div>
          {type ? <code>{type}</code> : null}
        </header>
        <dl className="chunks-panel__document-meta">
          <div>
            <dt><ClockCircleOutlined /> 提取时间</dt>
            <dd>{extractionTime ?? '未设置'}</dd>
          </div>
          <div>
            <dt>文档页数</dt>
            <dd>{totalPages ?? '未设置'}</dd>
          </div>
          <div className="chunks-panel__document-path">
            <dt>输入路径</dt>
            <dd title={inputPath ?? undefined}>{inputPath ?? '未设置'}</dd>
          </div>
        </dl>
        {Object.keys(documentExtras).length > 0 ? (
          <details className="chunks-panel__relation-extras">
            <summary>文档扩展字段</summary>
            <StructuredValue value={documentExtras} />
          </details>
        ) : null}
      </section>

      {relationSeed ? (
        <>
          <RelationshipTopology relationSeed={relationSeed} />
          <RelationEvidence value={relationSeed.includes_evidence} />
          <ConsistencyStatus value={relationSeed.consistency_issues} />
          {Object.keys(relationExtras).length > 0 ? (
            <details className="chunks-panel__relation-extras chunks-panel__relation-extras--root">
              <summary>扩展关系数据</summary>
              <StructuredValue value={relationExtras} />
            </details>
          ) : null}
        </>
      ) : (
        <div className="chunks-panel__relation-empty">
          当前协议未提供项目关系数据
        </div>
      )}
    </div>
  )
}

interface ChunkingRuleView {
  key: string
  name: string
  status: boolean | null
  description: string | null
  details: unknown
}

const RULE_NAME_FIELDS = ['name', 'title', 'rule', 'rule_name', 'rule_id', 'id']
const RULE_DESCRIPTION_FIELDS = ['description', 'detail', 'reason', 'text']

function formatRuleName(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getRuleRecordText(
  value: Record<string, unknown>,
  fields: string[],
): string | null {
  for (const field of fields) {
    const text = toDisplayText(value[field])
    if (text) {
      return text
    }
  }
  return null
}

function getRuleStatus(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }
  if (!isRecord(value)) {
    return null
  }
  if (typeof value.applied === 'boolean') {
    return value.applied
  }
  if (typeof value.enabled === 'boolean') {
    return value.enabled
  }

  const status = toDisplayText(value.status)?.toLowerCase()
  if (status && ['applied', 'enabled', 'success', 'active'].includes(status)) {
    return true
  }
  if (status && ['skipped', 'disabled', 'failed', 'inactive'].includes(status)) {
    return false
  }
  return null
}

function createRuleView(
  value: unknown,
  index: number,
  rawKey?: string,
): ChunkingRuleView {
  const record = isRecord(value) ? value : null
  const recordName = record
    ? getRuleRecordText(record, RULE_NAME_FIELDS)
    : null
  const description = record
    ? getRuleRecordText(record, RULE_DESCRIPTION_FIELDS)
    : typeof value === 'string'
      ? value
      : null
  const omittedFields = new Set([
    ...RULE_NAME_FIELDS,
    ...RULE_DESCRIPTION_FIELDS,
    'applied',
    'enabled',
    'status',
  ])
  const recordDetails = record
    ? Object.fromEntries(
        Object.entries(record).filter(([key]) => !omittedFields.has(key)),
      )
    : value
  const details =
    typeof value === 'boolean'
    || description === value
    || (isRecord(recordDetails) && Object.keys(recordDetails).length === 0)
      ? null
      : recordDetails

  return {
    key: rawKey ?? String(index),
    name:
      recordName
      ?? (rawKey ? formatRuleName(rawKey) : `规则 ${index + 1}`),
    status: getRuleStatus(value),
    description,
    details,
  }
}

function normalizeChunkingRules(value: unknown): ChunkingRuleView[] {
  if (Array.isArray(value)) {
    return value.map((rule, index) => createRuleView(rule, index))
  }
  if (isRecord(value)) {
    return Object.entries(value).map(([key, rule], index) => (
      createRuleView(rule, index, key)
    ))
  }
  if (value === null || value === undefined || value === '') {
    return []
  }
  return [createRuleView(value, 0)]
}

function ChunkingRulesView({ value }: { value: unknown }) {
  const rules = normalizeChunkingRules(value)

  return (
    <section className="chunks-panel__rules" aria-label="已应用的分块规则">
      <header className="chunks-panel__rules-heading">
        <span><SafetyCertificateOutlined /></span>
        <div>
          <strong>已应用的分块规则</strong>
          <small>chunking_rules_applied</small>
        </div>
        <em>{rules.length} 项</em>
      </header>

      {rules.length > 0 ? (
        <ol className="chunks-panel__rules-list">
          {rules.map((rule, index) => (
            <li
              className={`chunks-panel__rule${
                rule.status === false ? ' chunks-panel__rule--inactive' : ''
              }`}
              key={`${rule.key}:${index}`}
            >
              <span className="chunks-panel__rule-index">{index + 1}</span>
              <div className="chunks-panel__rule-content">
                <header>
                  <strong>{rule.name}</strong>
                  <span>
                    {rule.status === false ? '未启用' : '已应用'}
                  </span>
                </header>
                {rule.description && rule.description !== rule.name ? (
                  <p>{rule.description}</p>
                ) : null}
                {rule.details !== null ? (
                  <div className="chunks-panel__rule-details">
                    <StructuredValue value={rule.details} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="chunks-panel__rules-empty">协议未列出具体分块规则</p>
      )}
    </section>
  )
}

function ChunkDetails({ chunk }: { chunk: ChunkRecord }) {
  const basicFields = [
    ['chunk_id', chunk.chunk_id],
    ['title', chunk.title],
    ['chunk_type', chunk.chunk_type],
    ['canonical_function_name', chunk.canonical_function_name],
    ['req_id', chunk.req_id],
    ['source_relative_path', chunk.source_relative_path],
  ].filter(([key]) => hasOwnField(chunk, String(key))) as Array<
    [string, unknown]
  >
  const structuredFields = [
    ['parent_requirement', chunk.parent_requirement],
    ['subfunction', chunk.subfunction],
    ['requirement_path', chunk.requirement_path],
    ['hierarchy_evidence', chunk.hierarchy_evidence],
    ['physical_segments', chunk.physical_segments],
    ['source_sections', chunk.source_sections],
    ['sub_elements', chunk.sub_elements],
    ['merged_from', chunk.merged_from],
  ].filter(([key]) => hasOwnField(chunk, String(key))) as Array<
    [string, unknown]
  >
  const extraFields = Object.fromEntries(
    Object.entries(chunk).filter(([key]) => !KNOWN_CHUNK_FIELDS.has(key)),
  )

  return (
    <div className="chunks-panel__chunk-body">
      {hasOwnField(chunk, 'semantic_description') ? (
        <section className="chunks-panel__description">
          <strong>语义描述</strong>
          <p>
            {toDisplayText(chunk.semantic_description) ?? '未设置'}
          </p>
        </section>
      ) : null}

      <dl className="chunks-panel__basics">
        {basicFields.map(([key, value]) => (
          <ChunkInfoItem
            key={key}
            label={getFieldLabel(key)}
            rawKey={key}
            value={value}
          />
        ))}
      </dl>

      {hasOwnField(chunk, 'keywords') ? (
        <section className="chunks-panel__keywords">
          <strong>
            <TagsOutlined />
            关键词
          </strong>
          {renderTags(toTagValues(chunk.keywords))}
        </section>
      ) : null}

      <div className="chunks-panel__properties">
        {structuredFields.map(([key, value]) => (
          <ChunkPropertySection
            key={key}
            label={getFieldLabel(key)}
            rawKey={key}
            value={value}
          />
        ))}

        {Object.keys(extraFields).length > 0 ? (
          <ChunkPropertySection
            label="扩展属性"
            rawKey="extensions"
            value={extraFields}
          />
        ) : null}
      </div>

      <details className="chunks-panel__raw chunks-panel__raw--nested">
        <summary>查看该分块原始 JSON</summary>
        <CodeDataView data={chunk} />
      </details>
    </div>
  )
}

function ChunkCard({ chunk }: { chunk: ChunkRecord }) {
  const title = toDisplayText(chunk.title) ?? '未命名分块'
  const chunkType = toDisplayText(chunk.chunk_type) ?? 'unknown'
  const requirementId = toDisplayText(chunk.req_id)
  const subElementCount = getArrayLength(chunk.sub_elements)

  return (
    <details className="chunks-panel__chunk">
      <summary>
        <span className="chunks-panel__chunk-icon" aria-hidden="true">
          <AppstoreOutlined />
        </span>
        <span className="chunks-panel__chunk-title">
          <strong>{title}</strong>
          <span>
            <code>{chunk.chunk_id}</code>
            {requirementId ? <code>{requirementId}</code> : null}
            <em>{subElementCount} 个子元素</em>
          </span>
        </span>
        <span className="chunks-panel__type">{chunkType}</span>
      </summary>
      <ChunkDetails chunk={chunk} />
    </details>
  )
}

function getErrorDetails(value: unknown): {
  code: string | null
  message: string
} {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    return {
      code: toDisplayText(record.code),
      message:
        toDisplayText(record.message)
        ?? toDisplayText(record.detail)
        ?? stringifyData(value),
    }
  }

  return {
    code: null,
    message: toDisplayText(value) ?? '查询失败，服务未返回错误详情。',
  }
}

function ChunksMessagePanel({
  payload,
  context,
}: FencePanelProps<ChunksEnvelope>) {
  const { message, assistantName, standalone } = context
  const data = payload.data
  const chunks = data?.chunks ?? []
  const summary = data?.chunking_summary ?? {}
  const declaredTotal = summary.total_chunks
  const totalChunks =
    typeof declaredTotal === 'number' && Number.isFinite(declaredTotal)
      ? declaredTotal
      : chunks.length
  const mergeCount =
    typeof summary.merge_count === 'number'
      && Number.isFinite(summary.merge_count)
      ? summary.merge_count
      : 0
  const typeCounts = getSummaryTypeCounts(summary, chunks)
  const detail = toDisplayText(payload.detail)
  const time = formatMessageTime(message.createdAt)
  const statusLabel = getStatusLabel(message.status)
  const errorDetails =
    payload.status === 'error' ? getErrorDetails(payload.error) : null

  return (
    <section
      className={`chunks-panel chunks-panel--${payload.status}`}
      aria-label="需求分块结果"
    >
      {standalone ? (
        <div className="chunks-panel__source">
          <span aria-hidden="true"><RobotOutlined /></span>
          <strong>{assistantName}</strong>
          {time ? <time dateTime={message.createdAt}>{time}</time> : null}
          {statusLabel ? (
            <em className={`conversation-message__status conversation-message__status--${message.status}`}>
              {statusLabel}
            </em>
          ) : null}
        </div>
      ) : null}

      <header className="chunks-panel__header">
        <span className="chunks-panel__header-icon" aria-hidden="true">
          {payload.status === 'success'
            ? <CheckCircleOutlined />
            : <WarningOutlined />}
        </span>
        <div className="chunks-panel__heading">
          <span>流水线一</span>
          <h3>需求分块结果</h3>
        </div>
        <div className="chunks-panel__badges">
          <span className={`chunks-panel__status chunks-panel__status--${payload.status}`}>
            {payload.status}
          </span>
          <span>v{payload.protocol_version}</span>
          {detail ? <span>{detail}</span> : null}
        </div>
      </header>

      {payload.status === 'success' && data ? (
        <>
          <div className="chunks-panel__summary">
            <div>
              <strong>{totalChunks}</strong>
              <span>分块总数</span>
            </div>
            <div>
              <strong>{mergeCount}</strong>
              <span>合并记录</span>
            </div>
            <div className="chunks-panel__summary-types">
              <strong>{typeCounts.length}</strong>
              <span>分块类型</span>
              <small>
                {typeCounts.map(([type, count]) => (
                  <em key={type}>{type} {count}</em>
                ))}
              </small>
            </div>
          </div>

          {Object.prototype.hasOwnProperty.call(data, 'chunking_rules_applied') ? (
            <ChunkingRulesView value={data.chunking_rules_applied} />
          ) : null}

          <details className="chunks-panel__context">
            <summary>
              <FileTextOutlined />
              <span>文档与项目关系</span>
            </summary>
            <div className="chunks-panel__context-body">
              <DocumentRelationView
                documentInfo={data.document_info}
                relationSeed={data.project_relation_seed}
              />
            </div>
          </details>

          <div className="chunks-panel__section-title">
            <span>
              <BranchesOutlined />
              分块列表
            </span>
            <small>{chunks.length} 项</small>
          </div>

          <div className="chunks-panel__list">
            {chunks.map((chunk) => (
              <ChunkCard key={chunk.chunk_id} chunk={chunk} />
            ))}
          </div>
        </>
      ) : errorDetails ? (
        <div className="chunks-panel__error" role="alert">
          <WarningOutlined />
          <div>
            {errorDetails.code ? <code>{errorDetails.code}</code> : null}
            <strong>分块查询失败</strong>
            <p>{errorDetails.message}</p>
          </div>
        </div>
      ) : null}

      {payload.warnings.length > 0 ? (
        <div className="chunks-panel__warnings">
          <WarningOutlined />
          <div>
            <strong>协议警告</strong>
            <ul>
              {payload.warnings.map((warning, index) => (
                <li key={index}>{toDisplayText(warning) ?? stringifyData(warning)}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <details className="chunks-panel__raw">
        <summary>查看原始 JSON</summary>
        <CodeDataView data={payload} />
      </details>
    </section>
  )
}

export default ChunksMessagePanel
