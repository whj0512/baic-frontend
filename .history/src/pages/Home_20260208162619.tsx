import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, message } from 'antd'
import './Home.css'
import type { Project } from '../models/Project'

function Home() {
  const navigate = useNavigate()

  // Mock 项目数据
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
      key: 'AVCS',
      name: 'BM001系统需求管理',
      description: 'BM001系统需求规格说明。',
      created_at: '2024-01-15T08:30:00Z',
      updated_at: '2024-02-08T14:20:00Z',
    },
    {
      id: '2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
      key: 'FCS',
      name: 'BM002系统需求管理',
      description: 'BM002系统需求规格说明。',
      created_at: '2024-01-20T09:15:00Z',
      updated_at: '2024-02-05T16:45:00Z',
    },
    {
      id: '3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
      key: 'ECS',
      name: 'BM003系统需求管理',
      description: 'BM003系统需求规格说明。',
      created_at: '2024-02-01T10:00:00Z',
      updated_at: '2024-02-07T11:30:00Z',
    },
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleProjectClick = (projectKey: string) => {
    if (!isSelectionMode) {
      navigate(`/project/${projectKey}`)
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

  const handleAdd = () => {
    const newId = crypto.randomUUID()
    const newKey = `PRJ${projects.length + 1}`
    const newProject: Project = {
      id: newId,
      key: newKey,
      name: `新项目 ${projects.length + 1}`,
      description: '项目描述',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setProjects((prev) => [...prev, newProject])
    message.success('项目已创建')
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
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
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
          <button className="create-btn" onClick={()=>navigate('/create-project')}>
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
              <th>标识</th>
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
                  <td>
                    <span className="project-key-badge">{project.key}</span>
                  </td>
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
      </div>
    </div>
  )
}

export default Home
