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
  const projects: Project[] = [
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
      description: '飞行控制系统的需求规格说明，包括自动驾驶、姿态控制和导航功能的需求定义。',
      created_at: '2024-01-20T09:15:00Z',
      updated_at: '2024-02-05T16:45:00Z',
    },
    {
      id: '3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
      key: 'ECS',
      name: '环境控制系统',
      description: '机舱环境控制系统需求，负责温度调节、压力控制和空气质量管理相关需求。',
      created_at: '2024-02-01T10:00:00Z',
      updated_at: '2024-02-07T11:30:00Z',
    },
  ]

  const handleProjectClick = (projectKey: string) => {
    // 导航到项目详情页（暂时使用 key 作为路径）
    navigate(`/project/${projectKey}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div className="home-content-wrapper">
      {/* 页面标题 */}
      <div className="page-header">
        <h1 className="page-title">项目总览</h1>
        <p className="page-subtitle">管理和查看所有需求项目</p>
      </div>

      {/* 项目卡片列表 */}
      <div className="project-grid">
        {projects.map((project) => (
          <div
            key={project.id}
            className="project-card"
            onClick={() => handleProjectClick(project.key)}
          >
            <div className="project-card-header">
              <span className="project-key">{project.key}</span>
              <span className="project-updated">
                更新于 {formatDate(project.updated_at)}
              </span>
            </div>
            <h2 className="project-name">{project.name}</h2>
            <p className="project-description">{project.description}</p>
            <div className="project-card-footer">
              <span className="project-created">
                创建于 {formatDate(project.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Home
