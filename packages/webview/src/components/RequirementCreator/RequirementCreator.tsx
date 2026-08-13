import { useMemo, useState } from 'react'
import { message, Modal, Select, Tabs } from 'antd'
import { FormOutlined } from '@ant-design/icons'
import { API_ENDPOINTS, authFetch } from '../../config/api'
import {
  clearDimensionEditorDraft,
  createRequirementModelClientId,
  getDraftUserId,
  normalizeCreateRequirementFormData,
  type CreateRequirementFormData,
} from '../../utils/editorDraftStorage'
import DimensionList from '../DimensionList'
import type { DimensionListModelItem } from '../DimensionList/DimensionList'
import type { SectionKey } from '../DimensionEditor/types'
import { DIMENSION_CODE_TO_SECTION } from '../DimensionEditor/dimensionEditorConfig'
import { getRequirementSections } from '../DimensionList/requirementSections'
import MarkdownEditor from '../Markdown/MarkdownEditor'
import RequirementModelMetadataModal, {
  type RequirementModelMetadataValue,
} from '../RequirementModelMetadataModal'
import type { RequirementDimensionCode, RequirementModelDraft } from '../../models/RequirementModel'
import './RequirementCreator.css'

const CUSTOM_TYPE_KEY = '__custom__'

const PRESET_REQ_TYPES = [
  { value: '部件级', label: '部件级' },
  { value: '系统级', label: '系统级' },
  { value: 'UI级', label: 'UI级' },
  { value: CUSTOM_TYPE_KEY, label: '自定义...' },
]

const isPresetReqType = (value?: string) => (
  !value || PRESET_REQ_TYPES.some(option => option.value === value)
)

const hasGraphContent = (value: object) => Object.keys(value).length > 0

interface RequirementCreatorProps {
  projectKey?: string
  draftProjectScope?: string
  formData?: CreateRequirementFormData
  onChange?: (data: CreateRequirementFormData) => void
  onModelOpen?: (sectionKey: SectionKey, clientId?: string) => void
  onCancel?: () => void
  onSuccess?: () => void
}

