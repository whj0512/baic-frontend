import { useDeferredValue, useMemo } from 'react'
import { Pagination, Select } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePlatformMock } from '../../platform/PlatformMockProvider'
import type { MockUploadStatus } from '../../platform/mockTypes'
import { formatPlatformDate } from '../../platform/display'
import '../Home.css'
import './PlatformPages.css'

const PAGE_SIZE = 8

const STATUS_LABELS: Record<MockUploadStatus, string> = {
  processing: '处理中',
  succeeded: '成功',
  failed: '失败',
  deduplicated: '已去重',
}

function PlatformUploads() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { projects, uploads } = usePlatformMock()
  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const status = searchParams.get('status') ?? 'all'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const filteredUploads = useMemo(() => uploads.filter(upload => {
    const matchesStatus = status === 'all' || upload.status === status
    const matchesQuery = !deferredQuery || [upload.id, upload.projectId, upload.projectName]
      .some(value => value.toLowerCase().includes(deferredQuery))
    return matchesStatus && matchesQuery
  }), [deferredQuery, status, uploads])

  const pagedUploads = useMemo(() => (
    filteredUploads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  ), [filteredUploads, page])

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

  const openUploadProject = (projectId: string, versionId?: string) => {
    if (!projects.some(project => project.id === projectId)) return
    navigate(versionId
      ? `/projects/${projectId}/versions/${versionId}`
      : `/projects/${projectId}`)
  }

  return (
    <div className="home-content-wrapper">
      <div className="home-header">
        <h2>上传记录</h2>
        <div className="home-actions">
          <button className="secondary-btn" onClick={() => navigate('/')}>
            返回项目管理
          </button>
        </div>
      </div>

      <div className="platform-filter-row">
        <div className="home-search">
          <input
            type="search"
            className="search-input"
            placeholder="搜索上传 ID、项目名称或项目 ID..."
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
            { value: 'processing', label: '处理中' },
            { value: 'succeeded', label: '成功' },
            { value: 'failed', label: '失败' },
            { value: 'deduplicated', label: '已去重' },
          ]}
        />
      </div>

      <div className="home-list-container">
        <div className="platform-table-scroll">
          <table className="home-table">
            <thead>
              <tr>
                <th>上传 ID</th>
                <th>项目</th>
                <th>状态</th>
                <th>目标版本</th>
                <th>来源安装 ID</th>
                <th>开始时间</th>
                <th>完成时间</th>
                <th>失败原因</th>
              </tr>
            </thead>
            <tbody>
              {pagedUploads.length > 0 ? pagedUploads.map(upload => (
                <tr key={upload.id}>
                  <td className="platform-mono">{upload.id}</td>
                  <td>
                    <button
                      className="action-btn view-btn"
                      disabled={!projects.some(project => project.id === upload.projectId)}
                      onClick={() => openUploadProject(upload.projectId, upload.versionId)}
                    >
                      {upload.projectName}
                    </button>
                  </td>
                  <td>
                    <span className={`platform-status-badge ${upload.status}`}>
                      {STATUS_LABELS[upload.status]}
                    </span>
                  </td>
                  <td>{upload.versionNumber ? `v${upload.versionNumber}` : '—'}</td>
                  <td className="platform-mono" title={upload.sourceInstallationId}>
                    {upload.sourceInstallationId.slice(0, 8)}...
                  </td>
                  <td>{formatPlatformDate(upload.createdAt)}</td>
                  <td>{formatPlatformDate(upload.completedAt)}</td>
                  <td className="platform-error-text">{upload.errorMessage ?? '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="empty-state">没有找到匹配的上传记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="platform-table-footer">
          <Pagination
            current={Math.min(page, Math.max(1, Math.ceil(filteredUploads.length / PAGE_SIZE)))}
            pageSize={PAGE_SIZE}
            total={filteredUploads.length}
            showSizeChanger={false}
            showTotal={total => `共 ${total} 条记录`}
            onChange={nextPage => updateFilters({ page: nextPage })}
          />
        </div>
      </div>
    </div>
  )
}

export default PlatformUploads
