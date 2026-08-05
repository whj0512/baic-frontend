import { useState } from 'react'
import { Button, Tooltip } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RightOutlined,
} from '@ant-design/icons'
import './DimensionList.css'

export interface DimensionListSection<Key extends string = string> {
  key: Key
  dimensionCode: string
  label: string
  desc: string
}

export interface DimensionListModelItem {
  identity: string
  dimensionCode: string
  name: string
  modelType: string | null
  modelKey: string
  isPrimary: boolean
  disabled?: boolean
  pending?: boolean
}

export interface DimensionListProps<Section extends DimensionListSection = DimensionListSection> {
  sections: Section[]
  isSectionDefined: (section: Section) => boolean
  isSectionDisabled?: (section: Section) => boolean
  onSectionClick?: (section: Section) => void
  models?: DimensionListModelItem[]
  editable?: boolean
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onAddModel?: (section: Section) => void
  onOpenModel?: (model: DimensionListModelItem, section: Section) => void
  onEditModel?: (model: DimensionListModelItem, section: Section) => void
  onDeleteModel?: (model: DimensionListModelItem, section: Section) => void
  onSetPrimary?: (model: DimensionListModelItem, section: Section) => void
}

function DimensionList<Section extends DimensionListSection = DimensionListSection>({
  sections,
  isSectionDefined,
  isSectionDisabled,
  onSectionClick,
  models,
  editable = false,
  loading = false,
  error,
  onRetry,
  onAddModel,
  onOpenModel,
  onEditModel,
  onDeleteModel,
  onSetPrimary,
}: DimensionListProps<Section>) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set())
  const hasModelList = models !== undefined

  const toggleSection = (section: Section, disabled: boolean) => {
    if (disabled) return
    if (!hasModelList) {
      onSectionClick?.(section)
      return
    }

    setExpandedSections(previous => {
      const next = new Set(previous)
      if (next.has(section.key)) next.delete(section.key)
      else next.add(section.key)
      return next
    })
  }

  return (
    <div className="dimension-list">
      {error && (
        <div className="dimension-list-feedback dimension-list-feedback--error" role="alert">
          <span>{error}</span>
          {onRetry && <Button size="small" onClick={onRetry}>重试</Button>}
        </div>
      )}
      {loading && (
        <div className="dimension-list-feedback" role="status">正在加载模型…</div>
      )}
      {sections.map((section) => {
        const sectionModels = models?.filter(model => model.dimensionCode === section.dimensionCode) ?? []
        const defined = hasModelList ? sectionModels.length > 0 : isSectionDefined(section)
        const disabled = isSectionDisabled?.(section) ?? false
        const expanded = hasModelList && expandedSections.has(section.key)
        const regionId = `dimension-models-${section.key}`

        return (
          <div key={section.key} className="dimension-group">
            <div className={`dimension-item${disabled ? ' dimension-item--disabled' : ''}`}>
              <button
                type="button"
                className="dimension-item-main"
                disabled={disabled}
                aria-expanded={hasModelList ? expanded : undefined}
                aria-controls={hasModelList ? regionId : undefined}
                onClick={() => toggleSection(section, disabled)}
              >
                <span className={`dimension-arrow${expanded ? ' dimension-arrow--expanded' : ''}`} aria-hidden="true">
                  <RightOutlined />
                </span>
                <span className={`dimension-tag tag-${section.dimensionCode}`}>{section.dimensionCode}</span>
                <span className="dimension-label">{section.label}</span>
                <Tooltip title={section.desc} placement="top">
                  <span
                    role="button"
                    tabIndex={0}
                    className="dimension-help-button"
                    aria-label={`${section.label}定义说明`}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <QuestionCircleOutlined />
                  </span>
                </Tooltip>
              </button>
              <div className="dimension-item-right">
                {hasModelList && <span className="dimension-model-count">{sectionModels.length} 个模型</span>}
                <span className={`dimension-status ${defined ? 'has-data' : 'no-data'}`}>
                  {defined ? '已定义' : '未定义'}
                </span>
                {hasModelList && editable && (
                  <Button
                    size="small"
                    type="text"
                    icon={<PlusOutlined />}
                    disabled={disabled}
                    onClick={() => onAddModel?.(section)}
                  >
                    新增模型
                  </Button>
                )}
              </div>
            </div>

            {hasModelList && expanded && (
              <div id={regionId} className="dimension-model-list">
                {sectionModels.length === 0 ? (
                  <div className="dimension-model-empty">暂无模型</div>
                ) : sectionModels.map(model => (
                  <div key={model.identity} className={`dimension-model-row${model.disabled ? ' dimension-model-row--disabled' : ''}`}>
                    <label className="dimension-model-primary-control">
                      <input
                        type="radio"
                        name={`dimension-primary-${section.dimensionCode}`}
                        checked={model.isPrimary}
                        disabled={!editable || model.disabled}
                        onChange={() => onSetPrimary?.(model, section)}
                      />
                      <span className="sr-only">将 {model.name} 设为主模型</span>
                    </label>
                    <div className="dimension-model-summary">
                      <Tooltip title={model.name}>
                        <strong className="dimension-model-name">{model.name}</strong>
                      </Tooltip>
                      <div className="dimension-model-meta">
                        <span>{model.modelType || '未设置类型'}</span>
                        <Tooltip title={model.modelKey}>
                          <code>{model.modelKey}</code>
                        </Tooltip>
                        {model.isPrimary && <span className="dimension-primary-badge">主模型</span>}
                        {model.pending && <span className="dimension-draft-badge">未保存</span>}
                      </div>
                    </div>
                    <div className="dimension-model-actions">
                      {editable && (
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          disabled={model.disabled}
                          onClick={() => onEditModel?.(model, section)}
                        >
                          编辑信息
                        </Button>
                      )}
                      <Button
                        size="small"
                        disabled={model.disabled}
                        onClick={() => onOpenModel?.(model, section)}
                      >
                        打开
                      </Button>
                      {editable && (
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          disabled={model.disabled}
                          onClick={() => onDeleteModel?.(model, section)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default DimensionList
