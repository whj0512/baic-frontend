import type { ReactNode } from 'react'
import {
  ApartmentOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  LoadingOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import CodeDataView from '../../CodeDataView'
import { formatMessageTime } from '../../conversationUtils'
import type { ToolPanelProps } from '../types'
import type {
  OntologyQaFinding,
  OntologyQaResultsData,
  OntologyQaResultsEnvelope,
  OntologyQaResultsPanelPayload,
} from './types'
import './OntologyQaResultsPanel.css'

const FINDING_LABELS: Record<string, string> = {
  issueType: '问题类型',
  relationType: '关系类型',
  relationSource: '关系起点',
  relationTarget: '关系终点',
  isInferred: '推理关系',
  subtype: '子类型',
  severity: '严重程度',
  confidence: '置信度',
  interactionName: '交互名称',
  stateName: '状态名称',
  description: '说明',
  inferenceRule: '推理规则',
  evidence: '证据',
  recommendation: '建议',
}

const PRIMARY_FINDING_FIELDS = new Set([
  'issueType',
  'relationType',
  'relationSource',
  'relationTarget',
  'isInferred',
  'subtype',
  'severity',
  'confidence',
  'interactionName',
  'stateName',
  'name',
  'title',
  'description',
  'inferenceRule',
  'evidence',
  'recommendation',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatFieldLabel(key: string): string {
  return FINDING_LABELS[key]
    || key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replaceAll('_', ' ')
}

function toDisplayText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }
  return null
}

function getFirstText(
  record: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const text = toDisplayText(record[key])
    if (text) {
      return text
    }
  }
  return null
}

function formatGeneratedAt(value: string | null): string | null {
  if (!value) {
    return null
  }
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    return value
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, count) => total + count, 0)
}

