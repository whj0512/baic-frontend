import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import LeftBar from '../components/LeftBar'
import type { Project } from '../models/Project'
import './ProjectManagement.css'

// Mock data
const MOCK_PROJECTS: Project[] = [
  { id: 1, name: '车载娱乐系统需求', code: 'REQ-2023-001', manager: '张三', createTime: '2023-10-01', status: 'active' },
  { id: 2, name: '自动驾驶辅助系统', code: 'REQ-2023-002', manager: '李四', createTime: '2023-10-05', status: 'active' },
  { id: 3, name: '电池管理系统', code: 'REQ-2023-003', manager: '王五', createTime: '2023-10-10', status: 'completed' },
  { id: 4, name: '车身控制模块', code: 'REQ-2023-004', manager: '赵六', createTime: '2023-10-15', status: 'active' },
]

function ProjectManagement() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  
  // Default to 'system' if type is not provided
  const activeTab = type || 'system'

  const tabs = [
    { id: 'system', label: '系统需求' },
    { id: 'subsystem', label: '子系统需求' },
    { id: 'software', label: '软件需求' },
    { id: 'component', label: '部件需求' },
    // Including artifacts if navigated from Home, though prompt didn't explicitly list it in the tab requirements
    { id: 'artifacts', label: '制品间关系' }, 
  ]

  const handleTabClick = (tabId: string) => {
    navigate(`/project/${tabId}`)
  }

  // Filter projects based on tab? 
  // For now, since we only have generic mock data, we'll just show the same list 
  // or maybe filter randomly to show interactivity if needed. 
  // Let's just show all for now as the prompt focuses on structure.
  const projects = MOCK_PROJECTS

  return (
    <div className="pm-container">
      <TopBar />
      <LeftBar />
      
      <main className="pm-content">
        <div className="pm-header">
          <h2>需求项目管理</h2>
          <button className="create-btn">新建项目</button>
        </div>

        <div className="pm-tabs">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`pm-tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="pm-list-container">
          <table className="pm-table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>项目代号</th>
                <th>负责人</th>
                <th>创建时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.code}</td>
                  <td>{project.manager}</td>
                  <td>{project.createTime}</td>
                  <td>
                    <span className={`status-badge ${project.status}`}>
                      {project.status === 'active' ? '进行中' : project.status === 'completed' ? '已完成' : '已归档'}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn">查看</button>
                    <button className="action-btn">编辑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export default ProjectManagement
