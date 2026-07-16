import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Collapse, Input, Modal, Result, message } from 'antd'
import type { CollapseProps } from 'antd'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LockOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { Requirement } from '../../models/Requirement'
import type { SectionKey } from '../../components/DimensionEditor/types'
import RequirementOverview from '../../components/RequirementOverview'
import ReadonlyDimensionViewer from '../../components/ReadonlyDimensionViewer'
import { usePlatformMock } from '../../platform/PlatformMockProvider'
import type { MockProjectStatus } from '../../platform/mockTypes'
import { formatPlatformDate, truncatePlatformText } from '../../platform/display'
import '../ProjectWorkSpace.css'
import './PlatformPages.css'
import './PlatformProjectDetail.css'

type CenterView = 'overview' | 'dimension'

const typeDisplayName = (type: string) => {
  switch (type) {
    case 'component': return '部件需求'
    case 'system': return '系统需求'
    default: return type || '默认'
  }
}

function PlatformProjectDetail() {
  const navigate = useNavigate()
  const { projectId, versionId } = useParams()
  const { projects, updateProjectStatus, deleteProject } = usePlatformMock()
  const project = projects.find(item => item.id === projectId)
  const selectedVersion = project?.versions.find(version => version.id === versionId)
    ?? (versionId ? undefined : project?.versions[0])
  const requirements = selectedVersion?.snapshot.requirements ?? []

  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null)
  const [centerView, setCenterView] = useState<CenterView>('overview')
  const [selectedSection, setSelectedSection] = useState<SectionKey | null>(null)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  useEffect(() => {
    setSelectedRequirementId(requirements[0]?.id ?? null)
    setSelectedSection(null)
    setCenterView('overview')
  }, [selectedVersion?.id])

  const currentRequirement = requirements.find(requirement => requirement.id === selectedRequirementId) ?? null

  const groupedRequirements = useMemo(() => requirements.reduce((groups, requirement) => {
    const type = typeDisplayName(requirement.type || '')
    const subtype = requirement.subtype || ''
    if (!groups[type]) groups[type] = {}
    if (!groups[type][subtype]) groups[type][subtype] = []
    groups[type][subtype].push(requirement)
    return groups
  }, {} as Record<string, Record<string, Requirement[]>>), [requirements])

  if (!project) {
    return (
      <Result
        status="404"
        title="项目不存在"
        subTitle="该 mock 项目可能已被永久删除，或项目地址无效。"
        extra={<Button type="primary" onClick={() => navigate('/')}>返回项目列表</Button>}
      />
    )
  }

  if (!selectedVersion) {
    return (
      <Result
        status="404"
        title="版本不存在"
        subTitle="当前项目中没有找到指定的发布版本。"
        extra={<Button type="primary" onClick={() => navigate(`/projects/${project.id}`)}>打开最新版本</Button>}
      />
    )
  }

  const selectRequirement = (requirementId: string) => {
    setSelectedRequirementId(requirementId)
    setSelectedSection(null)
    setCenterView('overview')
  }

  const renderRequirement = (requirement: Requirement) => (
    <div
      key={requirement.id}
      className={`requirement-item ${selectedRequirementId === requirement.id ? 'selected' : ''}`}
      onClick={() => selectRequirement(requirement.id)}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') selectRequirement(requirement.id)
      }}
    >
      <div className="requirement-item-header">
        <span className="requirement-date">{formatPlatformDate(requirement.updated_at)}</span>
      </div>
      <div className="requirement-item-content">{truncatePlatformText(requirement.name, 50)}</div>
    </div>
  )

  const collapseItems: CollapseProps['items'] = Object.entries(groupedRequirements).map(([type, subtypeMap]) => {
    const noSubtypeRequirements = subtypeMap[''] || []
    const subtypeItems: CollapseProps['items'] = Object.entries(subtypeMap)
      .filter(([subtype]) => Boolean(subtype))
      .map(([subtype, subtypeRequirements]) => ({
        key: subtype,
        label: `${subtype} (${subtypeRequirements.length})`,
        children: <div className="requirement-type-list">{subtypeRequirements.map(renderRequirement)}</div>,
      }))
    const count = Object.values(subtypeMap).reduce((total, list) => total + list.length, 0)

    return {
      key: type,
      label: `${type} (${count})`,
      children: (
        <div className="requirement-type-list">
          {noSubtypeRequirements.map(renderRequirement)}
          {subtypeItems.length > 0 && (
            <Collapse
              ghost
              size="small"
              items={subtypeItems}
              defaultActiveKey={subtypeItems.map(item => item?.key as string)}
              className="subtype-collapse"
            />
          )}
        </div>
      ),
    }
  })

  const changeProjectStatus = (status: MockProjectStatus) => {
    const actionLabel = status === 'archived' ? '归档' : '恢复'
    Modal.confirm({
      title: `${actionLabel}项目`,
      content: `确认${actionLabel}“${project.name}”吗？`,
      okText: actionLabel,
      cancelText: '取消',
      okType: status === 'archived' ? 'danger' : 'primary',
      onOk: () => {
        updateProjectStatus(project.id, status)
        message.success(`项目已${actionLabel}`)
      },
    })
  }

  const permanentlyDeleteProject = () => {
    if (deleteConfirmation !== project.name) return
    deleteProject(project.id)
    message.success('项目已永久删除（mock）')
    navigate('/')
  }

  const downloadSnapshot = () => {
    const blob = new Blob([JSON.stringify(selectedVersion.snapshot, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.name}-v${selectedVersion.versionNumber}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="workspace-container platform-workspace">
      <aside className="workspace-left">
        <div className="panel-header platform-project-panel-header">
          <div className="platform-project-title">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/')}
              title="返回项目列表"
            />
            <div>
              <h3>{project.name}</h3>
              <span>v{selectedVersion.versionNumber} · 需求列表</span>
            </div>
          </div>
          <LockOutlined className="platform-readonly-lock" title="只读快照" />
        </div>

        <div className="requirement-list">
          {requirements.length > 0 ? (
            <Collapse
              ghost
              items={collapseItems}
              defaultActiveKey={Object.keys(groupedRequirements)}
            />
          ) : (
            <div className="list-empty">当前版本暂无需求</div>
          )}
        </div>

        <div className="panel-footer platform-project-footer">
          <div className="platform-project-meta-row">
            <span>项目状态</span>
            <span className={`platform-status-badge ${project.status}`}>
              {project.status === 'active' ? '正常' : '已归档'}
            </span>
          </div>
          <div className="platform-project-source" title={project.sourceInstallationId}>
            来源 ID：{project.sourceInstallationId.slice(0, 13)}...
          </div>
          {project.status === 'active' ? (
            <Button danger block onClick={() => changeProjectStatus('archived')}>归档项目</Button>
          ) : (
            <div className="platform-project-footer-actions">
              <Button icon={<UndoOutlined />} block onClick={() => changeProjectStatus('active')}>恢复项目</Button>
              <Button danger icon={<DeleteOutlined />} block onClick={() => setDeleteDialogOpen(true)}>
                永久删除
              </Button>
            </div>
          )}
        </div>
      </aside>

      <section className="workspace-center">
        <div className="center-content">
          {centerView === 'overview' && (
            <RequirementOverview
              requirement={currentRequirement}
              versions={[]}
              projectKey={project.id}
              readOnly
              onSectionClick={section => {
                setSelectedSection(section)
                setCenterView('dimension')
              }}
            />
          )}
          {centerView === 'dimension' && currentRequirement && selectedSection && (
            <ReadonlyDimensionViewer
              key={`${selectedVersion.id}-${currentRequirement.id}-${selectedSection}`}
              requirement={currentRequirement}
              sectionKey={selectedSection}
              onBack={() => {
                setSelectedSection(null)
                setCenterView('overview')
              }}
            />
          )}
        </div>
      </section>

      <aside className={`workspace-right${rightCollapsed ? ' workspace-right-collapsed' : ''}`}>
        <div
          className="right-collapse-bar"
          onClick={() => setRightCollapsed(current => !current)}
          title={rightCollapsed ? '展开版本面板' : '收起版本面板'}
        >
          <span className="right-collapse-icon">{rightCollapsed ? '‹' : '›'}</span>
        </div>
        {!rightCollapsed && (
          <div className="workspace-right-content">
            <div className="version-panel">
              <div className="panel-header platform-version-header">
                <h3>发布版本</h3>
                <Button size="small" type="text" icon={<DownloadOutlined />} onClick={downloadSnapshot}>
                  下载
                </Button>
              </div>
              <div className="version-list">
                {project.versions.map(version => (
                  <button
                    type="button"
                    key={version.id}
                    className={`version-item platform-version-item${version.id === selectedVersion.id ? ' current' : ''}`}
                    onClick={() => navigate(`/projects/${project.id}/versions/${version.id}`)}
                  >
                    <div className="version-header">
                      <span className="version-number">v{version.versionNumber}</span>
                      <span className="version-date">{formatPlatformDate(version.createdAt)}</span>
                    </div>
                    <div className="version-info">
                      <span className="version-author">{version.versionLabel || '未设置版本标签'}</span>
                      <span className="version-desc">{version.releaseNotes || '暂无发布说明'}</span>
                    </div>
                    {version.deduplicated && (
                      <span className="platform-deduplicated-badge">内容已去重</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="platform-version-summary">
                <Badge status="default" text={`快照 schema v${selectedVersion.snapshot.schema_version}`} />
              </div>
            </div>
          </div>
        )}
      </aside>

      <Modal
        open={deleteDialogOpen}
        title="永久删除项目"
        okText="永久删除"
        okType="danger"
        cancelText="取消"
        okButtonProps={{ disabled: deleteConfirmation !== project.name }}
        onOk={permanentlyDeleteProject}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setDeleteConfirmation('')
        }}
      >
        <p className="platform-delete-confirm-copy">
          此操作无法撤销。请输入项目名称 <strong>{project.name}</strong> 以确认。
        </p>
        <Input
          value={deleteConfirmation}
          placeholder="输入完整项目名称"
          onChange={event => setDeleteConfirmation(event.target.value)}
        />
      </Modal>
    </div>
  )
}

export default PlatformProjectDetail
