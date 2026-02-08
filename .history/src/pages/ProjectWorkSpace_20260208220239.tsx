import { useState } from 'react'
import { useParams } from 'react-router-dom'
import './ProjectWorkSpace.css'

// 五个维度的 Tab 类型
type DimensionTab = 'IBD' | 'ESD' | 'SC' | 'BDD' | 'ISD'

const DIMENSION_TABS: { key: DimensionTab; label: string; description: string }[] = [
  { key: 'IBD', label: 'IBD', description: '内部块图 - 系统所处的环境' },
  { key: 'ESD', label: 'ESD', description: '外部顺序图 - 与环境的交互' },
  { key: 'SC', label: 'SC', description: '状态图 - 内部约束' },
  { key: 'BDD', label: 'BDD', description: '块定义图 - 内部组成' },
  { key: 'ISD', label: 'ISD', description: '内部顺序图 - 组成模块的响应' },
]

function ProjectWorkSpace() {
  const { projectKey } = useParams<{ projectKey: string }>()

  // 当前选中的维度 Tab
  const [activeTab, setActiveTab] = useState<DimensionTab>('IBD')

  // 当前选中的需求
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null)

  // Mock 需求列表数据 - 对应 requirement 表
  const requirements: Requirement[] = [
    {
      id: 'req-001',
      project_id: projectKey || '',
      current_version_id: 'ver-001-3',
      previous_version_id: 'ver-001-2',
      nl_text: '系统应能在接收到导航指令后5秒内完成路径规划',
      dsl_text: 'WHEN receive(NavigationCommand) THEN complete(PathPlanning) WITHIN 5s',
      created_by: 'user-001',
      created_at: '2024-01-15T08:30:00Z',
      updated_at: '2024-02-08T14:30:00Z',
    },
    {
      id: 'req-002',
      project_id: projectKey || '',
      current_version_id: 'ver-002-2',
      previous_version_id: 'ver-002-1',
      nl_text: '定位模块应支持GPS和北斗双模定位',
      dsl_text: 'LocationModule SHALL support(GPS, BeiDou)',
      created_by: 'user-002',
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-02-05T16:45:00Z',
    },
    {
      id: 'req-003',
      project_id: projectKey || '',
      current_version_id: 'ver-003-1',
      nl_text: '通信模块应支持4G/5G网络切换',
      dsl_text: 'CommunicationModule SHALL support(NetworkSwitch, 4G, 5G)',
      created_by: 'user-001',
      created_at: '2024-02-01T09:15:00Z',
      updated_at: '2024-02-01T09:15:00Z',
    },
    {
      id: 'req-004',
      project_id: projectKey || '',
      current_version_id: 'ver-004-1',
      nl_text: '系统应在检测到障碍物时自动停止',
      dsl_text: 'WHEN detect(Obstacle) THEN execute(EmergencyStop)',
      created_by: 'user-003',
      created_at: '2024-02-03T11:20:00Z',
      updated_at: '2024-02-07T14:00:00Z',
    },
  ]

  // Mock 版本记录数据 - 对应 requirement_version 表
  const requirementVersions: RequirementVersion[] = [
    {
      id: 'ver-001-3',
      requirement_id: 'req-001',
      version_number: 3,
      created_by: 'user-001',
      created_at: '2024-02-08T14:30:00Z',
      nl_text: '系统应能在接收到导航指令后5秒内完成路径规划',
      dsl_text: 'WHEN receive(NavigationCommand) THEN complete(PathPlanning) WITHIN 5s',
    },
    {
      id: 'ver-001-2',
      requirement_id: 'req-001',
      version_number: 2,
      created_by: 'user-002',
      created_at: '2024-02-05T10:15:00Z',
      nl_text: '系统应能在接收到导航指令后10秒内完成路径规划',
      dsl_text: 'WHEN receive(NavigationCommand) THEN complete(PathPlanning) WITHIN 10s',
    },
    {
      id: 'ver-001-1',
      requirement_id: 'req-001',
      version_number: 1,
      created_by: 'user-001',
      created_at: '2024-01-15T08:30:00Z',
      nl_text: '系统应能完成路径规划',
      dsl_text: 'System SHALL complete(PathPlanning)',
    },
  ]

  // 获取当前选中需求的版本记录
  const currentVersions = selectedRequirement
    ? requirementVersions.filter((v) => v.requirement_id === selectedRequirement)
    : []

  // 获取当前选中的需求对象
  const currentRequirement = requirements.find((r) => r.id === selectedRequirement)

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

  return (
    <div className="workspace-container">
      {/* 左侧：需求列表 */}
      <div className="workspace-left">
        <div className="panel-header">
          <h3>需求列表</h3>
          <button className="btn-icon" title="新建需求">+</button>
        </div>
        <div className="requirement-list">
          {requirements.map((req) => (
            <div
              key={req.id}
              className={`requirement-item ${selectedRequirement === req.id ? 'selected' : ''}`}
              onClick={() => setSelectedRequirement(req.id)}
            >
              <div className="requirement-item-header">
                <span className="requirement-id">{req.id}</span>
                <span className="requirement-date">{formatDate(req.updated_at)}</span>
              </div>
              <div className="requirement-item-content">
                {truncateText(req.nl_text, 50)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 中间：多维编辑器 */}
      <div className="workspace-center">
        {/* 顶部 Tab 栏 */}
        <div className="dimension-tabs">
          {DIMENSION_TABS.map((tab) => (
            <div
              key={tab.key}
              className={`dimension-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              title={tab.description}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* 主画布区域 */}
        <div className="canvas-container">
          <div className="canvas-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">📊</span>
              <h4>{DIMENSION_TABS.find((t) => t.key === activeTab)?.description}</h4>
              <p>
                项目: <strong>{projectKey}</strong>
              </p>
              <p>
                当前维度: <strong>{activeTab}</strong>
              </p>
              {currentRequirement && (
                <p>
                  选中需求: <strong>{currentRequirement.id}</strong>
                </p>
              )}
              <p className="placeholder-hint">基于 AntV X6 的建模画布将在此显示</p>
            </div>
          </div>
        </div>

        {/* 底部属性栏 */}
        <div className="property-bar">
          <div className="property-section">
            <label>自然语言描述 (NL)</label>
            <textarea
              className="property-textarea"
              placeholder="选择需求后在此显示自然语言描述..."
              rows={2}
              value={currentRequirement?.nl_text || ''}
              readOnly
            />
          </div>
          <div className="property-section">
            <label>DSL 文本</label>
            <textarea
              className="property-textarea dsl"
              placeholder="选择需求后在此显示 DSL 表示..."
              rows={2}
              value={currentRequirement?.dsl_text || ''}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* 右侧：版本与协作 */}
      <div className="workspace-right">
        {/* 版本记录 */}
        <div className="version-panel">
          <div className="panel-header">
            <h3>版本记录</h3>
          </div>
          <div className="version-list">
            {currentVersions.length > 0 ? (
              currentVersions.map((version) => (
                <div key={version.id} className="version-item">
                  <div className="version-header">
                    <span className="version-number">v{version.version_number}</span>
                    <span className="version-date">{formatDate(version.created_at)}</span>
                  </div>
                  <div className="version-info">
                    <span className="version-author">创建者: {version.created_by}</span>
                    <span className="version-desc">{truncateText(version.nl_text, 40)}</span>
                  </div>
                  <div className="version-actions">
                    <button className="btn-link">对比</button>
                    <button className="btn-link">回滚</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="version-empty">
                {selectedRequirement ? '暂无版本记录' : '请选择一个需求'}
              </div>
            )}
          </div>
        </div>

        {/* AI 助手面板 */}
        <div className="ai-panel">
          <div className="panel-header">
            <h3>AI 助手</h3>
          </div>
          <div className="ai-content">
            <div className="ai-suggestion">
              <p className="ai-hint">AI 可以帮助您：</p>
              <ul>
                <li>根据 DSL 自动生成图表</li>
                <li>根据自然语言推荐需求分类</li>
                <li>检查需求一致性</li>
              </ul>
            </div>
            <button className="btn-ai">
              <span>✨</span> 智能分析
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectWorkSpace
