import { useParams, useNavigate } from 'react-router-dom'
import { Pagination } from 'antd'
import TopBar from '../components/TopBar'
import LeftBar from '../components/LeftBar'
import type { Project } from '../models/Project'
import './ProjectManagement.css'

// Mock data
const MOCK_PROJECTS: Project[] = [
  { id: 1, name: '车载娱乐系统需求', type: 'System', lastModified: '2023-10-01', requirementCount: 150, version: 'v1.0' },
  { id: 2, name: '自动驾驶辅助系统', type: 'System', lastModified: '2023-10-05', requirementCount: 320, version: 'v2.1' },
  { id: 3, name: '电池管理系统', type: 'Subsystem', lastModified: '2023-10-10', requirementCount: 85, version: 'v1.2' },
  { id: 4, name: '车身控制模块', type: 'Component', lastModified: '2023-10-15', requirementCount: 45, version: 'v0.9' },
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
          <h2>需求项目总览</h2>
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
                <th>项目ID</th>
                <th>项目名称</th>
                <th>项目类型</th>
                <th>最新修改时间</th>
                <th>需求数</th>
                <th>版本</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.id}</td>
                  <td>{project.name}</td>
                  <td>{project.type}</td>
                  <td>{project.lastModified}</td>
                  <td>{project.requirementCount}</td>
                  <td>
                    <select 
                      className="version-select" 
                      defaultValue={project.version}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value={project.version}>{project.version}</option>
                      <option value="v1.0">v1.0</option>
                      <option value="v1.1">v1.1</option>
                    </select>
                  </td>
                  <td>
                    <button className="action-btn">查看</button>
                    <button className="action-btn">编辑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pm-pagination">
            <Pagination defaultCurrent={1} total={MOCK_PROJECTS.length} align="end" />
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProjectManagement
