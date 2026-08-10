import {
  ApartmentOutlined,
  CodeOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  type ChangeEvent,
  useCallback,
  lazy,
  memo,
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  DimensionArtifactDraft,
  SectionKey,
} from '../../../../DimensionEditor'
import DimensionList from '../../../../DimensionList'
import {
  DEFAULT_REQUIREMENT_SECTIONS,
  type RequirementDimensionSection,
} from '../../../../DimensionList/requirementSections'
import type { ToolPanelProps } from '../types'
import type {
  RequirementDslArtifactsPanelPayload,
  RequirementDslArtifactType,
} from './types'
import RequirementDslModelsBrowser from './RequirementDslModelsBrowser'

const DslEditor = lazy(() => import('../../../../dsl-editor'))
const DimensionEditor = lazy(() => import('../../../../DimensionEditor'))

const TYPE_LABELS: Record<RequirementDslArtifactType, string> = {
  environment: 'Environment',
  'external-scenario': 'ExternalScenario',
  statechart: 'Statechart',
}

const TYPE_SECTION_KEYS: Record<RequirementDslArtifactType, SectionKey> = {
  environment: 'environment',
  'external-scenario': 'interaction',
  statechart: 'internalConstraints',
}

const SECTION_ARTIFACT_TYPES: Partial<
  Record<SectionKey, RequirementDslArtifactType>
> = {
  environment: 'environment',
  interaction: 'external-scenario',
  internalConstraints: 'statechart',
}

type TypeFilter = 'all' | RequirementDslArtifactType

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface RequirementListItem {
  id: string
  name: string
  description: string
  artifactIds: string[]
  searchText: string
}

interface RequirementDetailsDraft {
  name: string
  description: string
}

interface ActiveArtifactEditor {
  requirementId: string
  artifactId: string
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

  if (payload.envelope.protocol_version === '2.0') {
    return (
      <RequirementDslModelsBrowser
        envelope={payload.envelope}
        assistantName={context.assistantName}
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
  const [expanded, setExpanded] = useState(false)
  const [activeArtifactEditor, setActiveArtifactEditor] =
    useState<ActiveArtifactEditor | null>(null)
  const [requirementDrafts, setRequirementDrafts] = useState(
    () => new Map<string, RequirementDetailsDraft>(),
  )
  const panelRef = useRef<HTMLElement | null>(null)
  const expandButtonRef = useRef<HTMLButtonElement | null>(null)
  const artifactDraftsRef = useRef(
    new Map<string, DimensionArtifactDraft>(),
  )

  useEffect(() => {
    if (!expanded) {
      return
    }

    const scrollContainer = panelRef.current?.closest<HTMLElement>(
      '.conversation-canvas',
    )
    const previousBodyOverflow = document.body.style.overflow
    const previousCanvasOverflow = scrollContainer?.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveArtifactEditor(null)
        setExpanded(false)
        return
      }
      if (event.key !== 'Tab') {
        return
      }

      const panel = panelRef.current
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
      } else if (
        !event.shiftKey
        && document.activeElement === last
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    if (scrollContainer) {
      scrollContainer.style.overflow = 'hidden'
    }
    window.addEventListener('keydown', closeOnEscape)
    const focusFrame = requestAnimationFrame(() => {
      expandButtonRef.current?.focus()
    })

    return () => {
      cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousBodyOverflow
      if (scrollContainer) {
        scrollContainer.style.overflow = previousCanvasOverflow ?? ''
      }
      window.removeEventListener('keydown', closeOnEscape)
      requestAnimationFrame(() => {
        expandButtonRef.current?.focus()
      })
    }
  }, [expanded])

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
  const effectiveRequirementDraft = effectiveRequirement
    ? requirementDrafts.get(effectiveRequirement.id) ?? {
        name: effectiveRequirement.name,
        description: effectiveRequirement.description,
      }
    : null

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
  const activeEditorArtifactId =
    expanded
    && activeArtifactEditor
    && activeArtifactEditor.requirementId === effectiveRequirement?.id
    && effectiveRequirement.artifactIds.includes(
      activeArtifactEditor.artifactId,
    )
      ? activeArtifactEditor.artifactId
      : null
  const activeEditorArtifact = activeEditorArtifactId
    ? envelope.artifacts[activeEditorArtifactId]
    : null
  const activeEditorArtifactDraft =
    activeEditorArtifactId && activeEditorArtifact
      ? artifactDraftsRef.current.get(activeEditorArtifactId) ?? {
          dslContent: activeEditorArtifact.content,
          graphData: {},
        }
      : null
  const environmentArtifactId = effectiveRequirement?.artifactIds.find(
    (artifactId) =>
      envelope.artifacts[artifactId]?.type === 'environment',
  ) ?? null
  const environmentArtifact = environmentArtifactId
    ? envelope.artifacts[environmentArtifactId]
    : null
  const environmentDsl =
    environmentArtifactId && environmentArtifact
      ? artifactDraftsRef.current.get(environmentArtifactId)?.dslContent
        ?? environmentArtifact.content
      : ''
  const visualDisabledReason =
    activeEditorArtifact?.type === 'external-scenario' && !environmentArtifact
      ? '缺少 Environment 制品，无法转换 ExternalScenario'
      : undefined

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
    setActiveArtifactEditor(null)
    setSelectedRequirementId(requirement.id)
    setSelectedArtifactId(
      requirement.artifactIds.find(
        (artifactId) =>
          typeFilter === 'all'
          || envelope.artifacts[artifactId]?.type === typeFilter,
      ) ?? null,
    )
  }