function StructuredValue({
  value,
  depth = 0,
}: {
  value: unknown
  depth?: number
}) {
  if (value === null || value === undefined) {
    return <span className="ontology-qa-results__empty-value">未设置</span>
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? (
      <span className="ontology-qa-results__empty-value">空数组</span>
    ) : (
      <ol className="ontology-qa-results__value-list">
        {value.map((item, index) => (
          <li key={index}>
            <StructuredValue value={item} depth={depth + 1} />
          </li>
        ))}
      </ol>
    )
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)
    return entries.length === 0 ? (
      <span className="ontology-qa-results__empty-value">空对象</span>
    ) : (
      <dl className={`ontology-qa-results__record ontology-qa-results__record--depth-${Math.min(depth, 2)}`}>
        {entries.map(([key, item]) => (
          <div key={key}>
            <dt>{formatFieldLabel(key)}</dt>
            <dd><StructuredValue value={item} depth={depth + 1} /></dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <span className="ontology-qa-results__scalar">
      {toDisplayText(value) ?? String(value)}
    </span>
  )
}

function PanelState({
  kind,
  title,
  message,
}: {
  kind: 'loading' | 'error'
  title: string
  message: string
}) {
  return (
    <section
      className={`ontology-qa-results ontology-qa-results--${kind}`}
      aria-label="场景 9 本体推理结果"
    >
      <div className="ontology-qa-results__state" role={kind === 'error' ? 'alert' : 'status'}>
        {kind === 'loading'
          ? <LoadingOutlined spin />
          : <ExclamationCircleOutlined />}
        <div>
          <strong>{title}</strong>
          <p>{message}</p>
        </div>
      </div>
    </section>
  )
}

function FindingCard({
  finding,
  index,
}: {
  finding: OntologyQaFinding
  index: number
}) {
  const title = getFirstText(finding, [
    'interactionName',
    'stateName',
    'relationType',
    'issueType',
    'subtype',
    'title',
    'name',
  ]) || `结果 ${index + 1}`
  const issueType = getFirstText(finding, ['issueType', 'subtype', 'relationType'])
  const severity = getFirstText(finding, ['severity'])
  const source = getFirstText(finding, ['relationSource', 'source'])
  const target = getFirstText(finding, ['relationTarget', 'target'])
  const description = getFirstText(finding, ['description'])
  const rule = getFirstText(finding, ['inferenceRule'])
  const recommendation = getFirstText(finding, ['recommendation'])
  const evidence = finding.evidence
  const extras = Object.fromEntries(
    Object.entries(finding).filter(([key]) => !PRIMARY_FINDING_FIELDS.has(key)),
  )
  const severityClass = severity?.toLowerCase().replace(/[^a-z0-9-]/g, '')

  return (
    <details className="ontology-qa-results__finding">
      <summary>
        <span className="ontology-qa-results__finding-index">{index + 1}</span>
        <span className="ontology-qa-results__finding-title">
          <strong>{title}</strong>
          {source || target ? (
            <small>{source || '未设置'} → {target || '未设置'}</small>
          ) : issueType ? <small>{issueType}</small> : null}
        </span>
        {severity ? (
          <span className={`ontology-qa-results__severity ontology-qa-results__severity--${severityClass || 'unknown'}`}>
            {severity}
          </span>
        ) : null}
      </summary>
      <div className="ontology-qa-results__finding-body">
        {description ? <p>{description}</p> : null}
        <dl className="ontology-qa-results__finding-meta">
          {issueType ? <div><dt>类型</dt><dd>{issueType}</dd></div> : null}
          {rule ? <div><dt>推理规则</dt><dd>{rule}</dd></div> : null}
          {toDisplayText(finding.confidence) ? (
            <div><dt>置信度</dt><dd>{toDisplayText(finding.confidence)}</dd></div>
          ) : null}
          {typeof finding.isInferred === 'boolean' ? (
            <div><dt>推理关系</dt><dd>{finding.isInferred ? '是' : '否'}</dd></div>
          ) : null}
        </dl>
        {evidence !== undefined ? (
          <section className="ontology-qa-results__evidence">
            <strong>关系证据</strong>
            <StructuredValue value={evidence} />
          </section>
        ) : null}
        {recommendation ? (
          <section className="ontology-qa-results__recommendation">
            <strong>处理建议</strong>
            <p>{recommendation}</p>
          </section>
        ) : null}
        {Object.keys(extras).length > 0 ? (
          <details className="ontology-qa-results__extras">
            <summary>扩展字段</summary>
            <StructuredValue value={extras} />
          </details>
        ) : null}
      </div>
    </details>
  )
}

function FindingsSection({
  title,
  count,
  findings,
  icon,
  emptyText,
}: {
  title: string
  count: number
  findings: OntologyQaFinding[]
  icon: ReactNode
  emptyText: string
}) {
  return (
    <section className="ontology-qa-results__section">
      <header>
        <span>{icon}</span>
        <strong>{title}</strong>
        <em>{count}</em>
      </header>
      {findings.length > 0 ? (
        <div className="ontology-qa-results__findings">
          {findings.map((finding, index) => (
            <FindingCard key={index} finding={finding} index={index} />
          ))}
        </div>
      ) : (
        <p className="ontology-qa-results__empty">{emptyText}</p>
      )}
    </section>
  )
}

function RootCauseSection({
  rootCauseAnalysis,
}: {
  rootCauseAnalysis: Record<string, unknown>
}) {
  const entries = Object.entries(rootCauseAnalysis)
  return (
    <section className="ontology-qa-results__section ontology-qa-results__root-causes">
      <header>
        <span><FileSearchOutlined /></span>
        <strong>根因分析</strong>
        <em>{entries.length}</em>
      </header>
      {entries.length > 0 ? entries.map(([key, value]) => (
        <details key={key} className="ontology-qa-results__root-cause">
          <summary>{formatFieldLabel(key)}</summary>
          <StructuredValue value={value} />
        </details>
      )) : (
        <p className="ontology-qa-results__empty">结果未提供根因分析。</p>
      )}
    </section>
  )
}

function ResultsBrowser({
  envelope,
  assistantName,
  messageCreatedAt,
}: {
  envelope: Extract<OntologyQaResultsEnvelope, { status: 'success' }>
  assistantName: string
  messageCreatedAt?: string
}) {
  const { data, source_file: sourceFile } = envelope
  const stateMachineCount = sumCounts(data.summary.state_machine_issues)
  const scenarioIssueCount = sumCounts(data.summary.scenario_issues)
  const messageTime = formatMessageTime(messageCreatedAt)
  const generatedAt = formatGeneratedAt(data.generated_at)
  const summaryItems = [
    ['推理关系', data.summary.total_inferred],
    ['数据依赖', data.summary.dependencies],
    ['写冲突', data.summary.conflicts],
    ['状态机问题', stateMachineCount],
    ['场景问题', scenarioIssueCount],
  ] as const

  return (
    <section className="ontology-qa-results ontology-qa-results--success" aria-label="场景 9 本体推理结果">
      <div className="ontology-qa-results__source">
        <span aria-hidden="true"><RobotOutlined /></span>
        <strong>{assistantName}</strong>
        {messageTime ? <time dateTime={messageCreatedAt}>{messageTime}</time> : null}
      </div>
      <header className="ontology-qa-results__header">
        <span className="ontology-qa-results__header-icon" aria-hidden="true">
          <CheckCircleOutlined />
        </span>
        <div>
          <span>场景 9</span>
          <h3>本体关系推理结果</h3>
        </div>
        <div className="ontology-qa-results__badges">
          <span>协议 v{envelope.protocol_version}</span>
          <span>Schema v{data.schema_version}</span>
          <span>{sourceFile}</span>
        </div>
      </header>

      <div className="ontology-qa-results__context">
        <span><DatabaseOutlined /> {data.project_name || '未命名项目'}</span>
        {generatedAt ? <span><ClockCircleOutlined /> {generatedAt}</span> : null}
        {data.generated_by ? <span><SafetyCertificateOutlined /> {data.generated_by}</span> : null}
      </div>

      <div className="ontology-qa-results__summary">
        {summaryItems.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="ontology-qa-results__content">
        <FindingsSection
          title="推理数据依赖"
          count={data.summary.dependencies}
          findings={data.inferred_dependencies}
          icon={<BranchesOutlined />}
          emptyText="未发现推理数据依赖。"
        />
        <FindingsSection
          title="写冲突"
          count={data.summary.conflicts}
          findings={data.inferred_conflicts}
          icon={<WarningOutlined />}
          emptyText="未发现写冲突。"
        />
        <FindingsSection
          title="状态机问题"
          count={stateMachineCount}
          findings={data.state_machine_issues}
          icon={<ApartmentOutlined />}
          emptyText="未发现状态机问题。"
        />
        <FindingsSection
          title="场景问题"
          count={scenarioIssueCount}
          findings={data.scenario_issues}
          icon={<ExclamationCircleOutlined />}
          emptyText="未发现场景问题。"
        />
        <RootCauseSection rootCauseAnalysis={data.root_cause_analysis} />
      </div>

      {envelope.warnings.length > 0 ? (
        <div className="ontology-qa-results__warnings">
          <WarningOutlined />
          <div>
            <strong>协议警告</strong>
            <StructuredValue value={envelope.warnings} />
          </div>
        </div>
      ) : null}

      <details className="ontology-qa-results__raw">
        <summary>查看原始工具结果</summary>
        <CodeDataView data={envelope} />
      </details>
    </section>
  )
}

function OntologyQaResultsPanel({
  payload,
  context,
}: ToolPanelProps<OntologyQaResultsPanelPayload>) {
  if (payload.state === 'loading') {
    return (
      <PanelState
        kind="loading"
        title="正在读取场景 9 推理结果"
        message="等待只读查询工具返回结构化 JSON。"
      />
    )
  }

  if (payload.state === 'parse-error') {
    return (
      <PanelState
        kind="error"
        title="场景 9 推理结果无法解析"
        message={payload.message}
      />
    )
  }

  if (payload.state === 'remote-error') {
    return (
      <PanelState
        kind="error"
        title={`查询失败：${payload.envelope.error.code}`}
        message={payload.envelope.error.message}
      />
    )
  }

  return (
    <ResultsBrowser
      envelope={payload.envelope}
      assistantName={context.assistantName}
      messageCreatedAt={context.message.createdAt}
    />
  )
}

export default OntologyQaResultsPanel
