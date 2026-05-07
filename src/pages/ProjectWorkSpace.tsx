import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, message, Spin, Badge, Modal, Collapse } from 'antd'
import type { CollapseProps } from 'antd'
import { ShareAltOutlined, ArrowLeftOutlined, DeleteOutlined, CloseOutlined, FileTextOutlined, PartitionOutlined } from '@ant-design/icons'
import './ProjectWorkSpace.css'
import type { Requirement } from '../models/Requirement'
import type { RequirementVersion } from '../models/RequirementVersion'
import RequirementOverview, { type SectionKey } from '../components/RequirementOverview'
import DimensionEditor from '../components/DimensionEditor'
import RequirementCreator from '../components/RequirementCreator/RequirementCreator'
import ReqRelationShip from '../components/ReqRelationShip'
import { API_ENDPOINTS } from '../config/api'
import { useProjectSync } from '../hooks/useProjectSync'

// 中间区域视图类型
type CenterView = 'overview' | 'editor' | 'create' | 'create-editor' | 'relationship'

function ProjectWorkSpace() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const navigate = useNavigate()

  // 状态
  const [project, setProject] = useState<any>(null)
  const [requirementVersions, setRequirementVersions] = useState<RequirementVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)

  // 当前选中的需求
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null)

  // IDE 风格 Tab 管理 - 每个 tab 独立记忆视图状态
  interface ReqTab {
    id: string
    label: string         // 截取的 name 前缀
    savedView: CenterView // 该 tab 上次的视图状态
    savedSection: SectionKey | null // 该 tab 上次编辑的 section
  }
  const [openTabs, setOpenTabs] = useState<ReqTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const tabBarRef = useRef<HTMLDivElement>(null)

  // 进入 relationship 视图前保存上一个视图状态，以便返回
  const prevViewStateRef = useRef<{ view: CenterView; reqId: string | null; section: SectionKey | null }>({
    view: 'overview', reqId: null, section: null
  })

  // 保存当前活跃 tab 的视图快照
  const saveCurrentTabState = () => {
    if (!activeTabId) return
    setOpenTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, savedView: centerView, savedSection: editingSection } : t
    ))
  }

  // 中间区域视图状态
  const [centerView, setCenterView] = useState<CenterView>('overview')

  // 当前编辑的 section
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null)

  // 右侧面板折叠状态
  const [rightCollapsed, setRightCollapsed] = useState(false)

  // 删除模式
  const [deleteMode, setDeleteMode] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 初始化：获取项目元信息（仅 project，需求列表由 WebSocket 提供）
  useEffect(() => {
    const initProject = async () => {
      if (!projectKey) return
      setLoading(true)
      try {
        const projRes = await fetch(API_ENDPOINTS.projects)
        if (!projRes.ok) throw new Error('获取项目列表失败')
        const projData = await projRes.json()
        const projects = Array.isArray(projData) ? projData : (projData.projects || [])
        const currentProject = projects.find((p: any) => p.key === projectKey)

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
  const { requirements, isConnected, removeRequirement } = useProjectSync(project?.id)

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
    // 同步更新当前 tab 的保存状态
    if (activeTabId) {
      setOpenTabs(prev => prev.map(t =>
        t.id === activeTabId ? { ...t, savedView: 'editor', savedSection: sectionKey } : t
      ))
    }
  }

  // 返回概览视图
  const handleBackToOverview = () => {
    setEditingSection(null)
    setCenterView('overview')
    // 同步更新当前 tab 的保存状态
    if (activeTabId) {
      setOpenTabs(prev => prev.map(t =>
        t.id === activeTabId ? { ...t, savedView: 'overview', savedSection: null } : t
      ))
    }
  }

  // 保存编辑器数据 —— DimensionEditor 内部已通过 PUT API 保存到后端
  // WebSocket 会推送 requirement_updated 事件自动更新 requirements 状态
  const handleEditorSave = (_sectionKey: SectionKey, _graphData: object, _dslText: string) => {
    // 数据已由 DimensionEditor 通过 PUT API 提交
    // useProjectSync 会通过 WebSocket 接收 requirement_updated 事件并更新状态
  }

  // 选择需求时重置视图 & 管理 tab
  const handleRequirementSelect = (reqId: string) => {
    // 先保存当前 tab 的视图快照
    saveCurrentTabState()

    const req = requirements.find(r => r.id === reqId)
    const label = req?.name ? (req.name.length > 18 ? req.name.slice(0, 18) + '…' : req.name) : reqId.slice(0, 8)

    setOpenTabs(prev => {
      const existing = prev.find(t => t.id === reqId)
      if (existing) {
        // tab 已存在：恢复其视图
        setCenterView(existing.savedView)
        setEditingSection(existing.savedSection)
        return prev
      }
      // 新 tab：默认 overview
      setCenterView('overview')
      setEditingSection(null)
      return [...prev, { id: reqId, label, savedView: 'overview', savedSection: null }]
    })
    setActiveTabId(reqId)
    setSelectedRequirement(reqId)
  }

  // 切换 tab - 恢复目标 tab 的视图状态
  const handleTabClick = (tabId: string) => {
    if (tabId === activeTabId) return
    // 先保存当前 tab 的视图快照
    saveCurrentTabState()

    const targetTab = openTabs.find(t => t.id === tabId)
    setActiveTabId(tabId)
    setSelectedRequirement(tabId)
    if (targetTab) {
      setCenterView(targetTab.savedView)
      setEditingSection(targetTab.savedSection)
    } else {
      setCenterView('overview')
      setEditingSection(null)
    }
  }

  // 关闭 tab
  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    setOpenTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)
      // 若关闭的是当前激活 tab，切到相邻 tab 并恢复其视图
      if (tabId === activeTabId) {
        const neighborTab = next[Math.min(idx, next.length - 1)] ?? null
        setActiveTabId(neighborTab?.id ?? null)
        setSelectedRequirement(neighborTab?.id ?? null)
        if (neighborTab) {
          setCenterView(neighborTab.savedView)
          setEditingSection(neighborTab.savedSection)
        } else {
          setCenterView('overview')
          setEditingSection(null)
        }
      }
      return next
    })
  }

  // 删除需求
  const handleDeleteRequirement = (req: Requirement) => {
    Modal.confirm({
      title: '确认删除需求',
      content: `确定要删除该需求吗？当前可能有用户正在编辑这条需求。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true)
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(API_ENDPOINTS.requirementById(req.id), {
            method: 'DELETE',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || '删除失败')
          }
          message.success('需求已删除')
          removeRequirement(req.id)
          // 同时关闭对应 tab 并恢复相邻 tab 视图
          setOpenTabs(prev => {
            const idx = prev.findIndex(t => t.id === req.id)
            const next = prev.filter(t => t.id !== req.id)
            if (req.id === activeTabId) {
              const neighborTab = next[Math.min(idx, next.length - 1)] ?? null
              setActiveTabId(neighborTab?.id ?? null)
              setSelectedRequirement(neighborTab?.id ?? null)
              if (neighborTab) {
                setCenterView(neighborTab.savedView)
                setEditingSection(neighborTab.savedSection)
              } else {
                setCenterView('overview')
                setEditingSection(null)
              }
            }
            return next
          })
          if (selectedRequirement === req.id && activeTabId !== req.id) {
            setSelectedRequirement(null)
            setCenterView('overview')
          }
          setDeleteMode(false)
        } catch (error: any) {
          console.error('Delete error:', error)
          message.error(error.message || '删除失败，请稍后重试')
        } finally {
          setDeleting(false)
        }
      },
    })
  }


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
    name: '',
    nl_text: '',
    type: '',
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
    name: createFormData.name,
    nl_text: createFormData.nl_text,
    type: createFormData.type,
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
      className={`requirement-item ${selectedRequirement === req.id && !deleteMode ? 'selected' : ''} ${deleteMode ? 'delete-mode-item' : ''}`}
      onClick={() => deleteMode ? handleDeleteRequirement(req) : handleRequirementSelect(req.id)}
      style={{ marginBottom: 0 }}
    >
      <div className="requirement-item-header">
        <span className="requirement-date">{formatDate(req.updated_at)}</span>
        {deleteMode && (
          <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 13 }} />
        )}
      </div>
      <div className="requirement-item-content">
        {truncateText(req.name, 50)}
      </div>
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
          <Button
            type='default'
            icon={<PartitionOutlined />}
            block
          >
            测试用例
          </Button>
        </div>
      )
    }
  })

  return (
    <div className="workspace-container">
      {/* ... Left Panel ... */}
      <div className="workspace-left">
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
            <button
              className={`btn-icon${deleteMode ? ' btn-icon-active' : ''}`}
              title={deleteMode ? '退出删除模式' : '删除需求'}
              onClick={() => setDeleteMode(prev => !prev)}
              disabled={deleting}
            >
              <DeleteOutlined />
            </button>
            <button
              className="btn-icon"
              title="新建需求"
              onClick={handleCreateRequirement}
              disabled={deleteMode}
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
            onClick={() => {
              // 保存当前视图状态，以便从 relationship 返回时恢复
              prevViewStateRef.current = {
                view: centerView,
                reqId: activeTabId,
                section: editingSection
              }
              setSelectedRequirement(null)
              setCenterView('relationship')
            }}
          >
            需求间关系
          </Button>
        </div>
      </div>

      {/* Center Panel */}
      <div className="workspace-center">
        {/* IDE 风格 Tab 栏：仅在需求 tab 场景下显示 */}
        {!['create', 'create-editor', 'relationship'].includes(centerView) && openTabs.length > 0 && (
          <div className="center-tab-bar" ref={tabBarRef}>
            {openTabs.map(tab => (
              <div
                key={tab.id}
                className={`center-tab${activeTabId === tab.id ? ' center-tab-active' : ''}`}
                onClick={() => handleTabClick(tab.id)}
                title={requirements.find(r => r.id === tab.id)?.name ?? tab.label}
              >
                <FileTextOutlined className="center-tab-file-icon" />
                <span className="center-tab-label">{tab.label}</span>
                <span
                  className="center-tab-close"
                  onClick={(e) => handleTabClose(e, tab.id)}
                  title="关闭"
                >
                  <CloseOutlined />
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 内容区 */}
        <div className="center-content">
          {centerView === 'overview' && (
            <Spin spinning={loadingVersions} wrapperClassName="overview-spin-wrapper">
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
              key={`${currentRequirement.id}-${editingSection}`}
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

          {centerView === 'relationship' && (
            <ReqRelationShip
              requirements={requirements}
              onBack={() => {
                const prev = prevViewStateRef.current
                if (prev.reqId) {
                  // 恢复之前的 tab 和视图状态
                  setActiveTabId(prev.reqId)
                  setSelectedRequirement(prev.reqId)
                  setCenterView(prev.view)
                  setEditingSection(prev.section)
                } else {
                  setCenterView('overview')
                  setEditingSection(null)
                }
              }}
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
                          <span className="version-number">v{version.version_code}</span>
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
      )}
    </div>
  )
}

export default ProjectWorkSpace
