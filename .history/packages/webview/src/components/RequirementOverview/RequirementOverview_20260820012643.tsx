import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, message, Select, Input, Modal, Space } from 'antd'
import { CloseOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import type { Requirement } from '../../models/Requirement'
import type { RequirementVersion } from '../../models/RequirementVersion'
import { API_ENDPOINTS, authFetch } from '../../config/api'
import DimensionList from '../DimensionList'
import type { DimensionListModelItem } from '../DimensionList/DimensionList'
import type { SectionKey } from '../DimensionEditor/types'
import { getLegacySnapshotSections, getRequirementSections } from '../DimensionList/requirementSections'
import { DIMENSION_CODE_TO_SECTION } from '../DimensionEditor/dimensionEditorConfig'
import RequirementModelMetadataModal, {
  type RequirementModelMetadataValue,
} from '../RequirementModelMetadataModal'
import type {
  RequirementDimensionCode,
  RequirementModel,
  RequirementModelDraft,
  RequirementModelIdentity,
} from '../../models/RequirementModel'
import { createRequirementModelClientId } from '../../utils/editorDraftStorage'
import { MarkdownEditor, MarkdownRenderer } from '../Markdown'
import './RequirementOverview.css'

const CUSTOM_TYPE_KEY = '__custom__'

const PRESET_REQ_TYPES = [
  { value: '部件级', label: '部件级' },
  { value: '系统级', label: '系统级' },
  { value: 'UI级', label: 'UI级' },
  { value: CUSTOM_TYPE_KEY, label: '自定义...' },
]

const isPresetReqType = (value?: string) =>
    !value || PRESET_REQ_TYPES.some(option => option.value === value)

interface RequirementOverviewProps {
  requirement: Requirement | null
  versions: RequirementVersion[]
  projectKey: string
  onSectionClick?: (sectionKey: SectionKey, sectionLabel: string) => void
  readOnly?: boolean
  models?: RequirementModel[]
  modelDrafts?: RequirementModelDraft[]
  modelsLoading?: boolean
  modelsError?: string | null
  busyModelIdentities?: Set<string>
  busyDimensions?: Set<RequirementDimensionCode>
  onRetryModels?: () => void
  onCreateModelDraft?: (draft: RequirementModelDraft) => void
  onUpdateModelMetadata?: (identity: RequirementModelIdentity, value: RequirementModelMetadataValue) => Promise<void>
  onOpenModel?: (identity: RequirementModelIdentity, sectionKey: SectionKey) => void
  onSetPrimaryModel?: (identity: RequirementModelIdentity) => Promise<void>
  onDeleteModel?: (identity: RequirementModelIdentity) => Promise<void>
}

interface OverviewEditForm {
  name: string
  req_type: string
  nl_text: string
}

const emptyEditForm: OverviewEditForm = {
  name: '',
  req_type: '',
  nl_text: '',
}

const createEditForm = (requirement: Requirement): OverviewEditForm => ({
  name: requirement.name || '',
  req_type: requirement.type || '',
  nl_text: requirement.nl_text || '',
})

function RequirementOverview({
  requirement,
  versions,
  projectKey,
  onSectionClick,
  readOnly = false,
  models,
  modelDrafts = [],
  modelsLoading = false,
  modelsError = null,
  busyModelIdentities = new Set(),
  busyDimensions = new Set(),
  onRetryModels,
  onCreateModelDraft,
  onUpdateModelMetadata,
  onOpenModel,
  onSetPrimaryModel,
  onDeleteModel,
}: RequirementOverviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localRequirement, setLocalRequirement] = useState<Requirement | null>(requirement)
  const [editForm, setEditForm] = useState<OverviewEditForm>(() =>
    requirement ? createEditForm(requirement) : emptyEditForm
  )
  const [isCustomType, setIsCustomType] = useState(() =>
    requirement ? !isPresetReqType(requirement.type) : false
  )
  const previousRequirementIdRef = useRef<string | null>(requirement?.id ?? null)
  const [metadataModal, setMetadataModal] = useState<{
    mode: 'create' | 'edit'
    value: RequirementModelMetadataValue
  } | null>(null)

  useEffect(() => {
    const requirementId = requirement?.id ?? null
    if (previousRequirementIdRef.current !== requirementId) {
      previousRequirementIdRef.current = requirementId
      setLocalRequirement(requirement)
      setEditForm(requirement ? createEditForm(requirement) : emptyEditForm)
      setIsEditing(false)
      setIsCustomType(requirement ? !isPresetReqType(requirement.type) : false)
      return
    }

    if (isEditing) return
    setLocalRequirement(requirement)
    setEditForm(requirement ? createEditForm(requirement) : emptyEditForm)
    setIsCustomType(requirement ? !isPresetReqType(requirement.type) : false)
  }, [requirement, isEditing])

  const displayRequirement = localRequirement || requirement
  const sections = readOnly
    ? getLegacySnapshotSections(isEditing ? editForm.req_type : displayRequirement?.type)
    : getRequirementSections()
  const allModels = useMemo(() => [...(models ?? []), ...modelDrafts], [modelDrafts, models])
  const hasModelSource = models !== undefined
  const sectionTitle = readOnly && sections.length === 1 && sections[0].key === 'dialogMap'
    ? '会话图'
    : readOnly ? '五维模型' : '六维模型'
  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '-'

    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  // 获取当前版本号
  const currentVersion = versions.find((v) => v.id === displayRequirement?.current_version_id)

  // 处理 section 点击 - 通知父组件切换到编辑器视图
  const handleSectionClick = (sectionKey: SectionKey, sectionLabel: string) => {
    if (!displayRequirement) return
    if (onSectionClick) {
      onSectionClick(sectionKey, sectionLabel)
    }
  }

  // 检查 section 是否有数据
  const hasSectionData = (field: keyof Requirement) => {
    if (!displayRequirement) return false
    const data = displayRequirement[field]
    return data !== undefined && data !== null
  }

  const isSectionDefined = (section: (typeof sections)[number]) => {
    if (section.key === 'dialogMap') {
      return false
    }

    const field = section.dslField || section.graphField
    return field ? hasSectionData(field) : false
  }

  const getModelIdentity = (model: RequirementModel | RequirementModelDraft): RequirementModelIdentity => (
    'clientId' in model
      ? { kind: 'draft', clientId: model.clientId }
      : { kind: 'persisted', modelGroupId: model.model_group_id }
  )

  const getIdentityKey = (identity: RequirementModelIdentity) => (
    identity.kind === 'persisted' ? identity.modelGroupId : identity.clientId
  )

  const modelItems: DimensionListModelItem[] | undefined = hasModelSource
    ? allModels.map(model => {
      const identity = getModelIdentity(model)
      const hasPrimaryDraft = modelDrafts.some(candidate => (
        candidate.dimension_code === model.dimension_code && candidate.is_primary
      ))
      return {
        identity: getIdentityKey(identity),
        dimensionCode: model.dimension_code,
        name: model.name,
        modelType: model.model_type ?? null,
        modelKey: model.model_key,
        isPrimary: Boolean(model.is_primary) && ('clientId' in model || !hasPrimaryDraft),
        disabled: busyModelIdentities.has(getIdentityKey(identity)) || busyDimensions.has(model.dimension_code),
        pending: identity.kind === 'draft',
      }
    })
    : undefined

  const findModelByItem = (item: DimensionListModelItem) => (
    allModels.find(model => getIdentityKey(getModelIdentity(model)) === item.identity)
  )

  const createDefaultModelValue = (dimensionCode: RequirementDimensionCode): RequirementModelMetadataValue => {
    const dimensionModels = allModels.filter(model => model.dimension_code === dimensionCode)
    const usedKeys = new Set(dimensionModels.map(model => model.model_key))
    const dimensionLabel = sections.find(section => section.dimensionCode === dimensionCode)?.label ?? dimensionCode
    let sequence = dimensionModels.length + 1
    while (usedKeys.has(`${dimensionCode.toLowerCase()}-${sequence}`)) sequence += 1
    const ibdModels = allModels.filter((model): model is RequirementModel => (
      model.dimension_code === 'IBD' && !('clientId' in model)
    ))

    return {
      dimensionCode,
      name: `${dimensionLabel} ${sequence}`,
      modelType: null,
      modelKey: `${dimensionCode.toLowerCase()}-${sequence}`,
      isPrimary: dimensionModels.length === 0,
      contextModelGroupId: ibdModels.length === 1 ? ibdModels[0].model_group_id : null,
    }
  }

  const handleAddModel = (dimensionCode: RequirementDimensionCode) => {
    if ((dimensionCode === 'ESD' || dimensionCode === 'ISD') && !allModels.some(model => model.dimension_code === 'IBD' && !('clientId' in model))) {
      message.error('请先创建并保存 IBD 模型')
      return
    }
    setMetadataModal({ mode: 'create', value: createDefaultModelValue(dimensionCode) })
  }

  const handleEditModel = (item: DimensionListModelItem) => {
    const model = findModelByItem(item)
    if (!model) return
    const identity = getModelIdentity(model)
    setMetadataModal({
      mode: 'edit',
      value: {
        identity: getIdentityKey(identity),
        dimensionCode: model.dimension_code,
        name: model.name,
        modelType: model.model_type ?? null,
        modelKey: model.model_key,
        isPrimary: Boolean(model.is_primary),
        contextModelGroupId: model.context_model_group_id ?? null,
      },
    })
  }

  const handleMetadataSubmit = async (value: RequirementModelMetadataValue) => {
    if (metadataModal?.mode === 'create') {
      const draft: RequirementModelDraft = {
        clientId: createRequirementModelClientId(),
        dimension_code: value.dimensionCode,
        model_type: value.modelType,
        name: value.name,
        model_key: value.modelKey,
        dsl_text: '',
        graph_json: {},
        context_model_group_id: value.contextModelGroupId,
        is_primary: value.isPrimary,
        sort_order: allModels.filter(model => model.dimension_code === value.dimensionCode).length,
      }
      onCreateModelDraft?.(draft)
      setMetadataModal(null)
      onOpenModel?.({ kind: 'draft', clientId: draft.clientId }, DIMENSION_CODE_TO_SECTION[value.dimensionCode])
      return
    }

    const model = allModels.find(item => getIdentityKey(getModelIdentity(item)) === value.identity)
    if (!model) throw new Error('模型已不存在，请刷新后重试')
    await onUpdateModelMetadata?.(getModelIdentity(model), value)
    setMetadataModal(null)
  }

  const handleDeleteModel = (item: DimensionListModelItem) => {
    const model = findModelByItem(item)
    if (!model) return
    const dependants = model.dimension_code === 'IBD'
      ? allModels.filter(candidate => candidate.context_model_group_id === ('clientId' in model ? model.clientId : model.model_group_id))
      : []
    const primaryText = model.is_primary
      ? '这是当前主模型；删除后服务端会选择剩余模型中的新主模型，若无剩余模型则清空该维度。'
      : ''
    const dependencyText = dependants.length
      ? `以下模型引用它：${dependants.map(candidate => candidate.name).join('、')}。`
      : ''

    Modal.confirm({
      title: `删除 ${model.dimension_code} 模型`,
      content: `确定删除“${model.name}”吗？${primaryText}${dependencyText}`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => onDeleteModel?.(getModelIdentity(model)),
    })
  }

  const handleEdit = () => {
    if (!displayRequirement || readOnly) return
    const form = createEditForm(displayRequirement)
    setEditForm(form)
    setIsCustomType(!isPresetReqType(form.req_type))
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    const form = displayRequirement ? createEditForm(displayRequirement) : emptyEditForm
    setEditForm(form)
    setIsCustomType(!isPresetReqType(form.req_type))
    setIsEditing(false)
  }

  const handleFieldChange = (field: keyof OverviewEditForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!displayRequirement || readOnly) return

    const name = editForm.name.trim()
    const reqType = editForm.req_type.trim()
    const nlText = editForm.nl_text.trim()

    if (!name) {
      message.error('请输入需求名称')
      return
    }
    if (!nlText) {
      message.error('请输入需求描述')
      return
    }

    setSaving(true)
    try {
      const response = await authFetch(API_ENDPOINTS.requirementById(displayRequirement.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          req_type: reqType,
          nl_text: nlText,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || '保存失败')
      }

      setLocalRequirement(prev => {
        const base = prev || displayRequirement
        return {
          ...base,
          name,
          type: reqType,
          nl_text: nlText,
          updated_at: new Date().toISOString(),
        }
      })
      setIsEditing(false)
      message.success('保存成功')
    } catch (error: any) {
      console.error('Requirement overview save error:', error)
      message.error(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!displayRequirement) {
    return (
      <div className="requirement-overview">
        <div className="overview-empty">
          <div className="empty-icon">📋</div>
          <h3>请选择一个需求</h3>
          <p>从左侧列表中选择需求以查看详情</p>
        </div>
      </div>
    )
  }

  return (
    <div className="requirement-overview">
      <div className="overview-header">
        <div className="overview-title-row">
          <h2>需求概览</h2>
          <div className="overview-header-actions">
            <span className="overview-badge">项目: {projectKey}</span>
            {readOnly ? null : isEditing ? (
              <>
                <Button size="small" icon={<CloseOutlined />} onClick={handleCancelEdit} disabled={saving}>
                  取消
                </Button>
                <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                  保存
                </Button>
              </>
            ) : (
              <Button size="small" icon={<EditOutlined />} onClick={handleEdit}>
                编辑
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="overview-content">
        {/* 基本信息 */}
        <div className="overview-section">
          <div className="section-header">
            <span className="section-title">基本信息</span>
            {currentVersion && (
              <span className="version-badge">v{currentVersion.version_number}</span>
            )}
          </div>

          <div className="info-grid">
            <div className="info-item">
              <label>需求 ID</label>
              <span className="info-value">{displayRequirement.id}</span>
            </div>
            <div className="info-item">
              <label>需求名称</label>
              {isEditing ? (
                <Input
                  value={editForm.name}
                  onChange={(event) => handleFieldChange('name', event.target.value)}
                  placeholder="请输入需求名称"
                />
              ) : (
                <span className="info-value">{displayRequirement.name || '-'}</span>
              )}
            </div>
            <div className="info-item">
              <label>需求类型</label>
              {isEditing ? (
                isCustomType ? (
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={editForm.req_type}
                      onChange={(event) => handleFieldChange('req_type', event.target.value)}
                      placeholder="请输入自定义需求类型"
                      autoFocus
                    />
                    <Button
                      icon={<CloseOutlined />}
                      onClick={() => {
                        setIsCustomType(false)
                        handleFieldChange('req_type', '')
                      }}
                      title="返回选择"
                    />
                  </Space.Compact>
                ) : (
                  <Select
                    style={{ width: '100%' }}
                    placeholder="请选择需求类型"
                    allowClear
                    options={PRESET_REQ_TYPES}
                    value={editForm.req_type || undefined}
                    onChange={(val: string | undefined) => {
                      if (val === CUSTOM_TYPE_KEY) {
                        setIsCustomType(true)
                        handleFieldChange('req_type', '')
                      } else {
                        handleFieldChange('req_type', val ?? '')
                      }
                    }}
                    onClear={() => {
                      handleFieldChange('req_type', '')
                    }}
                  />
                )
              ) : (
                <span className="info-value">{displayRequirement.type || '-'}</span>
              )}
            </div>
            <div className="info-item">
              <label>创建者</label>
              <span className="info-value">{displayRequirement.created_by}</span>
            </div>
            <div className="info-item">
              <label>创建时间</label>
              <span className="info-value">{formatDate(displayRequirement.created_at)}</span>
            </div>
            <div className="info-item">
              <label>更新时间</label>
              <span className="info-value">{formatDate(displayRequirement.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* 条目化需求文档 */}
        <div className="overview-section">
          <div className="section-header">
            <span className="section-title">条目化需求文档</span>
          </div>
          {isEditing ? (
            <MarkdownEditor
              value={editForm.nl_text}
              onChange={(value) => handleFieldChange('nl_text', value)}
              placeholder="请输入 Markdown 需求描述"
            />
          ) : displayRequirement.nl_text ? (
            <div className="text-content">
              <MarkdownRenderer
                key={displayRequirement.id}
                value={displayRequirement.nl_text}
              />
            </div>
          ) : (
            <div className="text-content">
              <span className="text-placeholder">暂无描述</span>
            </div>
          )}
        </div>

        {/* 六维模型列表 */}
        <div className="overview-section">
          <div className="section-header">
            <span className="section-title">{sectionTitle}</span>
          </div>
          <DimensionList
            sections={sections}
            isSectionDefined={isSectionDefined}
            onSectionClick={(section) => handleSectionClick(section.key, section.label)}
            models={modelItems}
            editable={!readOnly && hasModelSource}
            loading={modelsLoading}
            error={modelsError}
            onRetry={onRetryModels}
            isSectionDisabled={(section) => busyDimensions.has(section.dimensionCode as RequirementDimensionCode)}
            onAddModel={(section) => handleAddModel(section.dimensionCode as RequirementDimensionCode)}
            onOpenModel={(item, section) => {
              const model = findModelByItem(item)
              if (model) onOpenModel?.(getModelIdentity(model), section.key)
            }}
            onEditModel={handleEditModel}
            onDeleteModel={handleDeleteModel}
            onSetPrimary={(item) => {
              const model = findModelByItem(item)
              if (model && !model.is_primary) {
                void onSetPrimaryModel?.(getModelIdentity(model))
              }
            }}
          />
        </div>

        {/* 版本历史摘要 */}
        {versions.length > 0 && (
          <div className="overview-section">
            <div className="section-header">
              <span className="section-title">版本历史</span>
              <span className="version-count">{versions.length} 个版本</span>
            </div>
            <div className="version-timeline">
              {versions.slice(0, 3).map((version, index) => (
                <div key={version.id} className={`timeline-item ${index === 0 ? 'current' : ''}`}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-version">v{version.version_number}</span>
                      <span className="timeline-date">{formatDate(version.created_at)}</span>
                    </div>
                    <div className="timeline-author">由 {version.created_by} 创建</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {metadataModal && (
        <RequirementModelMetadataModal
          open
          title={metadataModal.mode === 'create' ? '新增模型' : '编辑模型信息'}
          initialValue={metadataModal.value}
          existingKeys={allModels
            .filter(model => model.dimension_code === metadataModal.value.dimensionCode)
            .map(model => ({
              identity: getIdentityKey(getModelIdentity(model)),
              modelKey: model.model_key,
            }))}
          contextOptions={allModels
            .filter((model): model is RequirementModel => model.dimension_code === 'IBD' && !('clientId' in model))
            .map(model => ({
              value: model.model_group_id,
              label: model.name,
              modelKey: model.model_key,
            }))}
          allowPrimaryToggle={metadataModal.mode === 'create'
            || Boolean(metadataModal.value.identity
              && modelDrafts.some(model => model.clientId === metadataModal.value.identity))}
          onCancel={() => setMetadataModal(null)}
          onSubmit={handleMetadataSubmit}
        />
      )}
    </div>
  )
}

export default RequirementOverview
export type { SectionKey }
