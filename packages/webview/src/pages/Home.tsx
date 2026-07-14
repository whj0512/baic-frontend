import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, message, Spin } from 'antd'
import { API_ENDPOINTS, authFetch } from '../config/api'
import EntityManagement from './EntityManagement'
import PublishProjectDialog from '../components/PublishProjectDialog'
import './Home.css'
import type { Project } from '../models/Project'

function Home() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEntityManagement, setShowEntityManagement] = useState(false)
  const [publishingProject, setPublishingProject] = useState<Project | null>(null)

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

  const handleProjectClick = (project: Project) => {
    navigate(`/workspace/${project.id || project.key}`)
  }

  const showSingleDeleteConfirm = (projectId: string, name: string) => {
    Modal.confirm({
      title: '确认删除项目',
      content: `您确定要删除项目 "${name}" 吗？此操作将把项目移至回收站（软删除），不可撤销。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        setLoading(true)
        try {
          const response = await authFetch(`${API_ENDPOINTS.projects}/${projectId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.detail || '删除失败')
          }

          message.success(`项目 "${name}" 已成功删除`)
          setProjects((prev) => prev.filter((p) => p.id !== projectId))
        } catch (error: any) {
          console.error('Delete project error:', error)
          message.error(error.message || '删除项目失败，请稍后重试')
          // 重新拉取以确保状态一致
          fetchProjects()
        } finally {
          setLoading(false)
        }
      },
    })
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
      (project.key || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (showEntityManagement) {
    return <EntityManagement onBack={() => setShowEntityManagement(false)} />
  }

  return (
    <div className="home-content-wrapper">
      {/* 页面标题 */}
      <div className="home-header">
        <h2>项目总览</h2>
        <div className="home-actions">
          <button className="secondary-btn" onClick={() => setShowEntityManagement(true)}>
            实体管理
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
                    <td className="project-name">{project.name}</td>
                    <td className="project-description">{project.description}</td>
                    <td>{formatDate(project.created_at)}</td>
                    <td>{formatDate(project.updated_at)}</td>
                    <td className="actions-cell">
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleProjectClick(project)}
                      >
                        查看
                      </button>
                      <button
                        className="action-btn publish-btn"
                        onClick={() => setPublishingProject(project)}
                      >
                        发布
                      </button>
                      <button
                        className="action-btn delete-action-btn"
                        onClick={() => showSingleDeleteConfirm(project.id, project.name)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-state">
                    没有找到匹配的项目
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Spin>
      </div>
      <PublishProjectDialog
        open={Boolean(publishingProject)}
        project={publishingProject}
        onClose={() => setPublishingProject(null)}
      />
    </div>
  )
}

export default Home