function RequirementCreator({
  projectKey,
  draftProjectScope,
  formData,
  onChange,
  onModelOpen,
  onCancel,
  onSuccess,
}: RequirementCreatorProps) {
  const [activeTab, setActiveTab] = useState('manual')
  const [isCustomType, setIsCustomType] = useState(() => !isPresetReqType(formData?.req_type))
  const [localFormData, setLocalFormData] = useState<CreateRequirementFormData>(() => (
    normalizeCreateRequirementFormData(null)
  ))
  const [metadataModal, setMetadataModal] = useState<{
    mode: 'create' | 'edit'
    value: RequirementModelMetadataValue
  } | null>(null)

  const currentFormData = formData || localFormData
  const sections = getRequirementSections()
  const sectionTitle = '六维模型定义'
  const dimensionModels = currentFormData.dimensionModels

  const updateFormData = (newData: CreateRequirementFormData) => {
    if (onChange) onChange(newData)
    else setLocalFormData(newData)
  }

  const updateDimensionModels = (updater: (models: RequirementModelDraft[]) => RequirementModelDraft[]) => {
    updateFormData({
      ...currentFormData,
      dimensionModels: updater(dimensionModels),
    })
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    updateFormData({ ...currentFormData, [name]: value })
  }

  const createDefaultModelValue = (dimensionCode: RequirementDimensionCode): RequirementModelMetadataValue => {
    const models = dimensionModels.filter(model => model.dimension_code === dimensionCode)
    const usedKeys = new Set(models.map(model => model.model_key))
    const dimensionLabel = sections.find(section => section.dimensionCode === dimensionCode)?.label ?? dimensionCode
    let sequence = models.length + 1
    while (usedKeys.has(`${dimensionCode.toLowerCase()}-${sequence}`)) sequence += 1

    return {
      dimensionCode,
      name: `${dimensionLabel} ${sequence}`,
      modelType: null,
      modelKey: `${dimensionCode.toLowerCase()}-${sequence}`,
      isPrimary: models.length === 0,
      contextModelGroupId: null,
    }
  }

  const handleAddModel = (dimensionCode: RequirementDimensionCode) => {
    if ((dimensionCode === 'ESD' || dimensionCode === 'ISD')
      && !dimensionModels.some(model => model.dimension_code === 'IBD')) {
      message.error('请先创建 IBD 模型')
      return
    }
    setMetadataModal({ mode: 'create', value: createDefaultModelValue(dimensionCode) })
  }

  const handleMetadataSubmit = async (value: RequirementModelMetadataValue) => {
    if (metadataModal?.mode === 'create') {
      const clientId = createRequirementModelClientId()
      const sameDimension = dimensionModels.filter(model => model.dimension_code === value.dimensionCode)
      const draft: RequirementModelDraft = {
        clientId,
        dimension_code: value.dimensionCode,
        model_type: value.modelType,
        name: value.name,
        model_key: value.modelKey,
        dsl_text: '',
        graph_json: {},
        context_model_group_id: null,
        is_primary: sameDimension.length === 0 ? true : value.isPrimary,
        sort_order: sameDimension.length,
      }
      updateDimensionModels(models => {
        const next = value.isPrimary
          ? models.map(model => model.dimension_code === value.dimensionCode
            ? { ...model, is_primary: false }
            : model)
          : models
        return [...next, draft]
      })
      setMetadataModal(null)
      onModelOpen?.(DIMENSION_CODE_TO_SECTION[value.dimensionCode], clientId)
      return
    }

    if (!value.identity) throw new Error('模型草稿已不存在')
    const target = dimensionModels.find(model => model.clientId === value.identity)
    if (!target) throw new Error('模型草稿已不存在')
    const mustRemainPrimary = Boolean(target.is_primary)
      && !dimensionModels.some(model => (
        model.clientId !== target.clientId
        && model.dimension_code === target.dimension_code
        && model.is_primary
      ))
    const nextIsPrimary = mustRemainPrimary ? true : value.isPrimary
    updateDimensionModels(models => models.map(model => {
      if (model.clientId === value.identity) {
        return {
          ...model,
          name: value.name,
          model_type: value.modelType,
          model_key: value.modelKey,
          is_primary: nextIsPrimary,
        }
      }
      if (nextIsPrimary && model.dimension_code === value.dimensionCode) {
        return { ...model, is_primary: false }
      }
      return model
    }))
    setMetadataModal(null)
  }

  const modelItems = useMemo<DimensionListModelItem[]>(() => dimensionModels.map(model => ({
    identity: model.clientId,
    dimensionCode: model.dimension_code,
    name: model.name,
    modelType: model.model_type ?? null,
    modelKey: model.model_key,
    isPrimary: Boolean(model.is_primary),
    pending: true,
  })), [dimensionModels])

  const handleDeleteModel = (clientId: string) => {
    const target = dimensionModels.find(model => model.clientId === clientId)
    if (!target) return
    Modal.confirm({
      title: `删除 ${target.dimension_code} 模型草稿`,
      content: `确定删除“${target.name}”及其尚未提交的编辑内容吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        if (draftProjectScope) {
          clearDimensionEditorDraft(
            draftProjectScope,
            getDraftUserId(),
            'NEW',
            DIMENSION_CODE_TO_SECTION[target.dimension_code],
            target.clientId,
          )
        }
        updateDimensionModels(models => {
          const remaining = models.filter(model => model.clientId !== clientId)
          if (!target.is_primary) return remaining
          const firstRemaining = remaining.find(model => model.dimension_code === target.dimension_code)
          if (!firstRemaining) return remaining
          return remaining.map(model => model.clientId === firstRemaining.clientId
            ? { ...model, is_primary: true }
            : model)
        })
      },
    })
  }

  const validateModels = () => {
    const dimensionCodes: RequirementDimensionCode[] = ['IBD', 'ESD', 'BDD', 'ISD', 'SC', 'UI']
    for (const dimensionCode of dimensionCodes) {
      const models = dimensionModels.filter(model => model.dimension_code === dimensionCode)
      const keys = new Set<string>()
      for (const model of models) {
        if (!model.name.trim()) return `${dimensionCode} 模型名称不能为空`
        if (!model.model_key.trim()) return `${dimensionCode} 模型“${model.name}”的业务键不能为空`
        if (keys.has(model.model_key.trim())) return `${dimensionCode} 模型业务键不能重复`
        keys.add(model.model_key.trim())
        if (!model.dsl_text.trim() && !hasGraphContent(model.graph_json)) {
          return `${dimensionCode} 模型“${model.name}”尚未填写 DSL 或图`
        }
      }
      if (models.length && models.filter(model => model.is_primary).length !== 1) {
        return `${dimensionCode} 必须且只能选择一个主模型`
      }
    }

    const requiresIbd = dimensionModels.some(model => model.dimension_code === 'ESD' || model.dimension_code === 'ISD')
    const primaryIbd = dimensionModels.find(model => model.dimension_code === 'IBD' && model.is_primary)
    if (requiresIbd && !primaryIbd) return '创建 ESD/ISD 前必须准备一张主 IBD 模型'
    return null
  }

  const handleSubmit = async () => {
    const name = currentFormData.name.trim()
    const nlText = currentFormData.nl_text.trim()
    if (!projectKey) return void message.error('项目标识尚未加载，请稍后重试')
    if (!name) return void message.error('请输入需求名称')
    if (!nlText) return void message.error('请输入需求描述')

    const modelError = validateModels()
    if (modelError) return void message.error(modelError)

    try {
      const dimension_models = dimensionModels.map(model => ({
        dimension_code: model.dimension_code,
        model_type: model.model_type?.trim() || null,
        name: model.name.trim(),
        model_key: model.model_key.trim(),
        dsl_text: model.dsl_text || null,
        graph_json: hasGraphContent(model.graph_json) ? model.graph_json : null,
        is_primary: Boolean(model.is_primary),
        sort_order: model.sort_order,
      }))
      const response = await authFetch(API_ENDPOINTS.requirements, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: projectKey,
          name,
          req_type: currentFormData.req_type.trim() || undefined,
          nl_text: nlText,
          dimension_models,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || '创建失败')
      }
      message.success('需求项创建成功')
      onSuccess?.()
    } catch (error) {
      console.error('Creation error:', error)
      message.error(error instanceof Error ? error.message : '创建需求失败')
    }
  }

  return (
    <div className="requirement-creator">
      <div className="creator-header">
        <div className="creator-title-row">
          <h2>新建需求</h2>
          <span className="creator-badge">Project: {projectKey}</span>
        </div>
      </div>
      <div className="creator-tabs-container">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[{ key: 'manual', label: <span><FormOutlined /> 条目创建</span> }]}
          className="creator-tabs"
          tabBarStyle={{ marginBottom: 0, paddingLeft: 24 }}
        />
      </div>
      <div className="creator-content">
        <div className="creator-section">
          <div className="section-header"><span className="section-title">需求名称 <span style={{ color: '#ef4444' }}>*</span></span></div>
          <div className="form-group">
            <input type="text" name="name" className="form-input" placeholder="请输入需求名称" value={currentFormData.name} onChange={handleChange} />
          </div>
        </div>
        <div className="creator-section">
          <div className="section-header"><span className="section-title">需求类型</span></div>
          <div className="form-group">
            {isCustomType ? (
              <div className="req-type-custom-row">
                <input type="text" name="req_type" className="form-input" placeholder="请输入自定义需求类型" value={currentFormData.req_type} onChange={handleChange} autoFocus />
                <button type="button" className="req-type-back-btn" onClick={() => { setIsCustomType(false); updateFormData({ ...currentFormData, req_type: '' }) }} title="返回选择">✕</button>
              </div>
            ) : (
              <Select
                style={{ width: '100%' }}
                placeholder="请选择需求类型"
                allowClear
                options={PRESET_REQ_TYPES}
                value={currentFormData.req_type || undefined}
                onChange={(nextValue: string | undefined) => {
                  if (nextValue === CUSTOM_TYPE_KEY) {
                    setIsCustomType(true)
                    updateFormData({ ...currentFormData, req_type: '' })
                  } else updateFormData({ ...currentFormData, req_type: nextValue ?? '' })
                }}
              />
            )}
          </div>
        </div>
        <div className="creator-section">
          <div className="section-header"><span className="section-title">自然语言描述 (NL)</span></div>
          <div className="form-group">
            <MarkdownEditor
              value={currentFormData.nl_text}
              onChange={(value) => updateFormData({ ...currentFormData, nl_text: value })}
              placeholder="请输入 Markdown 需求描述"
            />
          </div>
        </div>
        <div className="creator-section">
          <div className="section-header"><span className="section-title">{sectionTitle}</span></div>
          <DimensionList
            sections={sections}
            isSectionDefined={(section) => dimensionModels.some(model => model.dimension_code === section.dimensionCode)}
            models={modelItems}
            editable
            onAddModel={(section) => handleAddModel(section.dimensionCode as RequirementDimensionCode)}
            onOpenModel={(item, section) => onModelOpen?.(section.key, item.identity)}
            onEditModel={(item) => {
              const model = dimensionModels.find(candidate => candidate.clientId === item.identity)
              if (!model) return
              setMetadataModal({
                mode: 'edit',
                value: {
                  identity: model.clientId,
                  dimensionCode: model.dimension_code,
                  name: model.name,
                  modelType: model.model_type ?? null,
                  modelKey: model.model_key,
                  isPrimary: Boolean(model.is_primary),
                  contextModelGroupId: null,
                },
              })
            }}
            onDeleteModel={(item) => handleDeleteModel(item.identity)}
            onSetPrimary={(item) => updateDimensionModels(models => models.map(model => (
              model.dimension_code === item.dimensionCode
                ? { ...model, is_primary: model.clientId === item.identity }
                : model
            )))}
          />
        </div>
      </div>
      <div className="creator-footer">
        <button type="button" className="btn-cancel" onClick={onCancel}>取消</button>
        <button type="button" className="btn-submit" onClick={() => void handleSubmit()}>创建需求</button>
      </div>
      {metadataModal && (
        <RequirementModelMetadataModal
          open
          title={metadataModal.mode === 'create' ? '新增模型' : '编辑模型信息'}
          initialValue={metadataModal.value}
          existingKeys={dimensionModels
            .filter(model => model.dimension_code === metadataModal.value.dimensionCode)
            .map(model => ({ identity: model.clientId, modelKey: model.model_key }))}
          creationMode
          allowPrimaryToggle
          onCancel={() => setMetadataModal(null)}
          onSubmit={handleMetadataSubmit}
        />
      )}
    </div>
  )
}

export default RequirementCreator
