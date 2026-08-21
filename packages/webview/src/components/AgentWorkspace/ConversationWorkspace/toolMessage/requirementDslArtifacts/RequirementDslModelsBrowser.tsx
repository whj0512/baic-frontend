import {
  ApartmentOutlined,
  CodeOutlined,
  FileSearchOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  LoadingOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { message, Modal } from 'antd'
import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { DimensionArtifactDraft } from '../../../../DimensionEditor'
import { DIMENSION_CODE_TO_SECTION } from '../../../../DimensionEditor/dimensionEditorConfig'
import DimensionList, {
  type DimensionListModelItem,
} from '../../../../DimensionList'
import {
  DEFAULT_REQUIREMENT_SECTIONS,
  type RequirementDimensionSection,
} from '../../../../DimensionList/requirementSections'
import RequirementModelMetadataModal, {
  type RequirementModelMetadataValue,
} from '../../../../RequirementModelMetadataModal'
import type { RequirementDimensionCode } from '../../../../../models/RequirementModel'
import type { LocalRequirementModel } from './modelWorkspace'
import type {
  RequirementDslModelsEnvelope,
} from './types'
import { useLocalModelWorkspace } from './useLocalModelWorkspace'
import './RequirementDslArtifactsPanel.css'

const DslEditor = lazy(() => import('../../../../dsl-editor'))
const DimensionEditor = lazy(() => import('../../../../DimensionEditor'))

type SuccessEnvelope = Extract<
  RequirementDslModelsEnvelope,
  { status: 'success' }
>
type DimensionFilter = 'all' | RequirementDimensionCode
type MetadataDialog =
  | { mode: 'create'; dimensionCode: RequirementDimensionCode }
  | { mode: 'edit'; modelId: string }
  | null

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const EMPTY_MODEL_NAMES: Record<RequirementDimensionCode, string> = {
  IBD: '新建环境组成模型',
  ESD: '新建外部交互模型',
  BDD: '新建内部组成模型',
  ISD: '新建内部交互模型',
  SC: '新建状态机模型',
  UI: '新建会话图模型',
}

function toListModel(model: LocalRequirementModel): DimensionListModelItem {
  return {
    identity: model.id,
    dimensionCode: model.dimensionCode,
    name: model.name,
    modelType: model.modelType,
    modelKey: model.modelKey,
    isPrimary: model.isPrimary,
    pending: model.dirty,
  }
}

function createMetadataValue(
  dimensionCode: RequirementDimensionCode,
  models: LocalRequirementModel[],
): RequirementModelMetadataValue {
  const sameDimension = models.filter(
    (model) => model.dimensionCode === dimensionCode,
  )
  const context = models.find(
    (model) => model.dimensionCode === 'IBD' && model.isPrimary,
  ) ?? models.find((model) => model.dimensionCode === 'IBD')
  return {
    dimensionCode,
    name: EMPTY_MODEL_NAMES[dimensionCode],
    modelType: dimensionCode === 'UI' ? 'DialogMap' : null,
    modelKey: `local/${dimensionCode.toLowerCase()}-${sameDimension.length + 1}`,
    isPrimary: sameDimension.length === 0,
    contextModelGroupId:
      dimensionCode === 'ESD' || dimensionCode === 'ISD'
        ? context?.id ?? null
        : null,
  }
}

function modelMetadataValue(
  model: LocalRequirementModel,
  models: LocalRequirementModel[],
): RequirementModelMetadataValue {
  const context = models.find((candidate) => (
    candidate.id === model.contextModelId
    || candidate.sourceModelId === model.contextModelId
  ))
  return {
    identity: model.id,
    dimensionCode: model.dimensionCode,
    name: model.name,
    modelType: model.modelType,
    modelKey: model.modelKey,
    isPrimary: model.isPrimary,
    contextModelGroupId: context?.id ?? model.contextModelId,
  }
}

function resolveContextDsl(
  model: LocalRequirementModel,
  localModels: LocalRequirementModel[],
  envelope: SuccessEnvelope,
) {
  if (model.dimensionCode !== 'ESD' && model.dimensionCode !== 'ISD') {
    return undefined
  }
  const context = localModels.find(
    (candidate) => candidate.id === model.contextModelId
      || candidate.sourceModelId === model.contextModelId,
  ) ?? localModels.find(
    (candidate) => candidate.dimensionCode === 'IBD' && candidate.isPrimary,
  )
  if (context) return context.dslContent
  return model.contextModelId
    ? envelope.models[model.contextModelId]?.dsl_text
    : undefined
}

export default function RequirementDslModelsBrowser({
  envelope,
  assistantName,
}: {
  envelope: SuccessEnvelope
  assistantName: string
}) {
  const workspace = useLocalModelWorkspace(envelope)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase())
  const [dimensionFilter, setDimensionFilter] = useState<DimensionFilter>('all')
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [metadataDialog, setMetadataDialog] = useState<MetadataDialog>(null)
  const [expanded, setExpanded] = useState(false)
  const panelRef = useRef<HTMLElement | null>(null)
  const expandButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!expanded) return
    const canvas = panelRef.current?.closest<HTMLElement>('.conversation-canvas')
    const previousBodyOverflow = document.body.style.overflow
    const previousCanvasOverflow = canvas?.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMetadataDialog(null)
        setActiveModelId(null)
        setExpanded(false)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = panelRef.current
        ? [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
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
    if (canvas) canvas.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousBodyOverflow
      if (canvas) canvas.style.overflow = previousCanvasOverflow ?? ''
      window.removeEventListener('keydown', onKeyDown)
      requestAnimationFrame(() => expandButtonRef.current?.focus())
    }
  }, [expanded])

  const requirementIds = useMemo(() => Object.keys(workspace.state.requirements), [
    workspace.state.requirements,
  ])
  const filteredRequirementIds = useMemo(() => requirementIds.filter((requirementId) => {
    const requirement = workspace.state.requirements[requirementId]
    const models = workspace.state.modelsByRequirement[requirementId] ?? []
    if (dimensionFilter !== 'all' && !models.some(
      (model) => model.dimensionCode === dimensionFilter,
    )) return false
    if (!deferredQuery) return true
    return [
      requirementId,
      requirement.name,
      requirement.description,
      requirement.nlText,
      requirement.reqType,
      ...models.flatMap((model) => [model.name, model.modelKey, model.sourcePath ?? '']),
    ].join('\n').toLocaleLowerCase().includes(deferredQuery)
  }), [
    deferredQuery,
    dimensionFilter,
    requirementIds,
    workspace.state.modelsByRequirement,
    workspace.state.requirements,
  ])
  const effectiveRequirementId = filteredRequirementIds.includes(selectedRequirementId ?? '')
    ? selectedRequirementId
    : filteredRequirementIds.find((requirementId) => (
      workspace.state.modelsByRequirement[requirementId]?.length > 0
    )) ?? filteredRequirementIds[0] ?? null
  const requirement = effectiveRequirementId
    ? workspace.state.requirements[effectiveRequirementId]
    : null
  const allModels = effectiveRequirementId
    ? workspace.state.modelsByRequirement[effectiveRequirementId] ?? []
    : []
  const visibleModels = dimensionFilter === 'all'
    ? allModels
    : allModels.filter((model) => model.dimensionCode === dimensionFilter)
  const effectiveModel = visibleModels.find((model) => model.id === selectedModelId)
    ?? visibleModels[0]
    ?? null
  const activeModel = expanded
    ? allModels.find((model) => model.id === activeModelId) ?? null
    : null
  const ibdModels = allModels.filter((model) => model.dimensionCode === 'IBD')
  const metadataModel = metadataDialog?.mode === 'edit'
    ? allModels.find((model) => model.id === metadataDialog.modelId) ?? null
    : null
  const metadataInitialValue = metadataDialog?.mode === 'create'
    ? createMetadataValue(metadataDialog.dimensionCode, allModels)
    : metadataModel
      ? modelMetadataValue(metadataModel, allModels)
      : createMetadataValue('IBD', allModels)
  const sectionList = DEFAULT_REQUIREMENT_SECTIONS
  const contextDsl = activeModel
    ? resolveContextDsl(activeModel, allModels, envelope)
    : undefined

  const summaryItems = [
    ['需求', envelope.summary.requirement_count],
    ['模型', envelope.summary.model_count],
    ['映射', envelope.summary.relationship_count],
    ...sectionList.map((section) => [
      section.dimensionCode,
      envelope.summary.dimension_counts[
        section.dimensionCode as RequirementDimensionCode
      ],
    ] as const),
  ] as const

  const openModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId)
    setActiveModelId(modelId)
  }, [])

  const beginAdd = useCallback((section: RequirementDimensionSection) => {
    const dimensionCode = section.dimensionCode as RequirementDimensionCode
    if ((dimensionCode === 'ESD' || dimensionCode === 'ISD') && ibdModels.length === 0) {
      void message.warning('新增 ESD/ISD 前，请先在当前需求中新增 IBD 上下文模型')
      return
    }
    setMetadataDialog({ mode: 'create', dimensionCode })
  }, [ibdModels.length])

  const submitMetadata = useCallback((value: RequirementModelMetadataValue) => {
    if (!effectiveRequirementId) return
    if (metadataDialog?.mode === 'create') {
      const modelId = workspace.addModel(effectiveRequirementId, value)
      setSelectedModelId(modelId)
      setActiveModelId(modelId)
    } else {
      workspace.updateModelMetadata(effectiveRequirementId, value)
    }
    setMetadataDialog(null)
  }, [effectiveRequirementId, metadataDialog?.mode, workspace])

  const confirmDelete = useCallback((modelId: string) => {
    if (!effectiveRequirementId) return
    const model = allModels.find((candidate) => candidate.id === modelId)
    if (!model) return
    Modal.confirm({
      title: `删除本地模型“${model.name}”？`,
      content: '只会删除当前工具卡中的内存副本，不会修改 BAIC 数据或源 DSL。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        workspace.deleteModel(effectiveRequirementId, modelId)
        if (selectedModelId === modelId) setSelectedModelId(null)
        if (activeModelId === modelId) setActiveModelId(null)
      },
    })
  }, [
    activeModelId,
    allModels,
    effectiveRequirementId,
    selectedModelId,
    workspace,
  ])

  const handleDraftChange = useCallback((draft: DimensionArtifactDraft) => {
    if (!effectiveRequirementId || !activeModelId) return
    workspace.updateModelDraft(effectiveRequirementId, activeModelId, draft)
  }, [activeModelId, effectiveRequirementId, workspace])

  return (
    <section
      ref={panelRef}
      className={`requirement-dsl-panel requirement-dsl-v2${expanded ? ' requirement-dsl-panel--expanded' : ''}`}
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded || undefined}
      aria-label={expanded ? '需求六维模型本地工作区' : undefined}
    >
      <header className="requirement-dsl-panel__header">
        <span className="requirement-dsl-panel__header-icon"><ApartmentOutlined /></span>
        <div>
          <small>query-requirement-dsl-artifacts · {assistantName}</small>
          <h3>需求六维模型工作区</h3>
        </div>
        <div className="requirement-dsl-panel__header-actions">
          <span className="requirement-dsl-v2__sandbox">本地沙盒 · 不写回</span>
          <span className="requirement-dsl-panel__protocol">v2.0</span>
          <button
            ref={expandButtonRef}
            type="button"
            className="requirement-dsl-panel__expand"
            aria-label={expanded ? '退出放大查看' : '放大查看'}
            aria-pressed={expanded}
            title={expanded ? '退出放大查看（Esc）' : '放大查看'}
            onClick={() => {
              setMetadataDialog(null)
              setActiveModelId(null)
              setExpanded((current) => !current)
            }}
          >
            {expanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </button>
        </div>
      </header>

      {!expanded && (
        <div className="requirement-dsl-panel__summary requirement-dsl-v2__summary">
          {summaryItems.map(([label, value]) => (
            <div key={label}><strong>{value}</strong><span>{label}</span></div>
          ))}
        </div>
      )}

      <div className="requirement-dsl-panel__toolbar">
        <label>
          <SearchOutlined aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="搜索需求、模型名称、类型或业务键"
            onChange={(event) => {
              setActiveModelId(null)
              setQuery(event.target.value)
            }}
          />
        </label>
        <div className="requirement-dsl-panel__filters" aria-label="模型维度筛选">
          {(['all', 'IBD', 'ESD', 'BDD', 'ISD', 'SC', 'UI'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={dimensionFilter === value ? 'requirement-dsl-panel__filter--active' : undefined}
              aria-pressed={dimensionFilter === value}
              onClick={() => {
                setDimensionFilter(value)
                setActiveModelId(null)
                setSelectedModelId(null)
              }}
            >
              {value === 'all' ? '全部' : value}
            </button>
          ))}
        </div>
      </div>

      <div className="requirement-dsl-panel__workspace">
        <aside className="requirement-dsl-panel__requirements">
          <div className="requirement-dsl-panel__section-heading">
            <strong>需求列表</strong><span>{filteredRequirementIds.length} 项</span>
          </div>
          <div className="requirement-dsl-panel__requirement-list">
            {filteredRequirementIds.map((requirementId) => {
              const item = workspace.state.requirements[requirementId]
              const count = workspace.state.modelsByRequirement[requirementId]?.length ?? 0
              return (
                <button
                  key={requirementId}
                  type="button"
                  className={effectiveRequirementId === requirementId ? 'requirement-dsl-panel__requirement--active' : undefined}
                  onClick={() => {
                    setSelectedRequirementId(requirementId)
                    setSelectedModelId(null)
                    setActiveModelId(null)
                  }}
                >
                  <span><code>{requirementId}</code><em>{count} 个模型</em></span>
                  <strong>{item.name || '未提供需求名称'}</strong>
                </button>
              )
            })}
            {filteredRequirementIds.length === 0 && (
              <div className="requirement-dsl-panel__empty"><FileSearchOutlined /><span>没有符合条件的需求</span></div>
            )}
          </div>
        </aside>

        <div className="requirement-dsl-panel__detail">
          {!requirement || !effectiveRequirementId ? (
            <div className="requirement-dsl-panel__empty requirement-dsl-panel__empty--viewer">
              <FileSearchOutlined /><span>没有可展示的需求</span>
            </div>
          ) : expanded ? (
            activeModel ? (
              <div className="requirement-dsl-panel__dimension-editor">
                <Suspense fallback={<div className="requirement-dsl-panel__editor-loading"><LoadingOutlined spin />正在加载模型编辑器</div>}>
                  <DimensionEditor
                    key={activeModel.id}
                    mode="artifact"
                    sectionKey={DIMENSION_CODE_TO_SECTION[activeModel.dimensionCode]}
                    initialDslContent={activeModel.dslContent}
                    initialGraphData={activeModel.graphData}
                    ibdDsl={contextDsl}
                    visualDisabledReason={
                      (activeModel.dimensionCode === 'ESD' || activeModel.dimensionCode === 'ISD') && !contextDsl
                        ? '缺少可用的 IBD 上下文，暂时无法转换为图形'
                        : undefined
                    }
                    onBack={() => setActiveModelId(null)}
                    onDraftChange={handleDraftChange}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="requirement-dsl-v2__overview">
                <section className="requirement-dsl-v2__requirement-editor" aria-label="本地编辑需求信息">
                  <div className="requirement-dsl-v2__overview-heading">
                    <div><span>当前需求</span><code>{effectiveRequirementId}</code></div>
                    <strong>需求概览</strong>
                  </div>
                  <div className="requirement-dsl-v2__fields">
                    <label><span>需求名称</span><input value={requirement.name} onChange={(event) => workspace.updateRequirement(effectiveRequirementId, 'name', event.target.value)} /></label>
                    <label><span>需求类型</span><input value={requirement.reqType} onChange={(event) => workspace.updateRequirement(effectiveRequirementId, 'reqType', event.target.value)} /></label>
                    <label className="requirement-dsl-v2__wide"><span>自然语言描述</span><textarea rows={3} value={requirement.nlText} onChange={(event) => workspace.updateRequirement(effectiveRequirementId, 'nlText', event.target.value)} /></label>
                    <label className="requirement-dsl-v2__wide"><span>补充说明</span><textarea rows={2} value={requirement.description} onChange={(event) => workspace.updateRequirement(effectiveRequirementId, 'description', event.target.value)} /></label>
                  </div>
                  <small>仅编辑当前工具卡内存副本，不写回需求、数据库或源 DSL。</small>
                </section>
                <section className="requirement-dsl-v2__dimensions">
                  <div className="requirement-dsl-v2__dimensions-heading"><strong>六维模型</strong><span>展开维度可管理多个模型</span></div>
                  <DimensionList
                    sections={sectionList}
                    models={allModels.map(toListModel)}
                    editable
                    isSectionDefined={(section) => allModels.some((model) => model.dimensionCode === section.dimensionCode)}
                    onAddModel={beginAdd}
                    onOpenModel={(model) => openModel(model.identity)}
                    onEditModel={(model) => setMetadataDialog({ mode: 'edit', modelId: model.identity })}
                    onDeleteModel={(model) => confirmDelete(model.identity)}
                    onSetPrimary={(model) => workspace.setPrimaryModel(effectiveRequirementId, model.identity)}
                  />
                </section>
              </div>
            )
          ) : (
            <div className="requirement-dsl-panel__artifact-layout">
              <nav aria-label="关联模型">
                <div className="requirement-dsl-panel__section-heading"><strong>关联模型</strong><span>{visibleModels.length} 项</span></div>
                <div className="requirement-dsl-panel__artifact-list">
                  {visibleModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      className={effectiveModel?.id === model.id ? 'requirement-dsl-panel__artifact--active' : undefined}
                      onClick={() => setSelectedModelId(model.id)}
                    >
                      <span><strong title={model.name}>{model.name}</strong><em>{model.dimensionCode}{model.isPrimary ? ' · 主模型' : ''}</em></span>
                      <code>{model.modelKey}</code>
                    </button>
                  ))}
                </div>
              </nav>
              <div className="requirement-dsl-panel__viewer">
                {effectiveModel ? (
                  <>
                    <header><span><strong>{effectiveModel.name}</strong><em>{effectiveModel.dimensionCode} · {effectiveModel.modelType || '未设置类型'}</em></span></header>
                    <div className="requirement-dsl-panel__editor">
                      <Suspense fallback={<div className="requirement-dsl-panel__editor-loading"><LoadingOutlined spin />正在加载 DSL 阅读器</div>}>
                        <DslEditor
                          key={effectiveModel.id}
                          sectionKey={DIMENSION_CODE_TO_SECTION[effectiveModel.dimensionCode]}
                          value={effectiveModel.dslContent}
                          readOnly
                        />
                      </Suspense>
                    </div>
                  </>
                ) : (
                  <div className="requirement-dsl-panel__empty requirement-dsl-panel__empty--viewer"><CodeOutlined /><span>当前筛选下没有模型</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {metadataDialog && (
        <RequirementModelMetadataModal
          open
          title={metadataDialog.mode === 'create' ? '新增本地模型' : '编辑本地模型信息'}
          initialValue={metadataInitialValue}
          existingKeys={allModels
            .filter((model) => model.dimensionCode === metadataInitialValue.dimensionCode)
            .map((model) => ({ identity: model.id, modelKey: model.modelKey }))}
          contextOptions={ibdModels.map((model) => ({ value: model.id, label: model.name, modelKey: model.modelKey }))}
          allowPrimaryToggle
          onCancel={() => setMetadataDialog(null)}
          onSubmit={submitMetadata}
        />
      )}
    </section>
  )
}
