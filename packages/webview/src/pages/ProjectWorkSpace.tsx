import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, message, Spin, Badge, Modal, Collapse } from 'antd'
import type { CollapseProps } from 'antd'
import { ShareAltOutlined, ArrowLeftOutlined, ExperimentOutlined } from '@ant-design/icons'
import './ProjectWorkSpace.css'
import type { Requirement } from '../models/Requirement'
import type { RequirementVersion } from '../models/RequirementVersion'
import RequirementOverview, { type SectionKey } from '../components/RequirementOverview'
import DimensionEditor from '../components/DimensionEditor'
import RequirementCreator from '../components/RequirementCreator/RequirementCreator'
import ReqRelationShip from '../components/ReqRelationShip'
import TestCaseOverview from '../components/TestCaseOverview'
import { API_ENDPOINTS, authFetch } from '../config/api'
import { useProjectSync } from '../hooks/useProjectSync'
import {
  clearDimensionEditorDraft,
  clearRequirementCreateDraft,
  getDraftUserId,
  readRequirementCreateDraft,
  saveRequirementCreateDraft,
  type CreateRequirementFormData,
} from '../utils/editorDraftStorage'

// 中间区域视图类型
type CenterView = 'overview' | 'editor' | 'create' | 'create-editor' | 'relationship' | 'test-case'
type CreateCenterView = Extract<CenterView, 'create' | 'create-editor'>

const createEmptyRequirementFormData = (): CreateRequirementFormData => ({
  name: '',
  nl_text: '',
  req_type: '',
  relationships: [] as any[],
  sectionData: {} as Record<string, any>,
  sectionDslData: {} as Record<string, string>
})

const hasCreateDraftContent = (formData: CreateRequirementFormData) => (
  Boolean(
    formData.name.trim()
    || formData.req_type.trim()
    || formData.nl_text.trim()
    || formData.relationships.length
    || Object.keys(formData.sectionData).length
    || Object.keys(formData.sectionDslData).length,
  )
)

const hasRestorableCreateDraft = (
  formData: CreateRequirementFormData,
  view: CenterView,
  section: SectionKey | null,
) => (
  hasCreateDraftContent(formData) || (view === 'create-editor' && Boolean(section))
)

