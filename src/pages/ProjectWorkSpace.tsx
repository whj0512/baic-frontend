import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'antd'
import { ShareAltOutlined } from '@ant-design/icons'
import './ProjectWorkSpace.css'
import type { Requirement } from '../models/Requirement'
import type { RequirementVersion } from '../models/RequirementVersion'
import RequirementOverview, { type SectionKey } from '../components/RequirementOverview'
import DimensionEditor from '../components/DimensionEditor'

// 中间区域视图类型
type CenterView = 'overview' | 'editor'

function ProjectWorkSpace() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const navigate = useNavigate()

  // 当前选中的需求
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null)

  // 中间区域视图状态
  const [centerView, setCenterView] = useState<CenterView>('overview')

  // 当前编辑的 section
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null)

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

  // 处理 section 点击 - 切换到编辑器视图
  const handleSectionClick = (sectionKey: SectionKey) => {
    setEditingSection(sectionKey)
    setCenterView('editor')
  }

  // 返回概览视图
  const handleBackToOverview = () => {
    setEditingSection(null)
    setCenterView('overview')
  }

  // 保存编辑器数据
  const handleEditorSave = (sectionKey: SectionKey, graphData: object) => {
    // TODO: 将 graphData 保存到对应的 requirement 字段
    console.log('Save section:', sectionKey, graphData)
  }

  // 选择需求时重置视图
  const handleRequirementSelect = (reqId: string) => {
    setSelectedRequirement(reqId)
    setCenterView('overview')
    setEditingSection(null)
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
              onClick={() => handleRequirementSelect(req.id)}
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
        <div className="panel-footer">
          <Button
            type="default"
            icon={<ShareAltOutlined />}
            block
            onClick={() => navigate(`/workspace/${projectKey}/relationship`)}
          >
            需求间关系
          </Button>
        </div>
      </div>

      {/* 中间：需求概览 / 维度编辑器 */}
      <div className="workspace-center">
        {centerView === 'overview' ? (
          <RequirementOverview
            requirement={currentRequirement || null}
            versions={currentVersions}
            projectKey={projectKey || ''}
            onSectionClick={handleSectionClick}
          />
        ) : (
          currentRequirement && editingSection && (
            <DimensionEditor
              requirement={currentRequirement}
              sectionKey={editingSection}
              onBack={handleBackToOverview}
              onSave={handleEditorSave}
            />
          )
        )}
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
