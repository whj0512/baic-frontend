import { useCallback, useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, message, Spin, Badge, Modal, Collapse, Segmented } from 'antd'
import type { CollapseProps } from 'antd'
import { ShareAltOutlined, ArrowLeftOutlined, CloudUploadOutlined, UndoOutlined } from '@ant-design/icons'
import './ProjectWorkSpace.css'
import type { Requirement } from '../models/Requirement'
import type { RequirementVersion } from '../models/RequirementVersion'
import RequirementOverview, { type SectionKey } from '../components/RequirementOverview'
import DimensionEditor from '../components/DimensionEditor'
import RequirementCreator from '../components/RequirementCreator/RequirementCreator'
import ReqRelationShip from '../components/ReqRelationShip'
import ProjectTestCaseView from '../components/ProjectTestCaseView/ProjectTestCaseView'
import PublishProjectDialog from '../components/PublishProjectDialog'
import { API_ENDPOINTS, authFetch, type RequirementRollbackResponse } from '../config/api'
import {
  createRequirementModel,
  deleteRequirementModel,
  fetchRequirementModels,
  RequirementModelsApiError,
  setPrimaryRequirementModel,
  updateRequirementModel,
  type RequirementModelsMutationResult,
} from '../config/requirementModels'
import { useProjectSync } from '../hooks/useProjectSync'
import {
  clearDimensionEditorDraft,
  clearRequirementCreateDraft,
  getDraftUserId,
  readRequirementCreateDraft,
  readDimensionEditorDraftsForRequirement,
  readDimensionEditorDraft,
  saveDimensionEditorDraft,
  saveRequirementCreateDraft,
  normalizeCreateRequirementFormData,
  type CreateRequirementFormData,
} from '../utils/editorDraftStorage'
import type { Project } from '../models/Project'
import type {
  RequirementDimensionCode,
  RequirementModel,
  RequirementModelDraft,
  RequirementModelIdentity,
  RequirementModelInput,
} from '../models/RequirementModel'
import type { RequirementModelMetadataValue } from '../components/RequirementModelMetadataModal'
import { DIMENSION_CODE_TO_SECTION } from '../components/DimensionEditor/dimensionEditorConfig'
import type { EditorSnapshot } from '../components/DimensionEditor/types'

type WorkspaceView = 'requirements' | 'testCases'
type WorkspaceRouteView = 'requirements' | 'test-cases' | 'knowledge-graph'
type RequirementDetailsResponse = {
  requirement?: Requirement
  versions?: RequirementVersion[]
}

// 中间区域视图类型
type CenterView = 'overview' | 'editor' | 'create' | 'create-editor' | 'relationship'
type CreateCenterView = Extract<CenterView, 'create' | 'create-editor'>

const createEmptyRequirementFormData = (): CreateRequirementFormData => ({
  name: '',
  nl_text: '',
  req_type: '',
  relationships: [] as any[],
  sectionData: {} as Record<string, any>,
  sectionDslData: {} as Record<string, string>,
  dimensionModels: [],
})

const hasCreateDraftContent = (formData: CreateRequirementFormData) => (
  Boolean(
    formData.name.trim()
    || formData.req_type.trim()
    || formData.nl_text.trim()
    || formData.relationships.length
    || Object.keys(formData.sectionData).length
    || Object.keys(formData.sectionDslData).length
    || formData.dimensionModels.length,
  )
)

const hasRestorableCreateDraft = (
  formData: CreateRequirementFormData,
  view: CreateCenterView,
  section: SectionKey | null,
) => (
  hasCreateDraftContent(formData) || (view === 'create-editor' && Boolean(section))
)

const getPersistableCreateDraft = (
  formData: CreateRequirementFormData,
  view: CreateCenterView,
  section: SectionKey | null,
) => ({ formData, view, section })

const CREATE_SECTION_KEYS: SectionKey[] = [
  'environment',
  'interaction',
  'internalComposition',
  'moduleResponses',
  'internalConstraints',
  'dialogMap',
]

const getModelIdentityKey = (identity: RequirementModelIdentity) => (
  identity.kind === 'persisted' ? identity.modelGroupId : identity.clientId
)

const toRequirementModelInput = (
  model: RequirementModel | RequirementModelDraft,
  snapshot?: EditorSnapshot,
): RequirementModelInput => ({
  dimension_code: model.dimension_code,
  ...(!('clientId' in model) ? { model_group_id: model.model_group_id } : {}),
  model_type: model.model_type?.trim() || null,
  name: model.name.trim(),
  model_key: model.model_key.trim(),
  dsl_text: snapshot?.dslContent ?? model.dsl_text,
  graph_json: snapshot?.serializedGraphData ?? snapshot?.graphData ?? model.graph_json,
  context_model_group_id: model.context_model_group_id ?? null,
  is_primary: Boolean(model.is_primary),
  sort_order: model.sort_order ?? 0,
  source_path: model.source_path ?? null,
  metadata: model.metadata ?? null,
})

const getModelOperationError = (error: unknown) => {
  if (error instanceof RequirementModelsApiError) {
    if (error.status === 409) return '兼容模型尚未迁移；请先打开并保存该模型，再重试删除。'
    if (error.status === 404) return '需求或模型已不存在，已刷新模型列表。'
    return error.message
  }
  return error instanceof Error ? error.message : '模型操作失败'
}

function getWorkspaceRouteView(value: string | null): WorkspaceRouteView {
  if (value === 'test-cases' || value === 'knowledge-graph') {
    return value
  }

  return 'requirements'
}

