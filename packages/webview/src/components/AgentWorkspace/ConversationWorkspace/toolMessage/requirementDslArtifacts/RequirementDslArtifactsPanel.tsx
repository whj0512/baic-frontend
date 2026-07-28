import {
  ApartmentOutlined,
  CodeOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  lazy,
  memo,
  Suspense,
  useDeferredValue,
  useMemo,
  useState,
} from 'react'
import type { ToolPanelProps } from '../types'
import type {
  RequirementDslArtifactsPanelPayload,
  RequirementDslArtifactType,
} from './types'

const DslEditor = lazy(() => import('../../../../dsl-editor'))

const TYPE_LABELS: Record<RequirementDslArtifactType, string> = {
  environment: 'Environment',
  'external-scenario': 'ExternalScenario',
  statechart: 'Statechart',
}

const TYPE_SECTION_KEYS: Record<RequirementDslArtifactType, string> = {
  environment: 'environment',
  'external-scenario': 'interaction',
  statechart: 'internalConstraints',
}

type TypeFilter = 'all' | RequirementDslArtifactType

interface RequirementListItem {
  id: string
  name: string
  description: string
  artifactIds: string[]
  searchText: string
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
      className={`requirement-dsl-panel requirement-dsl-panel--${kind}`}
      aria-live="polite"
    >
      <div className="requirement-dsl-panel__state">
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

function RequirementDslArtifactsPanel({
  payload,
  context,
}: ToolPanelProps<RequirementDslArtifactsPanelPayload>) {
  if (payload.state === 'loading') {
    return (
      <PanelState
        kind="loading"
        title="正在查询 DSL 建模制品"
        message="已识别 query-requirement-dsl-artifacts，正在等待工具结果。"
      />
    )
  }

  if (payload.state === 'parse-error') {
    return (
      <PanelState
        kind="error"
        title="DSL 建模制品结果无法解析"
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
    <RequirementDslArtifactsBrowser
      payload={payload}
      assistantName={context.assistantName}
    />
  )
}

function RequirementDslArtifactsBrowser({
  payload,
  assistantName,
}: {
  payload: Extract<
    RequirementDslArtifactsPanelPayload,
    { state: 'success' }
  >
  assistantName: string
}) {
  const { envelope } = payload
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase())
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [selectedRequirementId, setSelectedRequirementId] = useState<
    string | null
  >(null)
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  )

  const requirements = useMemo<RequirementListItem[]>(
    () => Object.entries(envelope.requirements).map(
      ([id, requirement]) => ({
        id,
        name: requirement.name,
        description: requirement.description,
        artifactIds: requirement.artifacts,
        searchText: [
          id,
          requirement.name,
          requirement.description,
          ...requirement.artifacts,
        ].join('\n').toLocaleLowerCase(),
      }),
    ),
    [envelope.requirements],
  )

  const filteredRequirements = useMemo(
    () => requirements.filter((requirement) => {
      if (
        deferredQuery
        && !requirement.searchText.includes(deferredQuery)
      ) {
        return false
      }

      return typeFilter === 'all'
        || requirement.artifactIds.some(
          (artifactId) =>
            envelope.artifacts[artifactId]?.type === typeFilter,
        )
    }),
    [
      deferredQuery,
      envelope.artifacts,
      requirements,
      typeFilter,
    ],
  )

  const effectiveRequirement =
    filteredRequirements.find(
      (requirement) => requirement.id === selectedRequirementId,
    )
    ?? filteredRequirements.find((requirement) =>
      requirement.artifactIds.length > 0)
    ?? filteredRequirements[0]
    ?? null

  const visibleArtifactIds = effectiveRequirement?.artifactIds.filter(
    (artifactId) =>
      typeFilter === 'all'
      || envelope.artifacts[artifactId]?.type === typeFilter,
  ) ?? []
  const effectiveArtifactId =
    selectedArtifactId && visibleArtifactIds.includes(selectedArtifactId)
      ? selectedArtifactId
      : visibleArtifactIds[0] ?? null
  const effectiveArtifact = effectiveArtifactId
    ? envelope.artifacts[effectiveArtifactId]
    : null

  const summaryItems = [
    ['需求', envelope.summary.requirement_count],
    ['DSL 制品', envelope.summary.artifact_count],
    ['映射关系', envelope.summary.relationship_count],
    ['Environment', envelope.summary.environment_count],
    ['ExternalScenario', envelope.summary.external_scenario_count],
    ['Statechart', envelope.summary.statechart_count],
    ['无制品需求', envelope.summary.empty_artifact_requirement_count],
    ['元数据缺失', envelope.summary.metadata_missing_count],
  ] as const

  const selectRequirement = (requirement: RequirementListItem) => {
    setSelectedRequirementId(requirement.id)
    setSelectedArtifactId(
      requirement.artifactIds.find(
        (artifactId) =>
          typeFilter === 'all'
          || envelope.artifacts[artifactId]?.type === typeFilter,
      ) ?? null,
    )
  }

