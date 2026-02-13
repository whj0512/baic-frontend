import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, message, Spin } from 'antd'
import { ShareAltOutlined } from '@ant-design/icons'
import './ProjectWorkSpace.css'
import type { Requirement } from '../models/Requirement'
import type { RequirementVersion } from '../models/RequirementVersion'
import RequirementOverview, { type SectionKey } from '../components/RequirementOverview'
import DimensionEditor from '../components/DimensionEditor'
import RequirementCreator from '../components/RequirementCreator/RequirementCreator'
import { API_ENDPOINTS } from '../config/api'

// 中间区域视图类型
type CenterView = 'overview' | 'editor' | 'create' | 'create-editor'

function ProjectWorkSpace() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const navigate = useNavigate()

  // 状态
  const [project, setProject] = useState<any>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [requirementVersions, setRequirementVersions] = useState<RequirementVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)

  // 当前选中的需求
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null)

  // 中间区域视图状态
  const [centerView, setCenterView] = useState<CenterView>('overview')

  // 当前编辑的 section
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null)

  // 初始化：获取项目信息和需求列表
  // 修正后的 Effect
  useEffect(() => {
    const initWorkspace = async () => {
      if (!projectKey) return
      setLoading(true)
      try {
        // 1. 获取项目列表以解析 projectKey -> projectId
        const projRes = await fetch(API_ENDPOINTS.projects)
        if (!projRes.ok) throw new Error('获取项目列表失败')
        const projData = await projRes.json()

        const currentProject = projData?.find((p: any) => p.key === projectKey)

        if (!currentProject) {
          message.error('未找到该项目')
          navigate('/')
          return
        }

        setProject(currentProject)

        // 2. 获取该项目的需求列表
        // 构造 URL: API_ENDPOINTS.projects + /:id/requirements
        const reqsUrl = `${API_ENDPOINTS.projects}/${currentProject.id}/requirements`
        const reqRes = await fetch(reqsUrl)
        if (!reqRes.ok) throw new Error('获取需求列表失败')
        const reqData = await reqRes.json()

        setRequirements(reqData.requirements || [])

      } catch (error) {
        console.error('Init error:', error)
        message.error('加载项目资源失败')
      } finally {
        setLoading(false)
      }
    }

    initWorkspace()
  }, [projectKey, navigate])

  // 获取选中需求的详细信息（包括版本历史）
  useEffect(() => {
    const fetchRequirementDetails = async () => {
      if (!selectedRequirement || selectedRequirement === 'NEW') {
        setRequirementVersions([])
        return
      }

      setLoadingVersions(true)
      try {
        const url = `${API_ENDPOINTS.requirements}/${selectedRequirement}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('获取需求详情失败')
        const data = await res.json()

        // 假设 API 返回包含 versions 字段，或者目前只返回主记录
        // 根据 API 文档，GET /requirements/{id} 返回 { requirement: ... }
        // 如果后端暂未返回版本列表，我们可能只能显示当前版本
        // 暂时假设 response.requirement 包含 versions 数组或者我们需要另行获取
        // 由于文档未明确 specify versions list endpoint, 且用途说 "读取...版本历史"
        // 我们检查 data.versions 是否存在

        if (data.versions) {
          setRequirementVersions(data.versions)
        } else if (data.requirement) {
          // 如果只有 requirement，构造一个包含当前版本的伪列表，或者不做处理
          // 这里为了演示，我们至少把 current version 放进去
          // 但是 requirement 对象本身没有 version details 吗？
          // 看 models: Requirement 有 current_version_id
          // 我们暂且置空或模拟，等待后端完善
          setRequirementVersions([])
        }

      } catch (error) {
        console.error('Fetch details error:', error)
        // message.error('获取需求详情失败') // 避免频繁报错干扰
      } finally {
        setLoadingVersions(false)
      }
    }

    fetchRequirementDetails()
  }, [selectedRequirement])

  // 获取当前选中需求的版本记录
  const currentVersions = requirementVersions

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
  const handleEditorSave = (sectionKey: SectionKey, graphData: object, dslText: string) => {
    // TODO: 将 graphData 和 dslText 保存到对应的 requirement 字段
    console.log('Save section:', sectionKey, graphData, dslText)
  }

  // 选择需求时重置视图
  const handleRequirementSelect = (reqId: string) => {
    setSelectedRequirement(reqId)
    setCenterView('overview')
    setEditingSection(null)
  }

  // 处理新建需求
  const handleCreateRequirement = () => {
    setSelectedRequirement(null)
    setCenterView('create')
  }

  // 处理新建完成或取消
  const handleCreateFinish = () => {
    setCenterView('overview')
  }

  // 新建需求表单状态
  const [createFormData, setCreateFormData] = useState({
    nl_text: '',
    relationships: [] as any[],
    // Store graph data for each section
    sectionData: {} as Record<string, any>,
    // Store DSL text for each section
    sectionDslData: {} as Record<string, string>
  })

  // 处理新建时的 Section 点击
  const handleCreateSectionClick = (sectionKey: SectionKey) => {
    setEditingSection(sectionKey)
    setCenterView('create-editor')
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

  // 构建临时 Requirement 对象用于编辑器
  const draftRequirement: Requirement = {
    id: 'NEW',
    project_id: projectKey || '',
    current_version_id: '',
    nl_text: createFormData.nl_text,
    dsl_text: [
      createFormData.sectionDslData.environment,
      createFormData.sectionDslData.interaction,
      createFormData.sectionDslData.internalComposition,
      createFormData.sectionDslData.moduleResponses,
      createFormData.sectionDslData.internalConstraints
    ].filter(Boolean).join('\n\n'), // Concatenate all DSL texts
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

  return (
    <div className="workspace-container">
      {/* ... Left Panel ... */}
      <div className="workspace-left">
        {/* ... (Unchanged) ... */}
        <div className="panel-header">
          <h3>需求列表</h3>
          <button
            className="btn-icon"
            title="新建需求"
            onClick={handleCreateRequirement}
          >
            +
          </button>
        </div>
        <div className="requirement-list">
          <Spin spinning={loading}>
            {requirements.length === 0 && !loading && (
              <div className="list-empty">暂无需求</div>
            )}
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
          </Spin>
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

      {/* Center Panel */}
      <div className="workspace-center">
        {centerView === 'overview' && (
          <Spin spinning={loadingVersions}>
            <RequirementOverview
              requirement={currentRequirement || null}
              versions={currentVersions}
              projectKey={projectKey || ''}
              onSectionClick={(section) => handleSectionClick(section)}
            />
          </Spin>
        )}

        {centerView === 'editor' && currentRequirement && editingSection && (
          <DimensionEditor
            requirement={currentRequirement}
            sectionKey={editingSection}
            onBack={handleBackToOverview}
            onSave={handleEditorSave}
          />
        )}

        {centerView === 'create' && (
          <RequirementCreator
            projectKey={projectKey}
            formData={createFormData}
            onChange={setCreateFormData}
            onSectionClick={handleCreateSectionClick}
            onCancel={handleCreateFinish}
            onSuccess={handleCreateFinish}
          />
        )}

        {centerView === 'create-editor' && editingSection && (
          <DimensionEditor
            requirement={draftRequirement}
            sectionKey={editingSection}
            onBack={() => setCenterView('create')}
            onSave={handleCreateEditorSave}
          />
        )}
      </div>

      {/* Right Panel */}
      {/* ... (Unchanged logic, hidden when create or create-editor) ... */}
      {!['create', 'create-editor'].includes(centerView) && (
        <div className="workspace-right">
          {/* ... (Unchanged) ... */}
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
        </div>
      )}
    </div>
  )
}

export default ProjectWorkSpace