function ProjectWorkSpace() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedWorkspaceView = searchParams.get('view')
  const workspaceRouteView = getWorkspaceRouteView(requestedWorkspaceView)
  const setWorkspaceRouteView = useCallback((
    nextView: WorkspaceRouteView,
    replace = false,
  ) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.set('view', nextView)
      return nextParams
    }, { replace })
  }, [setSearchParams])

  // 状态
  const [project, setProject] = useState<Project | null>(null)
  const [requirementVersions, setRequirementVersions] = useState<RequirementVersion[]>([])
  const [selectedRequirementDetail, setSelectedRequirementDetail] = useState<Requirement | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)

  // 当前选中的需求
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null)

  // 进入 relationship 视图前保存上一个视图状态，以便返回
  const prevViewStateRef = useRef<{ view: CenterView; reqId: string | null; section: SectionKey | null }>({
    view: 'overview', reqId: null, section: null
  })
  const createDraftViewRef = useRef<{ view: CreateCenterView; section: SectionKey | null }>({
    view: 'create', section: null
  })
  const createDraftPromptKeyRef = useRef('')
  const draftUserId = getDraftUserId()
  const draftProjectScope = project?.id || projectKey || ''

  const clearCreateFlowDrafts = (modelDrafts: RequirementModelDraft[] = []) => {
    if (!draftProjectScope) return

    clearRequirementCreateDraft(draftProjectScope, draftUserId)
    CREATE_SECTION_KEYS.forEach(sectionKey => {
      clearDimensionEditorDraft(draftProjectScope, draftUserId, 'NEW', sectionKey)
    })
    modelDrafts.forEach(model => {
      clearDimensionEditorDraft(
        draftProjectScope,
        draftUserId,
        'NEW',
        DIMENSION_CODE_TO_SECTION[model.dimension_code],
        model.clientId,
      )
    })
  }

  // 项目工作区一级视图状态
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(
    workspaceRouteView === 'test-cases' ? 'testCases' : 'requirements',
  )
  const [hasOpenedTestCases, setHasOpenedTestCases] = useState(
    workspaceRouteView === 'test-cases',
  )

  // 中间区域视图状态
  const [centerView, setCenterView] = useState<CenterView>(
    workspaceRouteView === 'knowledge-graph' ? 'relationship' : 'overview',
  )
  const isLeftCollapsed = centerView === 'editor' || centerView === 'create-editor'

  // 当前编辑的 section
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null)
  const [editingModelIdentity, setEditingModelIdentity] = useState<RequirementModelIdentity | null>(null)
  const [requirementModels, setRequirementModels] = useState<RequirementModel[]>([])
  const [requirementModelDrafts, setRequirementModelDrafts] = useState<RequirementModelDraft[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [modelsLoadedRequirementId, setModelsLoadedRequirementId] = useState<string | null>(null)
  const [busyModelIdentities, setBusyModelIdentities] = useState<Set<string>>(() => new Set())
  const [busyDimensions, setBusyDimensions] = useState<Set<RequirementDimensionCode>>(() => new Set())
  const busyModelIdentitiesRef = useRef<Set<string>>(new Set())
  const busyDimensionsRef = useRef<Set<RequirementDimensionCode>>(new Set())
  const selectedRequirementRef = useRef<string | null>(null)
  const modelRequestRef = useRef<{ sequence: number; controller: AbortController | null }>({
    sequence: 0,
    controller: null,
  })
  const requirementDetailRequestRef = useRef(0)

  // 右侧面板折叠状态
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [rollingBack, setRollingBack] = useState(false)
  const [lastRollbackResult, setLastRollbackResult] = useState<RequirementRollbackResponse | null>(null)

  const [deleting, setDeleting] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  const restorePreviousCenterView = useCallback(() => {
    const prev = prevViewStateRef.current
    setSelectedRequirement(prev.reqId)
    setEditingSection(prev.section)
    setCenterView(prev.view)
  }, [])

  const handleWorkspaceViewChange = (nextView: WorkspaceView) => {
    if (nextView === 'testCases') {
      setHasOpenedTestCases(true)
      setWorkspaceView(nextView)
      setWorkspaceRouteView('test-cases')
      return
    }

    setWorkspaceView(nextView)
    setWorkspaceRouteView(
      centerView === 'relationship' ? 'knowledge-graph' : 'requirements',
    )
  }

  useEffect(() => {
    setWorkspaceView('requirements')
    setHasOpenedTestCases(false)
    setProject(null)
    setSelectedRequirement(null)
    setSelectedRequirementDetail(null)
    setRequirementVersions([])
    setLastRollbackResult(null)
    setRequirementModels([])
    setRequirementModelDrafts([])
    setEditingModelIdentity(null)
  }, [projectKey])

  useEffect(() => {
    selectedRequirementRef.current = selectedRequirement
  }, [selectedRequirement])

  const openRelationshipView = useCallback(() => {
    if (centerView === 'relationship') {
      return
    }

    prevViewStateRef.current = {
      view: centerView,
      reqId: selectedRequirement,
      section: editingSection,
    }
    setSelectedRequirement(null)
    setCenterView('relationship')
  }, [centerView, editingSection, selectedRequirement])

  const handleOpenRelationshipView = useCallback(() => {
    openRelationshipView()
    setWorkspaceRouteView('knowledge-graph')
  }, [openRelationshipView, setWorkspaceRouteView])

  const handleCloseRelationshipView = useCallback(() => {
    restorePreviousCenterView()
    setWorkspaceRouteView('requirements')
  }, [restorePreviousCenterView, setWorkspaceRouteView])

  useEffect(() => {
    if (
      requestedWorkspaceView
      && requestedWorkspaceView !== workspaceRouteView
    ) {
      setWorkspaceRouteView('requirements', true)
    }
  }, [
    requestedWorkspaceView,
    setWorkspaceRouteView,
    workspaceRouteView,
  ])

  useEffect(() => {
    if (workspaceRouteView === 'test-cases') {
      setHasOpenedTestCases(true)
      setWorkspaceView('testCases')
      return
    }

    setWorkspaceView('requirements')

    if (workspaceRouteView === 'knowledge-graph') {
      openRelationshipView()
      return
    }

    if (centerView === 'relationship') {
      restorePreviousCenterView()
    }
  }, [
    centerView,
    openRelationshipView,
    projectKey,
    restorePreviousCenterView,
    workspaceRouteView,
  ])

  // 初始化：获取项目元信息（仅 project，需求列表由 WebSocket 提供）
  useEffect(() => {
    const initProject = async () => {
      if (!projectKey) return
      setLoading(true)
      try {
        const projRes = await authFetch(API_ENDPOINTS.projects)
        if (!projRes.ok) throw new Error('获取项目列表失败')
        const projData = await projRes.json()
        const projects = Array.isArray(projData) ? projData : (projData.projects || [])
        const currentProject = projects.find((p: any) => p.id === projectKey)
          ?? projects.find((p: any) => p.key === projectKey)

        if (!currentProject) {
          message.error('未找到该项目')
          navigate('/')
          return
        }

        setProject(currentProject)
      } catch (error) {
        console.error('Init error:', error)
        message.error('加载项目资源失败')
      } finally {
        setLoading(false)
      }
    }

    initProject()
  }, [projectKey, navigate])

  // WebSocket 实时同步需求列表
  const {
    requirements,
    isConnected,
    lastRequirementChange,
    removeRequirement,
  } = useProjectSync(project?.id)
  const selectedRequirementSnapshot = requirements.find(requirement => requirement.id === selectedRequirement)

  const loadRequirementModels = useCallback(async (requirementId: string) => {
    modelRequestRef.current.controller?.abort()
    const controller = new AbortController()
    const sequence = modelRequestRef.current.sequence + 1
    modelRequestRef.current = { sequence, controller }
    setModelsLoading(true)
    setModelsError(null)

    try {
      const nextModels = await fetchRequirementModels(requirementId, controller.signal)
      if (
        controller.signal.aborted
        || modelRequestRef.current.sequence !== sequence
        || selectedRequirementRef.current !== requirementId
      ) return null

      setRequirementModels(nextModels)
      const restoredModelDrafts = readDimensionEditorDraftsForRequirement(
        draftProjectScope,
        draftUserId,
        requirementId,
      ).flatMap((draft): RequirementModelDraft[] => {
        if (
          draft.modelIdentityKind !== 'draft'
          || !draft.modelIdentity
          || !draft.dimensionCode
          || !draft.modelName
          || !draft.modelKey
        ) return []
        return [{
          clientId: draft.modelIdentity,
          dimension_code: draft.dimensionCode,
          model_type: draft.modelType ?? null,
          name: draft.modelName,
          model_key: draft.modelKey,
          dsl_text: draft.snapshot.dslContent,
          graph_json: draft.snapshot.serializedGraphData ?? draft.snapshot.graphData,
          context_model_group_id: draft.contextModelGroupId ?? null,
          is_primary: draft.modelIsPrimary ?? false,
          sort_order: draft.modelSortOrder ?? 0,
        }]
      })
      setRequirementModelDrafts(restoredModelDrafts)
      setModelsLoadedRequirementId(requirementId)
      return nextModels
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null
      if (controller.signal.aborted || modelRequestRef.current.sequence !== sequence) return null
      setRequirementModels([])
      setModelsLoadedRequirementId(requirementId)
      setModelsError(getModelOperationError(error) || '模型加载失败')
      return null
    } finally {
      if (modelRequestRef.current.sequence === sequence) setModelsLoading(false)
    }
  }, [draftProjectScope, draftUserId])

  const reloadRequirementModels = useCallback(() => {
    const requirementId = selectedRequirementRef.current
    if (!requirementId || requirementId === 'NEW') return Promise.resolve(null)
    return loadRequirementModels(requirementId)
  }, [loadRequirementModels])

  useEffect(() => {
    modelRequestRef.current.controller?.abort()
    setRequirementModels([])
    setRequirementModelDrafts([])
    setModelsError(null)
    setModelsLoadedRequirementId(null)
    setEditingModelIdentity(null)

    if (!selectedRequirement || selectedRequirement === 'NEW') {
      setModelsLoading(false)
      return
    }
    void loadRequirementModels(selectedRequirement)
  }, [loadRequirementModels, selectedRequirement])

  useEffect(() => () => modelRequestRef.current.controller?.abort(), [])

  const loadRequirementDetails = useCallback(async (
    requirementId: string,
    signal?: AbortSignal,
  ) => {
    const sequence = requirementDetailRequestRef.current + 1
    requirementDetailRequestRef.current = sequence

    setLoadingVersions(true)
    try {
      const res = await authFetch(API_ENDPOINTS.requirementById(requirementId), { signal })
      if (!res.ok) throw new Error('获取需求详情失败')
      const data = await res.json() as RequirementDetailsResponse
      if (
        signal?.aborted
        || requirementDetailRequestRef.current !== sequence
        || selectedRequirementRef.current !== requirementId
      ) return null

      setSelectedRequirementDetail(data.requirement ?? null)
      setRequirementVersions(Array.isArray(data.versions) ? data.versions : [])
      return data
    } catch (error) {
      if (signal?.aborted) return null
      console.error('Fetch details error:', error)
      return null
    } finally {
      if (requirementDetailRequestRef.current === sequence) setLoadingVersions(false)
    }
  }, [])

  const refreshSelectedRequirement = useCallback(async (requirementId: string) => {
    if (!requirementId || requirementId === 'NEW') return
    await Promise.all([
      loadRequirementDetails(requirementId),
      loadRequirementModels(requirementId),
    ])
  }, [loadRequirementDetails, loadRequirementModels])

  useEffect(() => {
    if (!lastRequirementChange) return
    if (lastRequirementChange.requirementId !== selectedRequirementRef.current) return
    void refreshSelectedRequirement(lastRequirementChange.requirementId)
  }, [lastRequirementChange, refreshSelectedRequirement])

  // 获取选中需求的详细信息（包括版本历史）
  useEffect(() => {
    const controller = new AbortController()
    setRequirementVersions([])
    setSelectedRequirementDetail(null)
    setLastRollbackResult(null)

    if (!selectedRequirement || selectedRequirement === 'NEW') {
      setLoadingVersions(false)
      return () => controller.abort()
    }

    void loadRequirementDetails(selectedRequirement, controller.signal)
    return () => controller.abort()
  }, [loadRequirementDetails, selectedRequirement])

  // 供需求概览显示的版本摘要
  const currentVersions = requirementVersions

  // 获取当前选中的需求对象
  const currentRequirement = selectedRequirementDetail ?? selectedRequirementSnapshot
  const currentVersionCode = currentRequirement?.version_code
  const rollbackDisabledReason = !selectedRequirement || selectedRequirement === 'NEW'
    ? '请选择需要回退的需求'
    : centerView === 'editor'
      ? '请先返回需求概览，再执行版本回退'
      : rollingBack
        ? '正在回退版本，请稍候'
        : currentVersionCode !== undefined && currentVersionCode <= 1
          ? '当前需求没有可回退的上一版本'
          : null
  const activeRequirementModel = editingModelIdentity?.kind === 'persisted'
    ? requirementModels.find(model => model.model_group_id === editingModelIdentity.modelGroupId)
    : editingModelIdentity?.kind === 'draft'
      ? requirementModelDrafts.find(model => model.clientId === editingModelIdentity.clientId)
      : undefined
  const activeRequirementNeedsIbd = activeRequirementModel
    && (activeRequirementModel.dimension_code === 'ESD' || activeRequirementModel.dimension_code === 'ISD')
  const activeRequirementIbd = activeRequirementNeedsIbd
    ? requirementModels.find(model => (
      model.dimension_code === 'IBD'
      && model.model_group_id === activeRequirementModel.context_model_group_id
    ))
    : undefined
  const activeRequirementVisualDisabledReason = activeRequirementNeedsIbd
    && (!activeRequirementIbd || !activeRequirementIbd.dsl_text.trim())
    ? '当前 IBD 上下文已缺失或尚无 DSL，请先在模型信息中重新选择'
    : undefined

  useEffect(() => {
    if (centerView !== 'editor' || editingModelIdentity?.kind !== 'persisted') return
    if (modelsLoading || modelsLoadedRequirementId !== selectedRequirement) return
    if (requirementModels.some(model => model.model_group_id === editingModelIdentity.modelGroupId)) return

    message.warning('模型已被删除')
    setEditingModelIdentity(null)
    setEditingSection(null)
    setCenterView('overview')
  }, [
    centerView,
    editingModelIdentity,
    modelsLoadedRequirementId,
    modelsLoading,
    requirementModels,
    selectedRequirement,
  ])

  const setModelBusy = (identityKey: string, busy: boolean) => {
    if (busy) busyModelIdentitiesRef.current.add(identityKey)
    else busyModelIdentitiesRef.current.delete(identityKey)
    setBusyModelIdentities(previous => {
      const next = new Set(previous)
      if (busy) next.add(identityKey)
      else next.delete(identityKey)
      return next
    })
  }

  const setDimensionBusy = (dimensionCode: RequirementDimensionCode, busy: boolean) => {
    if (busy) busyDimensionsRef.current.add(dimensionCode)
    else busyDimensionsRef.current.delete(dimensionCode)
    setBusyDimensions(previous => {
      const next = new Set(previous)
      if (busy) next.add(dimensionCode)
      else next.delete(dimensionCode)
      return next
    })
  }

  const persistRequirementModelDraftRecord = (draft: RequirementModelDraft) => {
    const requirementId = selectedRequirementRef.current
    if (!requirementId || !draftProjectScope) return
    const sectionKey = DIMENSION_CODE_TO_SECTION[draft.dimension_code]
    const existing = readDimensionEditorDraft(
      draftProjectScope,
      draftUserId,
      requirementId,
      sectionKey,
      draft.clientId,
    )
    saveDimensionEditorDraft(
      draftProjectScope,
      draftUserId,
      requirementId,
      sectionKey,
      draft.clientId,
      {
        modelIdentityKind: 'draft',
        dimensionCode: draft.dimension_code,
        baseRequirementUpdatedAt: currentRequirement?.updated_at,
        modelName: draft.name,
        modelType: draft.model_type ?? null,
        modelKey: draft.model_key,
        contextModelGroupId: draft.context_model_group_id ?? null,
        modelIsPrimary: Boolean(draft.is_primary),
        modelSortOrder: draft.sort_order ?? 0,
        viewMode: existing?.viewMode ?? 'dsl',
        snapshot: existing?.snapshot ?? {
          content: '',
          dslContent: draft.dsl_text,
          graphData: draft.graph_json,
        },
      },
    )
  }

  const adoptMutationResult = async (
    requirementId: string,
    result: RequirementModelsMutationResult,
  ) => {
    if (selectedRequirementRef.current !== requirementId) return null
    if (result.models) {
      setRequirementModels(result.models)
      setModelsLoadedRequirementId(requirementId)
      setModelsError(null)
      return result.models
    }
    return loadRequirementModels(requirementId)
  }

  const handleCreateModelDraft = (draft: RequirementModelDraft) => {
    const normalizedPrevious = draft.is_primary
      ? requirementModelDrafts.map(model => model.dimension_code === draft.dimension_code
        ? { ...model, is_primary: false }
        : model)
      : requirementModelDrafts
    const nextDrafts = [...normalizedPrevious, draft]
    setRequirementModelDrafts(nextDrafts)
    nextDrafts
      .filter(model => model.dimension_code === draft.dimension_code)
      .forEach(persistRequirementModelDraftRecord)
  }

  const handleUpdateModelMetadata = async (
    identity: RequirementModelIdentity,
    value: RequirementModelMetadataValue,
  ) => {
    if (identity.kind === 'draft') {
      const currentDraft = requirementModelDrafts.find(model => model.clientId === identity.clientId)
      if (!currentDraft) throw new Error('模型草稿已不存在')
      const nextDrafts = requirementModelDrafts.map(model => {
        if (model.clientId === identity.clientId) {
          const isOnlyPrimary = Boolean(model.is_primary)
            && !requirementModels.some(candidate => candidate.dimension_code === model.dimension_code)
            && !requirementModelDrafts.some(candidate => (
              candidate.clientId !== model.clientId
              && candidate.dimension_code === model.dimension_code
              && candidate.is_primary
            ))
          return {
            ...model,
            name: value.name,
            model_type: value.modelType,
            model_key: value.modelKey,
            context_model_group_id: value.contextModelGroupId,
            is_primary: isOnlyPrimary ? true : value.isPrimary,
          }
        }
        if (value.isPrimary && model.dimension_code === value.dimensionCode) {
          return { ...model, is_primary: false }
        }
        return model
      })
      setRequirementModelDrafts(nextDrafts)
      nextDrafts
        .filter(model => model.dimension_code === value.dimensionCode)
        .forEach(persistRequirementModelDraftRecord)
      return
    }

    const model = requirementModels.find(candidate => candidate.model_group_id === identity.modelGroupId)
    const requirementId = selectedRequirementRef.current
    if (!model || !requirementId) throw new Error('模型已不存在，请刷新后重试')
    if (busyModelIdentitiesRef.current.has(model.model_group_id)) throw new Error('该模型正在保存，请稍候')

    setModelBusy(model.model_group_id, true)
    try {
      const result = await updateRequirementModel(requirementId, model.model_group_id, {
        ...toRequirementModelInput(model),
        name: value.name,
        model_type: value.modelType,
        model_key: value.modelKey,
        context_model_group_id: value.contextModelGroupId,
      })
      await adoptMutationResult(requirementId, result)
      message.success('模型信息已更新')
    } catch (error) {
      if (error instanceof RequirementModelsApiError && error.status === 404) {
        await loadRequirementModels(requirementId)
      }
      throw new Error(getModelOperationError(error))
    } finally {
      setModelBusy(model.model_group_id, false)
    }
  }

  const handleSetPrimaryModel = async (identity: RequirementModelIdentity) => {
    if (identity.kind === 'draft') {
      const target = requirementModelDrafts.find(model => model.clientId === identity.clientId)
      if (!target || target.is_primary) return
      const nextDrafts = requirementModelDrafts.map(model => (
        model.dimension_code === target.dimension_code
          ? { ...model, is_primary: model.clientId === target.clientId }
          : model
      ))
      setRequirementModelDrafts(nextDrafts)
      nextDrafts
        .filter(model => model.dimension_code === target.dimension_code)
        .forEach(persistRequirementModelDraftRecord)
      return
    }

    const target = requirementModels.find(model => model.model_group_id === identity.modelGroupId)
    const requirementId = selectedRequirementRef.current
    if (!target || !requirementId) return
    if (busyDimensionsRef.current.has(target.dimension_code)) return
    const nextDrafts = requirementModelDrafts.map(model => (
      model.dimension_code === target.dimension_code ? { ...model, is_primary: false } : model
    ))
    setRequirementModelDrafts(nextDrafts)
    nextDrafts
      .filter(model => model.dimension_code === target.dimension_code)
      .forEach(persistRequirementModelDraftRecord)
    if (target.is_primary) return
    setDimensionBusy(target.dimension_code, true)
    try {
      const result = await setPrimaryRequirementModel(requirementId, target.model_group_id)
      await adoptMutationResult(requirementId, result)
      message.success('主模型已切换')
    } catch (error) {
      if (error instanceof RequirementModelsApiError && error.status === 404) {
        await loadRequirementModels(requirementId)
      }
      message.error(getModelOperationError(error))
    } finally {
      setDimensionBusy(target.dimension_code, false)
    }
  }

  const handleDeleteModel = async (identity: RequirementModelIdentity) => {
    if (identity.kind === 'draft') {
      const target = requirementModelDrafts.find(model => model.clientId === identity.clientId)
      if (!target) return
      const requirementId = selectedRequirementRef.current
      if (requirementId && draftProjectScope) {
        clearDimensionEditorDraft(
          draftProjectScope,
          draftUserId,
          requirementId,
          DIMENSION_CODE_TO_SECTION[target.dimension_code],
          target.clientId,
        )
      }
      const remaining = requirementModelDrafts.filter(model => model.clientId !== target.clientId)
      const hasPersistedPrimary = requirementModels.some(model => (
        model.dimension_code === target.dimension_code && model.is_primary
      ))
      const nextPrimary = target.is_primary && !hasPersistedPrimary
        ? remaining.find(model => model.dimension_code === target.dimension_code)
        : undefined
      const nextDrafts = nextPrimary
        ? remaining.map(model => model.clientId === nextPrimary.clientId ? { ...model, is_primary: true } : model)
        : remaining
      setRequirementModelDrafts(nextDrafts)
      nextDrafts
        .filter(model => model.dimension_code === target.dimension_code)
        .forEach(persistRequirementModelDraftRecord)
      if (editingModelIdentity?.kind === 'draft' && editingModelIdentity.clientId === target.clientId) {
        setEditingModelIdentity(null)
        setEditingSection(null)
        setCenterView('overview')
      }
      return
    }

    const target = requirementModels.find(model => model.model_group_id === identity.modelGroupId)
    const requirementId = selectedRequirementRef.current
    if (!target || !requirementId) return
    if (busyModelIdentitiesRef.current.has(target.model_group_id)) return
    setModelBusy(target.model_group_id, true)
    try {
      const result = await deleteRequirementModel(requirementId, target.model_group_id)
      await adoptMutationResult(requirementId, result)
      if (editingModelIdentity?.kind === 'persisted'
        && editingModelIdentity.modelGroupId === target.model_group_id) {
        setEditingModelIdentity(null)
        setEditingSection(null)
        setCenterView('overview')
      }
      message.success('模型已删除')
    } catch (error) {
      if (error instanceof RequirementModelsApiError && error.status === 404) {
        await loadRequirementModels(requirementId)
      }
      message.error(getModelOperationError(error))
    } finally {
      setModelBusy(target.model_group_id, false)
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 截断文本
  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) return '—'
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // 处理 section 点击 - 切换到编辑器视图
  const handleSectionClick = (sectionKey: SectionKey) => {
    setEditingModelIdentity(null)
    setEditingSection(sectionKey)
    setCenterView('editor')
  }

  const handleOpenModel = (identity: RequirementModelIdentity, sectionKey: SectionKey) => {
    setEditingModelIdentity(identity)
    setEditingSection(sectionKey)
    setCenterView('editor')
  }

  // 返回概览视图
  const handleBackToOverview = () => {
    setEditingModelIdentity(null)
    setEditingSection(null)
    setCenterView('overview')
  }

  // 选择需求时重置视图
  const handleRequirementSelect = (reqId: string) => {
    if (centerView === 'create' || centerView === 'create-editor') {
      createDraftViewRef.current = { view: centerView, section: editingSection }
    }
    setSelectedRequirement(reqId)
    setEditingModelIdentity(null)
    setEditingSection(null)
    setCenterView('overview')
  }

  // 删除需求
  const handleDeleteRequirement = (req: Requirement) => {
    Modal.confirm({
      title: '确认删除需求',
      content: `确定要删除该需求吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true)
        try {
          const response = await authFetch(API_ENDPOINTS.requirementById(req.id), {
            method: 'DELETE',
          })
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || '删除失败')
          }
          message.success('需求已删除')
          removeRequirement(req.id)
          if (selectedRequirement === req.id) {
            setSelectedRequirement(null)
            setEditingSection(null)
            setCenterView('overview')
          }
        } catch (error: any) {
          console.error('Delete error:', error)
          message.error(error.message || '删除失败，请稍后重试')
        } finally {
          setDeleting(false)
        }
      },
    })
  }


  // 新建需求表单状态
  const [createFormData, setCreateFormData] = useState(createEmptyRequirementFormData)

  useEffect(() => {
    if (!draftProjectScope) return

    const promptKey = `${draftUserId}:${draftProjectScope}`
    if (createDraftPromptKeyRef.current === promptKey) return
    createDraftPromptKeyRef.current = promptKey

    const draft = readRequirementCreateDraft(draftProjectScope, draftUserId)
    if (!draft || !hasRestorableCreateDraft(draft.formData, draft.view, draft.section)) return

    Modal.confirm({
      title: '检测到未完成的新建需求草稿',
      content: '是否恢复上次异常关闭前正在编辑的新建需求内容？',
      okText: '恢复草稿',
      cancelText: '丢弃草稿',
      centered: true,
      onOk: () => {
        setCreateFormData(normalizeCreateRequirementFormData(draft.formData))
        createDraftViewRef.current = { view: draft.view, section: draft.section }
        setSelectedRequirement(null)
        setEditingSection(draft.section)
        setCenterView(draft.view === 'create-editor' && draft.section ? 'create-editor' : 'create')
      },
      onCancel: () => {
        clearRequirementCreateDraft(draftProjectScope, draftUserId)
        CREATE_SECTION_KEYS.forEach(sectionKey => {
          clearDimensionEditorDraft(draftProjectScope, draftUserId, 'NEW', sectionKey)
        })
      },
    })
  }, [draftProjectScope, draftUserId])

  useEffect(() => {
    if (centerView !== 'create' && centerView !== 'create-editor') return

    const draft = getPersistableCreateDraft(createFormData, centerView, editingSection)
    const shouldSaveDraft = hasRestorableCreateDraft(draft.formData, draft.view, draft.section)
    if (!draftProjectScope || !shouldSaveDraft) return

    const timer = setTimeout(() => {
      saveRequirementCreateDraft(draftProjectScope, draftUserId, {
        formData: draft.formData,
        view: draft.view,
        section: draft.section,
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [centerView, createFormData, draftProjectScope, draftUserId, editingSection])

  useEffect(() => {
    if (centerView !== 'create' && centerView !== 'create-editor') return

    const draft = getPersistableCreateDraft(createFormData, centerView, editingSection)
    const shouldSaveDraft = hasRestorableCreateDraft(draft.formData, draft.view, draft.section)
    if (!draftProjectScope || !shouldSaveDraft) return

    const flushCreateDraft = () => {
      saveRequirementCreateDraft(draftProjectScope, draftUserId, {
        formData: draft.formData,
        view: draft.view,
        section: draft.section,
      })
    }

    window.addEventListener('beforeunload', flushCreateDraft)
    return () => window.removeEventListener('beforeunload', flushCreateDraft)
  }, [centerView, createFormData, draftProjectScope, draftUserId, editingSection])

  const handleCreateRequirement = () => {
    const draftView = createDraftViewRef.current
    setSelectedRequirement(null)
    setEditingSection(draftView.section)
    setCenterView(draftView.view === 'create-editor' && draftView.section ? 'create-editor' : 'create')
  }

  const handleRollbackRequirement = () => {
    const requirementId = selectedRequirementRef.current
    if (!requirementId || requirementId === 'NEW' || rollingBack || rollbackDisabledReason) return

    Modal.confirm({
      title: '确认回退上一版本',
      content: '将使用上一版本内容创建一个新的当前版本。现有版本历史不会被删除或改写。',
      okText: '确认回退',
      okType: 'danger',
      cancelText: '取消',
      centered: true,
      onOk: async () => {
        setRollingBack(true)
        try {
          const response = await authFetch(API_ENDPOINTS.requirementRollback(requirementId), {
            method: 'POST',
          })
          const data = await response.json().catch(() => null) as RequirementRollbackResponse | { detail?: unknown } | null

          if (!response.ok) {
            if (response.status === 409) throw new Error('需求没有可回退的上一版本')
            if (response.status === 404) throw new Error('需求不存在')
            const detail = data && typeof data.detail === 'string' ? data.detail : null
            throw new Error(detail || '版本回退失败，请稍后重试')
          }

          const rollbackResult = data as RequirementRollbackResponse
          if (selectedRequirementRef.current === requirementId) {
            setLastRollbackResult(rollbackResult)
            setSelectedRequirementDetail(previous => (
              previous ? { ...previous, ...rollbackResult.requirement } : rollbackResult.requirement
            ))
            if (Array.isArray(rollbackResult.models)) {
              setRequirementModels(rollbackResult.models)
              setModelsLoadedRequirementId(requirementId)
              setModelsError(null)
            }
            await refreshSelectedRequirement(requirementId)
          }

          message.success(
            `已从 v${rollbackResult.rolled_back_from_version_code} 恢复 v${rollbackResult.restored_from_version_code}，并生成 v${rollbackResult.version_code}`,
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '版本回退失败，请稍后重试'
          console.error('Rollback requirement error:', error)
          message.error(errorMessage)
        } finally {
          setRollingBack(false)
        }
      },
    })
  }

  // 处理新建完成或取消
  const handleCreateFinish = () => {
    clearCreateFlowDrafts(createFormData.dimensionModels)
    setCreateFormData(createEmptyRequirementFormData())
    createDraftViewRef.current = { view: 'create', section: null }
    setEditingSection(null)
    setCenterView('overview')
  }

  const handlePersistRequirementModel = async (snapshot: EditorSnapshot) => {
    const requirementId = selectedRequirementRef.current
    const identity = editingModelIdentity
    if (!requirementId || !identity) throw new Error('未找到当前编辑模型')

    if (identity.kind === 'persisted') {
      const model = requirementModels.find(candidate => candidate.model_group_id === identity.modelGroupId)
      if (!model) throw new Error('模型已被删除')
      if (busyModelIdentitiesRef.current.has(model.model_group_id)) throw new Error('该模型正在保存，请稍候')
      setModelBusy(model.model_group_id, true)
      try {
        const result = await updateRequirementModel(
          requirementId,
          model.model_group_id,
          toRequirementModelInput(model, snapshot),
        )
        await adoptMutationResult(requirementId, result)
      } catch (error) {
        if (error instanceof RequirementModelsApiError && error.status === 404) {
          await loadRequirementModels(requirementId)
        }
        throw new Error(getModelOperationError(error))
      } finally {
        setModelBusy(model.model_group_id, false)
      }
      return
    }

    const draft = requirementModelDrafts.find(candidate => candidate.clientId === identity.clientId)
    if (!draft) throw new Error('模型草稿已不存在')
    setModelBusy(draft.clientId, true)
    try {
      const existingIds = new Set(requirementModels.map(model => model.model_group_id))
      const result = await createRequirementModel(requirementId, toRequirementModelInput(draft, snapshot))
      const adoptedModels = await adoptMutationResult(requirementId, result)
      const nextModels = result.models ?? adoptedModels
      const createdModel = result.model
        ?? nextModels?.find(model => (
          !existingIds.has(model.model_group_id)
          && model.dimension_code === draft.dimension_code
          && model.model_key === draft.model_key
        ))
      if (!createdModel) {
        throw new Error('模型已保存，但未能定位服务端模型；请返回概览后刷新')
      }

      clearDimensionEditorDraft(
        draftProjectScope,
        draftUserId,
        requirementId,
        editingSection ?? DIMENSION_CODE_TO_SECTION[draft.dimension_code],
        draft.clientId,
      )
      if (selectedRequirementRef.current !== requirementId) return
      setRequirementModelDrafts(previous => previous.filter(model => model.clientId !== draft.clientId))
      setEditingModelIdentity({ kind: 'persisted', modelGroupId: createdModel.model_group_id })
    } catch (error) {
      if (error instanceof RequirementModelsApiError && error.status === 404) {
        await loadRequirementModels(requirementId)
      }
      throw new Error(getModelOperationError(error))
    } finally {
      setModelBusy(draft.clientId, false)
    }
  }

  // 处理新建时的 Section 点击
  const handleCreateSectionClick = (sectionKey: SectionKey, clientId?: string) => {
    createDraftViewRef.current = { view: 'create-editor', section: sectionKey }
    setEditingModelIdentity(clientId ? { kind: 'draft', clientId } : null)
    setEditingSection(sectionKey)
    setCenterView('create-editor')
  }

  const handleBackToCreator = () => {
    createDraftViewRef.current = { view: 'create', section: null }
    if (draftProjectScope) {
      const draft = getPersistableCreateDraft(createFormData, 'create', null)
      if (hasCreateDraftContent(draft.formData)) {
        saveRequirementCreateDraft(draftProjectScope, draftUserId, {
          formData: draft.formData,
          view: draft.view,
          section: draft.section,
        })
      } else {
        clearCreateFlowDrafts(createFormData.dimensionModels)
      }
    }
    setEditingSection(null)
    setEditingModelIdentity(null)
    setCenterView('create')
  }

  // 处理新建编辑器保存
  const handleCreateEditorSave = (sectionKey: SectionKey, graphData: object, dslText: string) => {
    setCreateFormData(prev => ({
      ...prev,
      sectionData: {
        ...prev.sectionData,
        [sectionKey]: graphData
      },
      sectionDslData: {
        ...prev.sectionDslData,
        [sectionKey]: dslText
      }
    }))
  }

  const handleCreateModelPersist = async (snapshot: EditorSnapshot) => {
    if (editingModelIdentity?.kind !== 'draft') throw new Error('未找到当前模型草稿')
    const clientId = editingModelIdentity.clientId
    setCreateFormData(previous => ({
      ...previous,
      dimensionModels: previous.dimensionModels.map(model => model.clientId === clientId
        ? {
          ...model,
          dsl_text: snapshot.dslContent,
          graph_json: snapshot.serializedGraphData ?? snapshot.graphData,
        }
        : model),
    }))
  }

  const activeCreateModel = editingModelIdentity?.kind === 'draft'
    ? createFormData.dimensionModels.find(model => model.clientId === editingModelIdentity.clientId)
    : undefined
  const primaryCreateIbd = createFormData.dimensionModels.find(model => (
    model.dimension_code === 'IBD' && model.is_primary
  ))
  const activeCreateVisualDisabledReason = activeCreateModel
    && (activeCreateModel.dimension_code === 'ESD' || activeCreateModel.dimension_code === 'ISD')
    && (!primaryCreateIbd || !primaryCreateIbd.dsl_text.trim())
    ? '请先创建、选择并保存一张主 IBD 模型'
    : undefined

  // 构建临时 Requirement 对象用于编辑器
  const draftRequirement: Requirement = {
    id: 'NEW',
    project_id: project?.id || '',
    name: createFormData.name,
    nl_text: createFormData.nl_text,
    req_type: createFormData.req_type,
    created_by: 'CurrentUser',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Map section data to requirement graph fields
    graph_IBD: createFormData.sectionData.environment,
    graph_ESD: createFormData.sectionData.interaction,
    graph_BDD: createFormData.sectionData.internalComposition,
    graph_ISD: createFormData.sectionData.moduleResponses,
    graph_SC: createFormData.sectionData.internalConstraints,
    // Map section DSL data to requirement DSL fields
    dsl_IBD: createFormData.sectionDslData.environment,
    dsl_ESD: createFormData.sectionDslData.interaction,
    dsl_BDD: createFormData.sectionDslData.internalComposition,
    dsl_ISD: createFormData.sectionDslData.moduleResponses,
    dsl_SC: createFormData.sectionDslData.internalConstraints,
  } as Requirement // Cast as we might be missing some required fields but sufficient for editor

  // 类型显示名称映射
  const typeDisplayName = (type: string) => {
    switch (type) {
      case 'component': return '部件需求'
      case 'system': return '系统需求'
      default: return type || '默认'
    }
  }

  // 按 type → subtype 构建两级分组结构
  const groupedRequirements = requirements.reduce((acc, req) => {
    const type = typeDisplayName(req.type || '')
    const subtype = req.subtype || ''
    if (!acc[type]) acc[type] = {}
    if (!acc[type][subtype]) acc[type][subtype] = []
    acc[type][subtype].push(req)
    return acc
  }, {} as Record<string, Record<string, Requirement[]>>)

  // 渲染单个需求项
  const renderReqItem = (req: Requirement) => (
    <div
      key={req.id}
      className={`requirement-item ${selectedRequirement === req.id ? 'selected' : ''}`}
      onClick={() => handleRequirementSelect(req.id)}
      style={{ marginBottom: 0 }}
    >
      <div className="requirement-item-header">
        <span className="requirement-date">{formatDate(req.updated_at)}</span>
      </div>
      <div className="requirement-item-content">
        {truncateText(req.name, 50)}
      </div>
      <button
        type="button"
        className="requirement-delete-button"
        onClick={(event) => {
          event.stopPropagation()
          handleDeleteRequirement(req)
        }}
        disabled={deleting}
      >
        删除
      </button>
    </div>
  )

  // 构建外层（type）Collapse items
  const collapseItems: CollapseProps['items'] = Object.entries(groupedRequirements).map(([type, subtypeMap]) => {
    const totalCount = Object.values(subtypeMap).reduce((s, arr) => s + arr.length, 0)

    // 判断是否存在非空 subtype
    const hasSubtype = Object.keys(subtypeMap).some(k => k !== '')

    // 内层 subtype Collapse items（仅含有 subtype 的分组）
    const innerItems: CollapseProps['items'] = Object.entries(subtypeMap)
      .filter(([subtype]) => subtype !== '')
      .map(([subtype, reqs]) => ({
        key: subtype,
        label: `${subtype} (${reqs.length})`,
        children: (
          <div className="requirement-type-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {reqs.map(renderReqItem)}
          </div>
        )
      }))

    // 无 subtype 的需求直接列在顶部
    const noSubtypeReqs = subtypeMap[''] || []

    return {
      key: type,
      label: `${type} (${totalCount})`,
      children: (
        <div className="requirement-type-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* 无 subtype 的需求直接渲染 */}
          {noSubtypeReqs.map(renderReqItem)}
          {/* 有 subtype 的需求，嵌套一层 Collapse */}
          {hasSubtype && (
            <Collapse
              ghost
              size="small"
              items={innerItems}
              defaultActiveKey={innerItems.map(i => i.key as string)}
              className="subtype-collapse"
            />
          )}
        </div>
      )
    }
  })

  return (
    <div className="project-workspace-page">
      <div className="workspace-view-switcher">
        <Segmented
          value={workspaceView}
          options={[
            { label: '需求', value: 'requirements' },
            {
              label: '测试用例',
              value: 'testCases',
              disabled: loading || !project,
            },
          ]}
          onChange={value => handleWorkspaceViewChange(value as WorkspaceView)}
          aria-label="项目工作区视图"
        />
      </div>

      <div className="workspace-view-body">
        <section
          className="workspace-pane workspace-requirements-pane"
          hidden={workspaceView !== 'requirements'}
          aria-hidden={workspaceView !== 'requirements'}
        >
          <div className="workspace-container" data-workspace-view={workspaceView}>
      {/* ... Left Panel ... */}
      <div
        className={`workspace-left${isLeftCollapsed ? ' workspace-left-collapsed' : ''}`}
        aria-hidden={isLeftCollapsed}
      >
        {/* ... (Unchanged) ... */}
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/")}
              style={{ padding: '4px' }}
              title="返回上页"
            />
            <h3>
              {project?.name || ''} 需求列表
              <Badge status={isConnected ? 'success' : 'error'} style={{ marginLeft: 8 }} title={isConnected ? '实时同步已连接' : '实时同步已断开'} />
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Button
              type="text"
              size="small"
              icon={<CloudUploadOutlined />}
              className="workspace-publish-button"
              disabled={!project}
              onClick={() => setShowPublishDialog(true)}
            >
              发布
            </Button>
            <button
              className="btn-icon"
              title="新建需求"
              onClick={handleCreateRequirement}
            >
              +
            </button>
          </div>
        </div>
        <div className="requirement-list">
          <Spin spinning={loading}>
            {requirements.length === 0 && !loading && (
              <div className="list-empty">暂无需求</div>
            )}
            {requirements.length > 0 && (
              <Collapse
                ghost
                items={collapseItems}
                defaultActiveKey={Object.keys(groupedRequirements)}
              />
            )}
          </Spin>
        </div>
        <div className="panel-footer">
          <Button
            type="default"
            icon={<ShareAltOutlined />}
            block
            onClick={handleOpenRelationshipView}
          >
            需求间关系
          </Button>
        </div>
      </div>

      {/* Center Panel */}
      <div className="workspace-center">
        {/* 内容区 */}
        <div className="center-content">
          {centerView === 'overview' && (
            <Spin spinning={loadingVersions} wrapperClassName="overview-spin-wrapper">
              <RequirementOverview
                requirement={currentRequirement || null}
                versions={currentVersions}
                projectKey={project?.key || ''}
                onSectionClick={(section) => handleSectionClick(section)}
                models={requirementModels}
                modelDrafts={requirementModelDrafts}
                modelsLoading={modelsLoading}
                modelsError={modelsError}
                busyModelIdentities={busyModelIdentities}
                busyDimensions={busyDimensions}
                onRetryModels={() => { void reloadRequirementModels() }}
                onCreateModelDraft={handleCreateModelDraft}
                onUpdateModelMetadata={handleUpdateModelMetadata}
                onOpenModel={handleOpenModel}
                onSetPrimaryModel={handleSetPrimaryModel}
                onDeleteModel={handleDeleteModel}
              />
            </Spin>
          )}

          {centerView === 'editor' && currentRequirement && editingSection && (
            <DimensionEditor
              key={`${currentRequirement.id}-${editingSection}-${editingModelIdentity ? getModelIdentityKey(editingModelIdentity) : 'legacy'}`}
              draftProjectScope={draftProjectScope}
              requirement={currentRequirement}
              sectionKey={editingSection}
              model={activeRequirementModel}
              modelIdentity={editingModelIdentity ? getModelIdentityKey(editingModelIdentity) : undefined}
              ibdDsl={activeRequirementIbd?.dsl_text}
              visualDisabledReason={activeRequirementVisualDisabledReason}
              onBack={handleBackToOverview}
              onPersist={activeRequirementModel ? handlePersistRequirementModel : undefined}
            />
          )}

          {centerView === 'create' && (
            <RequirementCreator
              projectKey={project?.key}
              draftProjectScope={draftProjectScope}
              formData={createFormData}
              onChange={setCreateFormData}
              onModelOpen={handleCreateSectionClick}
              onCancel={handleCreateFinish}
              onSuccess={handleCreateFinish}
            />
          )}

          {centerView === 'create-editor' && editingSection && (
            <DimensionEditor
              key={`NEW-${editingSection}-${editingModelIdentity ? getModelIdentityKey(editingModelIdentity) : 'legacy'}`}
              draftProjectScope={draftProjectScope}
              requirement={draftRequirement}
              sectionKey={editingSection}
              model={activeCreateModel}
              modelIdentity={activeCreateModel?.clientId}
              ibdDsl={activeCreateModel ? primaryCreateIbd?.dsl_text : undefined}
              visualDisabledReason={activeCreateVisualDisabledReason}
              onBack={handleBackToCreator}
              onSave={activeCreateModel ? undefined : handleCreateEditorSave}
              onPersist={activeCreateModel ? handleCreateModelPersist : undefined}
            />
          )}

          {centerView === 'relationship' && (
            <ReqRelationShip
              requirements={requirements}
              onBack={handleCloseRelationshipView}
            />
          )}

        </div>
      </div>

      {/* Right Panel */}
      {!['create', 'create-editor', 'relationship'].includes(centerView) && (
        <div className={`workspace-right${rightCollapsed ? ' workspace-right-collapsed' : ''}`}>
          {/* 折叠/展开触发区 */}
          <div className="right-collapse-bar" onClick={() => setRightCollapsed(prev => !prev)} title={rightCollapsed ? '展开面板' : '收起面板'}>
            <span className="right-collapse-icon">{rightCollapsed ? '‹' : '›'}</span>
          </div>
          {/* 面板内容（折叠时隐藏）*/}
          {!rightCollapsed && (
            <div className="workspace-right-content">
              <div className="rollback-panel">
                <div className="panel-header">
                  <h3>版本回退</h3>
                </div>
                <div className="rollback-panel-content">
                  <div className="rollback-target">
                    <span>当前需求</span>
                    <strong>{currentRequirement?.name || selectedRequirementSnapshot?.name || '未选择需求'}</strong>
                  </div>
                  <p className="rollback-description">
                    {currentVersionCode !== undefined
                      ? `当前为 v${currentVersionCode}，将恢复上一版本内容并创建新版本。`
                      : '将恢复当前需求的上一版本内容，并创建新版本。'}
                  </p>
                  {rollbackDisabledReason && (
                    <div className="rollback-disabled-reason">{rollbackDisabledReason}</div>
                  )}
                  <Button
                    type="primary"
                    danger
                    block
                    icon={<UndoOutlined />}
                    loading={rollingBack}
                    disabled={Boolean(rollbackDisabledReason)}
                    onClick={handleRollbackRequirement}
                  >
                    回退上一版本
                  </Button>
                  {lastRollbackResult?.requirement_id === selectedRequirement && (
                    <div className="rollback-result" aria-live="polite">
                      已从 v{lastRollbackResult.rolled_back_from_version_code} 恢复 v{lastRollbackResult.restored_from_version_code}，并生成 v{lastRollbackResult.version_code}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
          </div>
        </section>

        {hasOpenedTestCases && project ? (
          <section
            className="workspace-pane workspace-test-cases-pane"
            hidden={workspaceView !== 'testCases'}
            aria-hidden={workspaceView !== 'testCases'}
          >
            <ProjectTestCaseView
              projectId={project.id}
              active={workspaceView === 'testCases'}
            />
          </section>
        ) : null}
      </div>

      <PublishProjectDialog
        open={showPublishDialog}
        project={project}
        onClose={() => setShowPublishDialog(false)}
      />
    </div>
  )
}

export default ProjectWorkSpace