  const handleArtifactDraftChange = useCallback((
    draft: DimensionArtifactDraft,
  ) => {
    if (!activeEditorArtifactId) return
    artifactDraftsRef.current.set(activeEditorArtifactId, draft)
  }, [activeEditorArtifactId])

  const handleRequirementDraftChange = useCallback((
    field: keyof RequirementDetailsDraft,
    value: string,
  ) => {
    if (!effectiveRequirement) return

    setRequirementDrafts((currentDrafts) => {
      const nextDrafts = new Map(currentDrafts)
      const currentDraft = nextDrafts.get(effectiveRequirement.id) ?? {
        name: effectiveRequirement.name,
        description: effectiveRequirement.description,
      }
      nextDrafts.set(effectiveRequirement.id, {
        ...currentDraft,
        [field]: value,
      })
      return nextDrafts
    })
  }, [effectiveRequirement])

  const getSectionArtifactId = useCallback((
    section: RequirementDimensionSection,
  ) => {
    if (!effectiveRequirement) return null
    const artifactType = SECTION_ARTIFACT_TYPES[section.key]
    if (!artifactType) return null

    const currentArtifactId =
      selectedArtifactId
      && effectiveRequirement.artifactIds.includes(selectedArtifactId)
        ? selectedArtifactId
        : effectiveArtifactId
    if (
      currentArtifactId
      && envelope.artifacts[currentArtifactId]?.type === artifactType
    ) {
      return currentArtifactId
    }

    return effectiveRequirement.artifactIds.find(
      (artifactId) =>
        envelope.artifacts[artifactId]?.type === artifactType,
    ) ?? null
  }, [
    effectiveArtifactId,
    effectiveRequirement,
    envelope.artifacts,
    selectedArtifactId,
  ])

  const handleDimensionClick = useCallback((
    section: RequirementDimensionSection,
  ) => {
    if (!effectiveRequirement) return
    const artifactType = SECTION_ARTIFACT_TYPES[section.key]
    const artifactId = getSectionArtifactId(section)
    if (!artifactType || !artifactId) return

    setSelectedRequirementId(effectiveRequirement.id)
    setTypeFilter(artifactType)
    setSelectedArtifactId(artifactId)
    setActiveArtifactEditor({
      requirementId: effectiveRequirement.id,
      artifactId,
    })
  }, [effectiveRequirement, getSectionArtifactId])

  const handleExpandToggle = useCallback(() => {
    setActiveArtifactEditor(null)
    setExpanded((current) => !current)
  }, [])

  const handleQueryChange = useCallback((
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setActiveArtifactEditor(null)
    setQuery(event.target.value)
  }, [])

  const handleTypeFilterChange = useCallback((value: TypeFilter) => {
    setActiveArtifactEditor(null)
    setTypeFilter(value)
  }, [])

  const selectArtifact = useCallback((artifactId: string) => {
    setSelectedArtifactId(artifactId)
    if (expanded && activeArtifactEditor && effectiveRequirement) {
      setActiveArtifactEditor({
        requirementId: effectiveRequirement.id,
        artifactId,
      })
    }
  }, [activeArtifactEditor, effectiveRequirement, expanded])

  const handleReturnToOverview = useCallback(() => {
    setActiveArtifactEditor(null)
  }, [])

