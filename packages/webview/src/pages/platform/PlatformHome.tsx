import { useDeferredValue, useMemo, useState } from 'react'
import { Input, Modal, Pagination, Select, message } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePlatformMock } from '../../platform/PlatformMockProvider'
import type { MockPlatformProject, MockProjectStatus } from '../../platform/mockTypes'
import { formatPlatformDate } from '../../platform/display'
import '../Home.css'
import './PlatformPages.css'

const PAGE_SIZE = 10

function PlatformHome() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { projects, updateProjectStatus, deleteProject } = usePlatformMock()
  const [deleteTarget, setDeleteTarget] = useState<MockPlatformProject | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const status = searchParams.get('status') ?? 'all'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const filteredProjects = useMemo(() => projects.filter(project => {
    const matchesStatus = status === 'all' || project.status === status
    const matchesQuery = !deferredQuery || [project.name, project.description, project.id]
      .some(value => value.toLowerCase().includes(deferredQuery))
    return matchesStatus && matchesQuery
  }), [deferredQuery, projects, status])

  const pagedProjects = useMemo(() => (
    filteredProjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  ), [filteredProjects, page])

  const updateFilters = (next: { q?: string; status?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams)
    if (next.q !== undefined) next.q ? params.set('q', next.q) : params.delete('q')
    if (next.status !== undefined) next.status === 'all'
      ? params.delete('status')
      : params.set('status', next.status)
    if (next.page !== undefined) next.page > 1
      ? params.set('page', String(next.page))
      : params.delete('page')
    setSearchParams(params)
  }

  const confirmStatusChange = (project: MockPlatformProject, nextStatus: MockProjectStatus) => {
    const actionLabel = nextStatus === 'archived' ? '归档' : '恢复'
    Modal.confirm({
      title: `${actionLabel}项目`,
      content: `确认${actionLabel}“${project.name}”吗？`,
      okText: actionLabel,
      cancelText: '取消',
      okType: nextStatus === 'archived' ? 'danger' : 'primary',
      onOk: () => {
        updateProjectStatus(project.id, nextStatus)
        message.success(`项目已${actionLabel}`)
      },
    })
  }

  const handleDelete = () => {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.name) return
    deleteProject(deleteTarget.id)
    setDeleteTarget(null)
    setDeleteConfirmation('')
    updateFilters({ page: 1 })
    message.success('项目已永久删除（mock）')
  }

  return (
    <div className="home-content-wrapper">
      <div className="home-header">
        <h2>远程项目总览</h2>
        <div className="home-actions">
          <button className="secondary-btn" onClick={() => navigate('/uploads')}>
            上传记录
          </button>
        </div>
      </div>

      <div className="platform-filter-row">
        <div className="home-search">
          <input
            type="search"
            className="search-input"
            placeholder="搜索项目名称、描述或远程项目 ID..."
            value={query}
            onChange={event => updateFilters({ q: event.target.value, page: 1 })}
          />
        </div>
        <Select
          className="platform-status-select"
          value={status}
          onChange={value => updateFilters({ status: value, page: 1 })}
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'active', label: '正常' },
            { value: 'archived', label: '已归档' },
          ]}
        />
      </div>

      <div className="home-list-container">
        <div className="platform-table-scroll">
          <table className="home-table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>描述</th>
                <th>状态</th>
                <th>最新版本</th>
                <th>版本数</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedProjects.length > 0 ? pagedProjects.map(project => (
                <tr key={project.id}>
                  <td className="project-name">{project.name}</td>
                  <td className="project-description" title={project.description}>{project.description}</td>
                  <td>
                    <span className={`platform-status-badge ${project.status}`}>
                      {project.status === 'active' ? '正常' : '已归档'}
                    </span>
                  </td>
                  <td>v{project.versions[0]?.versionNumber ?? '—'}</td>
                  <td>{project.versions.length}</td>
                  <td>{formatPlatformDate(project.updatedAt)}</td>
                  <td className="actions-cell">
                    <button className="action-btn view-btn" onClick={() => navigate(`/projects/${project.id}`)}>
                      查看
                    </button>
                    {project.status === 'active' ? (
                      <button
                        className="action-btn archive-action-btn"
                        onClick={() => confirmStatusChange(project, 'archived')}
                      >
                        归档
                      </button>
                    ) : (
                      <>
                        <button
                          className="action-btn restore-action-btn"
                          onClick={() => confirmStatusChange(project, 'active')}
                        >
                          恢复
                        </button>
                        <button
                          className="action-btn delete-action-btn"
                          onClick={() => setDeleteTarget(project)}
                        >
                          永久删除
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="empty-state">没有找到匹配的远程项目</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="platform-table-footer">
          <Pagination
            current={Math.min(page, Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE)))}
            pageSize={PAGE_SIZE}
            total={filteredProjects.length}
            showSizeChanger={false}
            showTotal={total => `共 ${total} 个项目`}
            onChange={nextPage => updateFilters({ page: nextPage })}
          />
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        title="永久删除项目"
        okText="永久删除"
        okType="danger"
        cancelText="取消"
        okButtonProps={{ disabled: !deleteTarget || deleteConfirmation !== deleteTarget.name }}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteConfirmation('')
        }}
      >
        <p className="platform-delete-confirm-copy">
          此操作无法撤销。请输入项目名称 <strong>{deleteTarget?.name}</strong> 以确认。
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

export default PlatformHome