  return (
    <section className="requirement-dsl-panel">
      <header className="requirement-dsl-panel__header">
        <span className="requirement-dsl-panel__header-icon">
          <ApartmentOutlined />
        </span>
        <div>
          <small>query-requirement-dsl-artifacts · {assistantName}</small>
          <h3>需求 ID ↔ DSL 建模制品</h3>
        </div>
        <span className="requirement-dsl-panel__protocol">
          v{envelope.protocol_version}
        </span>
      </header>

      <div className="requirement-dsl-panel__summary">
        {summaryItems.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="requirement-dsl-panel__toolbar">
        <label>
          <SearchOutlined aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="搜索需求 ID、名称、描述或制品路径"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div
          className="requirement-dsl-panel__filters"
          aria-label="DSL 类型筛选"
        >
          {([
            ['all', '全部'],
            ['environment', 'Environment'],
            ['external-scenario', 'ExternalScenario'],
            ['statechart', 'Statechart'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                typeFilter === value
                  ? 'requirement-dsl-panel__filter--active'
                  : undefined
              }
              aria-pressed={typeFilter === value}
              onClick={() => setTypeFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="requirement-dsl-panel__workspace">
        <aside className="requirement-dsl-panel__requirements">
          <div className="requirement-dsl-panel__section-heading">
            <strong>需求列表</strong>
            <span>{filteredRequirements.length} 项</span>
          </div>
          <div className="requirement-dsl-panel__requirement-list">
            {filteredRequirements.length > 0 ? (
              filteredRequirements.map((requirement) => (
                <button
                  key={requirement.id}
                  type="button"
                  className={
                    effectiveRequirement?.id === requirement.id
                      ? 'requirement-dsl-panel__requirement--active'
                      : undefined
                  }
                  onClick={() => selectRequirement(requirement)}
                >
                  <span>
                    <code>{requirement.id}</code>
                    <em>{requirement.artifactIds.length} 个制品</em>
                  </span>
                  <strong>{requirement.name || '未提供需求名称'}</strong>
                </button>
              ))
            ) : (
              <div className="requirement-dsl-panel__empty">
                <FileSearchOutlined />
                <span>没有符合条件的需求</span>
              </div>
            )}
          </div>
        </aside>

        <div className="requirement-dsl-panel__detail">
          {effectiveRequirement ? (
            <>
              <div className="requirement-dsl-panel__requirement-detail">
                <div>
                  <span>当前需求</span>
                  <code>{effectiveRequirement.id}</code>
                </div>
                <h4>
                  {effectiveRequirement.name || '未提供需求名称'}
                </h4>
                <p>
                  {effectiveRequirement.description || '未提供需求描述'}
                </p>
              </div>

              <div className="requirement-dsl-panel__artifact-layout">
                <nav aria-label="关联 DSL 制品">
                  <div className="requirement-dsl-panel__section-heading">
                    <strong>关联制品</strong>
                    <span>{visibleArtifactIds.length} 项</span>
                  </div>
                  <div className="requirement-dsl-panel__artifact-list">
                    {visibleArtifactIds.length > 0 ? (
                      visibleArtifactIds.map((artifactId) => {
                        const artifact = envelope.artifacts[artifactId]
                        return (
                          <button
                            key={artifactId}
                            type="button"
                            className={
                              effectiveArtifactId === artifactId
                                ? 'requirement-dsl-panel__artifact--active'
                                : undefined
                            }
                            onClick={() => setSelectedArtifactId(artifactId)}
                          >
                            <CodeOutlined />
                            <span>
                              <strong>{artifactId}</strong>
                              <em>{TYPE_LABELS[artifact.type]}</em>
                            </span>
                          </button>
                        )
                      })
                    ) : (
                      <div className="requirement-dsl-panel__empty">
                        <CodeOutlined />
                        <span>该需求没有符合条件的 DSL 制品</span>
                      </div>
                    )}
                  </div>
                </nav>

                <div className="requirement-dsl-panel__viewer">
                  {effectiveArtifact && effectiveArtifactId ? (
                    <>
                      <header>
                        <span>
                          <strong>{effectiveArtifactId}</strong>
                          <em>{TYPE_LABELS[effectiveArtifact.type]}</em>
                        </span>
                      </header>
                      <div className="requirement-dsl-panel__editor">
                        <Suspense
                          fallback={(
                            <div className="requirement-dsl-panel__editor-loading">
                              <LoadingOutlined spin />
                              <span>正在加载 DSL 阅读器</span>
                            </div>
                          )}
                        >
                          <DslEditor
                            key={effectiveArtifactId}
                            sectionKey={
                              TYPE_SECTION_KEYS[effectiveArtifact.type]
                            }
                            value={effectiveArtifact.content}
                            readOnly
                          />
                        </Suspense>
                      </div>
                    </>
                  ) : (
                    <div className="requirement-dsl-panel__empty requirement-dsl-panel__empty--viewer">
                      <CodeOutlined />
                      <span>选择一份 DSL 制品以查看正文</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="requirement-dsl-panel__empty requirement-dsl-panel__empty--viewer">
              <FileSearchOutlined />
              <span>没有可展示的需求</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default memo(RequirementDslArtifactsPanel)