  const panel = (
    <section
      ref={panelRef}
      className={`requirement-dsl-panel${
        expanded ? ' requirement-dsl-panel--expanded' : ''
      }`}
      role={expanded ? 'dialog' : undefined}
      aria-label={expanded ? '需求 ID 与 DSL 建模制品放大视图' : undefined}
      aria-modal={expanded ? true : undefined}
    >
      <header className="requirement-dsl-panel__header">
        <span className="requirement-dsl-panel__header-icon">
          <ApartmentOutlined />
        </span>
        <div>
          <small>query-requirement-dsl-artifacts · {assistantName}</small>
          <h3>需求 ID ↔ DSL 建模制品</h3>
        </div>
        <div className="requirement-dsl-panel__header-actions">
          <span className="requirement-dsl-panel__protocol">
            v{envelope.protocol_version}
          </span>
          <button
            ref={expandButtonRef}
            type="button"
            className="requirement-dsl-panel__expand"
            aria-label={expanded ? '退出放大查看' : '放大查看'}
            aria-pressed={expanded}
            title={expanded ? '退出放大查看（Esc）' : '放大查看'}
            onClick={handleExpandToggle}
          >
            {expanded
              ? <FullscreenExitOutlined />
              : <FullscreenOutlined />}
          </button>
        </div>
      </header>

      {!expanded && (
        <div className="requirement-dsl-panel__summary">
          {summaryItems.map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="requirement-dsl-panel__toolbar">
        <label>
          <SearchOutlined aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="搜索需求 ID、名称、描述或制品路径"
            onChange={handleQueryChange}
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
              onClick={() => handleTypeFilterChange(value)}
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
                  <strong>
                    {(requirementDrafts.get(requirement.id)?.name
                      ?? requirement.name)
                      || '未提供需求名称'}
                  </strong>
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
              {!expanded && (
                <div className="requirement-dsl-panel__requirement-detail">
                  <div>
                    <span>当前需求</span>
                    <code>{effectiveRequirement.id}</code>
                  </div>
                  <h4>
                    {effectiveRequirementDraft?.name || '未提供需求名称'}
                  </h4>
                  <p>
                    {effectiveRequirementDraft?.description || '未提供需求描述'}
                  </p>
                </div>
              )}

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
                            onClick={() => selectArtifact(artifactId)}
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

                <div
                  className={[
                    'requirement-dsl-panel__viewer',
                    expanded
                      ? activeEditorArtifact && activeEditorArtifactDraft
                        ? 'requirement-dsl-panel__viewer--editor'
                        : 'requirement-dsl-panel__viewer--overview'
                      : '',
                  ].filter(Boolean).join(' ')}
                >
                  {expanded ? (
                    activeEditorArtifact
                    && activeEditorArtifactId
                    && activeEditorArtifactDraft ? (
                        <div className="requirement-dsl-panel__editor">
                          <Suspense
                            fallback={(
                              <div className="requirement-dsl-panel__editor-loading">
                                <LoadingOutlined spin />
                                <span>正在加载建模编辑器</span>
                              </div>
                            )}
                          >
                            <DimensionEditor
                              key={`artifact:${activeEditorArtifactId}`}
                              mode="artifact"
                              sectionKey={
                                TYPE_SECTION_KEYS[activeEditorArtifact.type]
                              }
                              initialDslContent={
                                activeEditorArtifactDraft.dslContent
                              }
                              initialGraphData={
                                activeEditorArtifactDraft.graphData
                              }
                              ibdDsl={
                                activeEditorArtifact.type === 'external-scenario'
                                  ? environmentDsl
                                  : undefined
                              }
                              visualDisabledReason={visualDisabledReason}
                              onBack={handleReturnToOverview}
                              onDraftChange={handleArtifactDraftChange}
                            />
                          </Suspense>
                        </div>
                      ) : (
                        <section
                          className="requirement-dsl-panel__overview"
                          aria-label="当前需求概览"
                        >
                          <div className="requirement-dsl-panel__overview-heading">
                            <div>
                              <span>当前需求</span>
                              <code>{effectiveRequirement.id}</code>
                            </div>
                            <h4>需求概览</h4>
                          </div>

                          <section
                            className="requirement-dsl-panel__requirement-editor"
                            aria-label="编辑当前需求信息"
                          >
                            <label>
                              <span>需求名称</span>
                              <input
                                type="text"
                                value={effectiveRequirementDraft?.name ?? ''}
                                placeholder="请输入需求名称"
                                onChange={(event) => {
                                  handleRequirementDraftChange(
                                    'name',
                                    event.target.value,
                                  )
                                }}
                              />
                            </label>
                            <label>
                              <span>需求描述</span>
                              <textarea
                                rows={3}
                                value={
                                  effectiveRequirementDraft?.description ?? ''
                                }
                                placeholder="请输入需求描述"
                                onChange={(event) => {
                                  handleRequirementDraftChange(
                                    'description',
                                    event.target.value,
                                  )
                                }}
                              />
                            </label>
                            <small>临时编辑，不会保存到需求</small>
                          </section>

                          <section className="requirement-dsl-panel__dimensions">
                            <div className="requirement-dsl-panel__dimensions-heading">
                              <strong>五维模型</strong>
                              <span>选择已定义维度进入编辑器</span>
                            </div>
                            <DimensionList
                              sections={DEFAULT_REQUIREMENT_SECTIONS}
                              isSectionDefined={(section) =>
                                Boolean(getSectionArtifactId(section))}
                              isSectionDisabled={(section) =>
                                !getSectionArtifactId(section)}
                              onSectionClick={handleDimensionClick}
                            />
                          </section>
                        </section>
                      )
                  ) : effectiveArtifact && effectiveArtifactId ? (
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

  return panel
}

export default memo(RequirementDslArtifactsPanel)
