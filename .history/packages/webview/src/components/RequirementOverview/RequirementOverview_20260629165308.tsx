import { useEffect, useRef, useState } from 'react'
import { Button, message, Select, Input, Space } from 'antd'
import { CloseOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import type { Requirement } from '../../models/Requirement'
import type { RequirementVersion } from '../../models/RequirementVersion'
import { API_ENDPOINTS, authFetch } from '../../config/api'
import DimensionList, { type DimensionListSection } from '../DimensionList'
import './RequirementOverview.css'

const CUSTOM_TYPE_KEY = '__custom__'

const PRESET_REQ_TYPES = [
  { value: '部件级', label: '部件级' },
  { value: '系统级', label: '系统级' },
  { value: CUSTOM_TYPE_KEY, label: '自定义...' },
]

const isPresetReqType = (value?: string) =>
    !value || PRESET_REQ_TYPES.some(option => option.value === value)

// 与 CreateRequirement.tsx 保持一致的 SectionKey
type SectionKey = 'environment' | 'interaction' | 'internalComposition' | 'moduleResponses' | 'internalConstraints'

interface RequirementOverviewProps {
  requirement: Requirement | null
  versions: RequirementVersion[]
  projectKey: string
  onSectionClick?: (sectionKey: SectionKey, sectionLabel: string) => void
}

type RequirementSection = DimensionListSection<SectionKey> & {
  graphField: keyof Requirement
  dslField: keyof Requirement
}

const SECTIONS: RequirementSection[] = [
  { key: 'environment', dimensionCode: 'IBD', label: '所处环境', desc: '对系统所属的环境组成进行刻画，描述外部存在的实体以及这些实体之间存在的交互。', graphField: 'graph_IBD', dslField: 'dsl_IBD' },
  { key: 'interaction', dimensionCode: 'ESD', label: '与环境交互', desc: '基于UML中顺序图的概念，通过实体之间的交互序列，来刻画系统和外部实体之间的交互场景。', graphField: 'graph_ESD', dslField: 'dsl_ESD' },
  { key: 'internalComposition', dimensionCode: 'BDD', label: '内部组成', desc: '描述系统内部模块、部件及其组成层级和静态结构关系。', graphField: 'graph_BDD', dslField: 'dsl_BDD' },
  { key: 'moduleResponses', dimensionCode: 'ISD', label: '组成模块间的响应', desc: '描述内部组成模块之间的响应、调用顺序和协作行为。', graphField: 'graph_ISD', dslField: 'dsl_ISD' },
  { key: 'internalConstraints', dimensionCode: 'SC', label: '内部约束', desc: '通过状态机对系统内部的约束/状态迁移进行刻画。', graphField: 'graph_SC', dslField: 'dsl_SC' },
]

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

function RequirementOverview({ requirement, versions, projectKey, onSectionClick }: RequirementOverviewProps) {
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
  const hasSectionData = (graphField: keyof Requirement) => {
    if (!displayRequirement) return false
    const data = displayRequirement[graphField]
    return data !== undefined && data !== null
  }

  const handleEdit = () => {
    if (!displayRequirement) return
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
    if (!displayRequirement) return

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
            {isEditing ? (
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

        {/* 自然语言描述 */}
        <div className="overview-section">
          <div className="section-header">
            <span className="section-title">自然语言描述 (NL)</span>
          </div>
          {isEditing ? (
            <Input.TextArea
              rows={4}
              value={editForm.nl_text}
              onChange={(event) => handleFieldChange('nl_text', event.target.value)}
              placeholder="请输入需求描述"
            />
          ) : (
            <div className="text-content">
              {displayRequirement.nl_text || <span className="text-placeholder">暂无描述</span>}
            </div>
          )}
        </div>

        {/* 五维模型列表 */}
        <div className="overview-section">
          <div className="section-header">
            <span className="section-title">五维模型</span>
          </div>
          <DimensionList
            sections={SECTIONS}
            isSectionDefined={(section) => hasSectionData(section.dslField || section.graphField)}
            onSectionClick={(section) => handleSectionClick(section.key, section.label)}
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
    </div>
  )
}

export default RequirementOverview
export type { SectionKey }
