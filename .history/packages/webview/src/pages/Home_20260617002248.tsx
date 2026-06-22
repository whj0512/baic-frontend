import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, message, Spin } from 'antd'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './Home.css'
import type { Project } from '../models/Project'

function Home() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await authFetch(API_ENDPOINTS.projects)
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      const data = await response.json()
      // v2 API 返回 { projects: [...] }，兼容直接返回数组的情况
      setProjects(Array.isArray(data) ? data : (data.projects || []))
    } catch (error) {
      console.error('Error fetching projects:', error)
      message.error('获取项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleProjectClick = (projectKey: string) => {
    if (!isSelectionMode) {
      navigate(`/workspace/${projectKey}`)
    }
  }

  const toggleSelectionMode = () => {
    if (isSelectionMode && selectedIds.size > 0) {
      showDeleteConfirm()
    } else {
      setIsSelectionMode(!isSelectionMode)
      if (isSelectionMode) {
        setSelectedIds(new Set())
      }
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const showDeleteConfirm = () => {
    Modal.confirm({
      title: '确认删除',
      content: `您确定要删除选中的 ${selectedIds.size} 个项目吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        handleDelete()
      },
    })
  }

  const handleDelete = () => {
    setProjects((prev) => prev.filter((p) => !selectedIds.has(p.id)))
    setIsSelectionMode(false)
    setSelectedIds(new Set())
    message.success('项目已删除')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // 过滤项目
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isAllSelected =
    filteredProjects.length > 0 &&
    filteredProjects.every((p) => selectedIds.has(p.id))

  return (
    <div className="home-content-wrapper">
      {/* 页面标题 */}
      <div className="home-header">
        <h2>项目总览</h2>
        <div className="home-actions">
          <button
            className={`delete-btn ${isSelectionMode ? 'active' : ''}`}
            onClick={toggleSelectionMode}
          >
            {isSelectionMode
              ? selectedIds.size > 0
                ? '确认删除'
                : '取消选择'
              : '删除项目'}
          </button>
          <button className="create-btn" onClick={() => navigate('/create-project')}>
            新建项目
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="home-search">
        <input
          type="text"
          className="search-input"
          placeholder="搜索项目名称、标识或描述..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 项目列表 */}
      <div className="home-list-container">
        <Spin spinning={loading}>
          <table className="home-table">
            <thead>
              <tr>
                {isSelectionMode && (
                  <th className="selection-col">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th>项目名称</th>
                <th>描述</th>
                <th>创建时间</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <tr key={project.id}>
                    {isSelectionMode && (
                      <td className="selection-col">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(project.id)}
                          onChange={() => handleSelectOne(project.id)}
                        />
                      </td>
                    )}
                    {/* <td>
                      <span className="project-key-badge">{project.key}</span>
                    </td> */}
                    <td className="project-name">{project.name}</td>
                    <td className="project-description">{project.description}</td>
                    <td>{formatDate(project.created_at)}</td>
                    <td>{formatDate(project.updated_at)}</td>
                    <td>
                      <button
                        className="action-btn"
                        onClick={() => handleProjectClick(project.key)}
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isSelectionMode ? 7 : 6} className="empty-state">
                    没有找到匹配的项目
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Spin>
      </div>
    </div>
  )
}

export default Home
