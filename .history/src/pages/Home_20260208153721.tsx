import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'

interface Project {
  id: string
  key: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleProjectClick = (projectKey: string, e: React.MouseEvent) => {
    // 如果点击的是复选框区域，不触发导航
    if ((e.target as HTMLElement).closest('.project-checkbox-wrapper')) {
      return
    }
    // 导航到项目详情页（暂时使用 key 作为路径）
    navigate(`/project/${projectKey}`)
  }

  const handleCheckboxChange = (projectId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleDelete = () => {
    if (selectedIds.size === 0) {
      alert('请先选择要删除的项目')
      return
    }
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 个项目吗？`)) {
      setProjects((prev) => prev.filter((p) => !selectedIds.has(p.id)))
      setSelectedIds(new Set())
    }
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

  return (
    <div className="home-content-wrapper">
      {/* 页面标题 */}
      <div className="page-header">
        <h1 className="page-title">项目总览</h1>
        <p className="page-subtitle">管理和查看所有需求项目</p>
      </div>

      {/* 操作栏 */}
      <div className="toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="search-input"
            placeholder="搜索项目名称、标识或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-right">
          <button className="btn btn-danger" onClick={handleDelete}>
            删除
          </button>
          <button className="btn btn-primary" onClick={handleAdd}>
            新增
          </button>
        </div>
      </div>

      {/* 项目列表 */}
      <div className="project-list">
        {/* 表头 */}
        <div className="project-list-header">
          <div className="project-checkbox-wrapper">
            <input
              type="checkbox"
              checked={
                filteredProjects.length > 0 &&
                filteredProjects.every((p) => selectedIds.has(p.id))
              }
              onChange={handleSelectAll}
            />
          </div>
          <div className="project-key-col">标识</div>
          <div className="project-name-col">项目名称</div>
          <div className="project-description-col">描述</div>
          <div className="project-created-col">创建时间</div>
          <div className="project-updated-col">更新时间</div>
        </div>

        {/* 列表项 */}
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`project-list-item ${selectedIds.has(project.id) ? 'selected' : ''}`}
              onClick={(e) => handleProjectClick(project.key, e)}
            >
              <div className="project-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={selectedIds.has(project.id)}
                  onChange={() => handleCheckboxChange(project.id)}
                />
              </div>
              <div className="project-key-col">
                <span className="project-key-badge">{project.key}</span>
              </div>
              <div className="project-name-col">{project.name}</div>
              <div className="project-description-col">{project.description}</div>
              <div className="project-created-col">{formatDate(project.created_at)}</div>
              <div className="project-updated-col">{formatDate(project.updated_at)}</div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>没有找到匹配的项目</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
