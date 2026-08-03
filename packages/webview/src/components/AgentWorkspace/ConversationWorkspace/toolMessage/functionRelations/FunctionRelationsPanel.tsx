import {
  ArrowRightOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FolderOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  LoadingOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ToolPanelProps } from '../types'
import type {
  FunctionRelation,
  FunctionRelationsPanelPayload,
} from './types'
import './FunctionRelationsPanel.css'

const SOURCE_FILE_SUFFIX = '-relation.json'
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

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

function getOptionalText(
  relation: FunctionRelation,
  field: string,
): string | null {
  const value = relation[field]
  return typeof value === 'string' && value.trim() ? value : null
}

function EvidenceValue({ value }: { value: unknown }) {
  if (typeof value === 'string') {
    return <span>{value}</span>
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span>{String(value)}</span>
  }
  try {
    return <code>{JSON.stringify(value, null, 2)}</code>
  } catch {
    return <span>无法显示该证据</span>
  }
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
      className={`function-relations-panel function-relations-panel--${kind}`}
      aria-live="polite"
    >
      <div className="function-relations-panel__state">
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

function RelationCard({
  relation,
  index,
}: {
  relation: FunctionRelation
  index: number
}) {
  const relationIri = getOptionalText(relation, 'relationIRI')
  const sourceIri = getOptionalText(relation, 'relationSourceIRI')
  const targetIri = getOptionalText(relation, 'relationTargetIRI')
  const hasIriDetails = Boolean(relationIri || sourceIri || targetIri)

  return (
    <article
      className={`function-relation-card${
        relation.isInferred ? ' function-relation-card--inferred' : ''
      }`}
    >
      <header>
        <div className="function-relation-card__badges">
          <span>{relation.relationType}</span>
          <span>{relation.isInferred ? '推理关系' : '声明关系'}</span>
          {relation.subtype ? <span>{relation.subtype}</span> : null}
        </div>
        <small>关系 #{index + 1}</small>
      </header>

      <div className="function-relation-card__path">
        <div>
          <small>起点</small>
          <strong>{relation.relationSource}</strong>
        </div>
        <ArrowRightOutlined aria-hidden="true" />
        <div>
          <small>终点</small>
          <strong>{relation.relationTarget}</strong>
        </div>
      </div>

      <dl className="function-relation-card__attributes">
        <div>
          <dt>置信度</dt>
          <dd>{relation.confidence}</dd>
        </div>
        <div>
          <dt>推理规则</dt>
          <dd>{relation.inferenceRule || '无'}</dd>
        </div>
      </dl>

      <div className="function-relation-card__evidence">
        <strong>关系证据</strong>
        {relation.evidence.length > 0 ? (
          <ol>
            {relation.evidence.map((evidence, evidenceIndex) => (
              <li key={evidenceIndex}>
                <EvidenceValue value={evidence} />
              </li>
            ))}
          </ol>
        ) : (
          <p>未提供证据。</p>
        )}
      </div>

      {hasIriDetails ? (
        <details className="function-relation-card__iri">
          <summary>查看 IRI</summary>
          <dl>
            {relationIri ? (
              <div><dt>关系</dt><dd>{relationIri}</dd></div>
            ) : null}
            {sourceIri ? (
              <div><dt>起点</dt><dd>{sourceIri}</dd></div>
            ) : null}
            {targetIri ? (
              <div><dt>终点</dt><dd>{targetIri}</dd></div>
            ) : null}
          </dl>
        </details>
      ) : null}
    </article>
  )
}

function FunctionRelationsBrowser({
  payload,
  assistantName,
}: {
  payload: Extract<FunctionRelationsPanelPayload, { state: 'success' }>
  assistantName: string
}) {
  const panelRef = useRef<HTMLElement | null>(null)
  const expandButtonRef = useRef<HTMLButtonElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const { envelope } = payload
  const { data } = envelope
  const generatedAt = formatGeneratedAt(data.generated_at)
  const functionName = envelope.source_file.slice(0, -SOURCE_FILE_SUFFIX.length)
  const relationTypes = Object.entries(data.summary.by_type)
  const visibleRelations = selectedType
    ? data.relations.filter((relation) => relation.relationType === selectedType)
    : data.relations

  useEffect(() => {
    if (!expanded) {
      return
    }

    const panel = panelRef.current
    const scrollContainer = panel?.closest<HTMLElement>('.conversation-canvas')
    const previousBodyOverflow = document.body.style.overflow
    const previousCanvasOverflow = scrollContainer?.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false)
        return
      }
      if (event.key !== 'Tab') {
        return
      }

      const focusable = panel
        ? [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        : []
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    if (scrollContainer) {
      scrollContainer.style.overflow = 'hidden'
    }
    window.addEventListener('keydown', handleKeyDown)
    const focusFrame = requestAnimationFrame(() => {
      expandButtonRef.current?.focus()
    })

    return () => {
      cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousBodyOverflow
      if (scrollContainer) {
        scrollContainer.style.overflow = previousCanvasOverflow ?? ''
      }
      window.removeEventListener('keydown', handleKeyDown)
      requestAnimationFrame(() => {
        expandButtonRef.current?.focus()
      })
    }
  }, [expanded])

  const handleExpandToggle = useCallback(() => {
    setExpanded((current) => !current)
  }, [])

  return (
    <section
      ref={panelRef}
      className={`function-relations-panel${
        expanded ? ' function-relations-panel--expanded' : ''
      }`}
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? `${functionName} 功能关系全屏视图` : undefined}
    >
      <header className="function-relations-panel__header">
        <span className="function-relations-panel__header-icon">
          <BranchesOutlined />
        </span>
        <div>
          <small>query-project-function-relations · {assistantName}</small>
          <h3>{functionName} · 功能关系</h3>
        </div>
        <button
          ref={expandButtonRef}
          type="button"
          className="function-relations-panel__expand"
          aria-label={expanded ? '退出全屏查看' : '全屏查看'}
          aria-pressed={expanded}
          title={expanded ? '退出全屏查看（Esc）' : '全屏查看'}
          onClick={handleExpandToggle}
        >
          {expanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        </button>
      </header>

      <div className="function-relations-panel__body">
        <div className="function-relations-panel__metadata">
          <span><FolderOutlined />项目：{data.project_name}</span>
          <span><DatabaseOutlined />仓库：{data.query.repository}</span>
          <span><BranchesOutlined />关键词：{data.query.keyword}</span>
          <span><SafetyCertificateOutlined />Schema {data.schema_version}</span>
          {generatedAt ? <span><ClockCircleOutlined />{generatedAt}</span> : null}
        </div>

        <div className="function-relations-panel__stats">
          <div><strong>{data.summary.total_relations}</strong><span>关系总数</span></div>
          <div><strong>{data.summary.declared}</strong><span>声明关系</span></div>
          <div><strong>{data.summary.inferred}</strong><span>推理关系</span></div>
          <div><strong>{relationTypes.length}</strong><span>关系类型</span></div>
        </div>

        <div className="function-relations-panel__filters" aria-label="按关系类型筛选">
          <button
            type="button"
            aria-pressed={selectedType === null}
            onClick={() => setSelectedType(null)}
          >
            全部 {data.summary.total_relations}
          </button>
          {relationTypes.map(([relationType, count]) => (
            <button
              key={relationType}
              type="button"
              aria-pressed={selectedType === relationType}
              onClick={() => setSelectedType(relationType)}
            >
              {relationType} {count}
            </button>
          ))}
        </div>

        {visibleRelations.length > 0 ? (
          <div className="function-relations-panel__relations">
            {visibleRelations.map((relation, index) => (
              <RelationCard
                key={`${relation.relationType}:${String(relation.relationIRI ?? index)}`}
                relation={relation}
                index={data.relations.indexOf(relation)}
              />
            ))}
          </div>
        ) : (
          <div className="function-relations-panel__empty">
            <CheckCircleOutlined />
            <strong>没有符合当前筛选条件的关系</strong>
          </div>
        )}
      </div>
    </section>
  )
}

function FunctionRelationsPanel({
  payload,
  context,
}: ToolPanelProps<FunctionRelationsPanelPayload>) {
  if (payload.state === 'loading') {
    return (
      <PanelState
        kind="loading"
        title="正在读取场景 10 功能关系"
        message="已识别 query-project-function-relations，正在等待工具结果。"
      />
    )
  }
  if (payload.state === 'parse-error') {
    return (
      <PanelState
        kind="error"
        title="功能关系结果无法解析"
        message={payload.message}
      />
    )
  }
  if (payload.state === 'remote-error') {
    return (
      <PanelState
        kind="error"
        title="功能关系结果查询失败"
        message={`${payload.envelope.error.code}：${payload.envelope.error.message}`}
      />
    )
  }
  return (
    <FunctionRelationsBrowser
      payload={payload}
      assistantName={context.assistantName}
    />
  )
}

export default memo(FunctionRelationsPanel)
