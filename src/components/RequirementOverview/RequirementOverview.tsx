import type { Requirement } from '../../models/Requirement'
import type { RequirementVersion } from '../../models/RequirementVersion'
import './RequirementOverview.css'

// 与 CreateRequirement.tsx 保持一致的 SectionKey
type SectionKey = 'environment' | 'interaction' | 'internalComposition' | 'moduleResponses' | 'internalConstraints'

interface RequirementOverviewProps {
  requirement: Requirement | null
  versions: RequirementVersion[]
  projectKey: string
  onSectionClick?: (sectionKey: SectionKey, sectionLabel: string) => void
}

const SECTIONS: { key: SectionKey; dimensionCode: string; label: string; description: string; graphField: keyof Requirement }[] = [
  { key: 'environment', dimensionCode: 'IBD', label: '所处环境', description: '内部块图 - 系统所处的环境', graphField: 'graph_IBD' },
  { key: 'interaction', dimensionCode: 'ESD', label: '与环境交互', description: '外部顺序图 - 与环境的交互', graphField: 'graph_ESD' },
  { key: 'internalComposition', dimensionCode: 'BDD', label: '内部组成', description: '块定义图 - 内部组成', graphField: 'graph_BDD' },
  { key: 'moduleResponses', dimensionCode: 'ISD', label: '组成模块间的响应', description: '内部顺序图 - 组成模块的响应', graphField: 'graph_ISD' },
  { key: 'internalConstraints', dimensionCode: 'SC', label: '内部约束', description: '状态图 - 内部约束', graphField: 'graph_SC' },
]

function RequirementOverview({ requirement, versions, projectKey, onSectionClick }: RequirementOverviewProps) {
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

  // 获取当前版本号
  const currentVersion = versions.find((v) => v.id === requirement?.current_version_id)

  // 处理 section 点击 - 通知父组件切换到编辑器视图
  const handleSectionClick = (sectionKey: SectionKey, sectionLabel: string) => {
    if (!requirement) return
    if (onSectionClick) {
      onSectionClick(sectionKey, sectionLabel)
    }
  }

  // 检查 section 是否有数据
  const hasSectionData = (graphField: keyof Requirement) => {
    if (!requirement) return false
    const data = requirement[graphField]
    return data !== undefined && data !== null
  }

  if (!requirement) {
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
          <span className="overview-badge">项目: {projectKey}</span>
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
              <span className="info-value">{requirement.id}</span>
            </div>
            <div className="info-item">
              <label>创建者</label>
              <span className="info-value">{requirement.created_by}</span>
            </div>
            <div className="info-item">
              <label>创建时间</label>
              <span className="info-value">{formatDate(requirement.created_at)}</span>
            </div>
            <div className="info-item">
              <label>更新时间</label>
              <span className="info-value">{formatDate(requirement.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* 自然语言描述 */}
        <div className="overview-section">
          <div className="section-header">
            <span className="section-title">自然语言描述 (NL)</span>
          </div>
          <div className="text-content">
            {requirement.nl_text || <span className="text-placeholder">暂无描述</span>}
          </div>
        </div>

        {/* DSL 文本 */}
        <div className="overview-section">
          <div className="section-header">
            <span className="section-title">DSL 表示</span>
          </div>
          <div className="text-content dsl-content">
            {requirement.dsl_text || <span className="text-placeholder">暂无 DSL 定义</span>}
          </div>
        </div>

        {/* 五维模型列表 */}
        <div className="overview-section">
          <div className="section-header">
            <span className="section-title">五维模型</span>
          </div>
          <div className="dimension-list">
            {SECTIONS.map((section) => (
              <div
                key={section.key}
                className="dimension-item"
                onClick={() => handleSectionClick(section.key, section.label)}
              >
                <div className="dimension-item-left">
                  <span className={`dimension-tag tag-${section.dimensionCode}`}>{section.dimensionCode}</span>
                  <span className="dimension-label">{section.label}</span>
                </div>
                <div className="dimension-item-right">
                  {hasSectionData(section.graphField) ? (
                    <span className="dimension-status has-data">已定义</span>
                  ) : (
                    <span className="dimension-status no-data">未定义</span>
                  )}
                  <span className="dimension-arrow">›</span>
                </div>
              </div>
            ))}
          </div>
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