const CREATE_SECTION_KEYS: SectionKey[] = [
  'environment',
  'interaction',
  'internalComposition',
  'moduleResponses',
  'internalConstraints',
]

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

  // 进入 relationship / test-case 视图前保存上一个视图状态，以便返回
  const prevViewStateRef = useRef<{ view: CenterView; reqId: string | null; section: SectionKey | null }>({
    view: 'overview', reqId: null, section: null
  })
  const createDraftViewRef = useRef<{ view: CreateCenterView; section: SectionKey | null }>({
    view: 'create', section: null
  })
  const createDraftPromptKeyRef = useRef('')
  const draftUserId = getDraftUserId()
  const draftProjectScope = project?.id || projectKey || ''

  const clearCreateFlowDrafts = () => {
    if (!draftProjectScope) return

    clearRequirementCreateDraft(draftProjectScope, draftUserId)
    CREATE_SECTION_KEYS.forEach(sectionKey => {
      clearDimensionEditorDraft(draftProjectScope, draftUserId, 'NEW', sectionKey)
    })
  }

  // 测试用例视图：当前展示的需求列表
  const [testCaseRequirements, setTestCaseRequirements] = useState<Requirement[]>([])

  // 中间区域视图状态
  const [centerView, setCenterView] = useState<CenterView>('overview')
  const isLeftCollapsed = centerView === 'editor' || centerView === 'create-editor'

  // 当前编辑的 section
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null)

  // 右侧面板折叠状态
  const [rightCollapsed, setRightCollapsed] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const restorePreviousCenterView = () => {
    const prev = prevViewStateRef.current
    setSelectedRequirement(prev.reqId)
    setEditingSection(prev.section)
    setCenterView(prev.view)
  }

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
        const currentProject = projects.find((p: any) => p.id === projectKey || p.key === projectKey)

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
        const res = await authFetch(url)
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

  // 保存编辑器数据 —— DimensionEditor 内部已通过 PUT API 保存到后端
  // WebSocket 会推送 requirement_updated 事件自动更新 requirements 状态
  const handleEditorSave = (_sectionKey: SectionKey, _graphData: object, _dslText: string) => {
    // 数据已由 DimensionEditor 通过 PUT API 提交
    // useProjectSync 会通过 WebSocket 接收 requirement_updated 事件并更新状态
  }

  // 选择需求时重置视图
  const handleRequirementSelect = (reqId: string) => {
    if (centerView === 'create' || centerView === 'create-editor') {
      createDraftViewRef.current = { view: centerView, section: editingSection }
    }
    setSelectedRequirement(reqId)
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
        setCreateFormData(draft.formData)
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
    const shouldSaveDraft = hasRestorableCreateDraft(createFormData, centerView, editingSection)
    if (!draftProjectScope || !shouldSaveDraft) return
    if (centerView !== 'create' && centerView !== 'create-editor') return

    const timer = setTimeout(() => {
      saveRequirementCreateDraft(draftProjectScope, draftUserId, {
        formData: createFormData,
        view: centerView,
        section: editingSection,
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [centerView, createFormData, draftProjectScope, draftUserId, editingSection])

  useEffect(() => {
    const shouldSaveDraft = hasRestorableCreateDraft(createFormData, centerView, editingSection)
    if (!draftProjectScope || !shouldSaveDraft) return
    if (centerView !== 'create' && centerView !== 'create-editor') return

    const flushCreateDraft = () => {
      saveRequirementCreateDraft(draftProjectScope, draftUserId, {
        formData: createFormData,
        view: centerView,
        section: editingSection,
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

  // 处理新建完成或取消
  const handleCreateFinish = () => {
    clearCreateFlowDrafts()
    setCreateFormData(createEmptyRequirementFormData())
    createDraftViewRef.current = { view: 'create', section: null }
    setEditingSection(null)
    setCenterView('overview')
  }

  // 处理新建时的 Section 点击
  const handleCreateSectionClick = (sectionKey: SectionKey) => {
    createDraftViewRef.current = { view: 'create-editor', section: sectionKey }
    setEditingSection(sectionKey)
    setCenterView('create-editor')
  }

  const handleBackToCreator = () => {
    createDraftViewRef.current = { view: 'create', section: null }
    if (draftProjectScope) {
      if (hasCreateDraftContent(createFormData)) {
        saveRequirementCreateDraft(draftProjectScope, draftUserId, {
          formData: createFormData,
          view: 'create',
          section: null,
        })
      } else {
        clearCreateFlowDrafts()
      }
    }
    setEditingSection(null)
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

  // 构建临时 Requirement 对象用于编辑器
  const draftRequirement: Requirement = {
    id: 'NEW',
    project_id: projectKey || '',
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
          <Button
            type='default'
            icon={<ExperimentOutlined />}
            block
            onClick={() => {
              // 收集当前 type 下所有 subtype 的需求
              const allReqs = Object.values(subtypeMap).flat()
              setTestCaseRequirements(allReqs)
              prevViewStateRef.current = {
                view: centerView,
                reqId: selectedRequirement,
                section: editingSection
              }
              setSelectedRequirement(null)
              setCenterView('test-case')
            }}
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
            onClick={() => {
              // 保存当前视图状态，以便从 relationship 返回时恢复
              prevViewStateRef.current = {
                view: centerView,
                reqId: selectedRequirement,
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
              draftProjectScope={draftProjectScope}
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
              draftProjectScope={draftProjectScope}
              requirement={draftRequirement}
              sectionKey={editingSection}
              onBack={handleBackToCreator}
              onSave={handleCreateEditorSave}
            />
          )}

          {centerView === 'relationship' && (
            <ReqRelationShip
              requirements={requirements}
              onBack={restorePreviousCenterView}
            />
          )}

          {centerView === 'test-case' && (
            <TestCaseOverview
              requirements={testCaseRequirements}
              onBack={restorePreviousCenterView}
            />
          )}
        </div>
      </div>

      {/* Right Panel */}
      {!['create', 'create-editor', 'relationship', 'test-case'].includes(centerView) && (
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
