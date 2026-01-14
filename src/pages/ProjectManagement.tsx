import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pagination, Modal, message } from 'antd'
import TopBar from '../components/TopBar'
import LeftBar from '../components/LeftBar'
import type { Project } from '../models/Project'
import './ProjectManagement.css'

// Generate 50 mock projects
const INITIAL_PROJECTS: Project[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `示例项目 ${i + 1}`,
  type: i % 3 === 0 ? 'System' : i % 3 === 1 ? 'Subsystem' : 'Component',
  lastModified: `2023-10-${(i % 30) + 1}`.replace(/-(\d)$/, '-0$1'), // Simple date formatting
  requirementCount: Math.floor(Math.random() * 500) + 10,
  version: `v${Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 10)}`
}))

function ProjectManagement() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS)
  const [currentPage, setCurrentPage] = useState(1)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([])
  
  const pageSize = 10

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
    setCurrentPage(1) // Reset to first page on tab change
    setIsSelectionMode(false)
    setSelectedProjectIds([])
  }

  // Calculate pagination
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentProjects = projects.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Selection Logic
  const toggleSelectionMode = () => {
    if (isSelectionMode && selectedProjectIds.length > 0) {
      // If currently in selection mode and items are selected, show delete confirmation
      showDeleteConfirm()
    } else {
      // Toggle mode and clear selection if exiting
      setIsSelectionMode(!isSelectionMode)
      if (isSelectionMode) {
        setSelectedProjectIds([])
      }
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const currentIds = currentProjects.map(p => p.id)
      // Add current page items to selection (prevent duplicates)
      const newSelection = [...new Set([...selectedProjectIds, ...currentIds])]
      setSelectedProjectIds(newSelection)
    } else {
      // Remove current page items from selection
      const currentIds = currentProjects.map(p => p.id)
      setSelectedProjectIds(selectedProjectIds.filter(id => !currentIds.includes(id)))
    }
  }

  const handleSelectOne = (id: number) => {
    if (selectedProjectIds.includes(id)) {
      setSelectedProjectIds(selectedProjectIds.filter(itemId => itemId !== id))
    } else {
      setSelectedProjectIds([...selectedProjectIds, id])
    }
  }

  const showDeleteConfirm = () => {
    Modal.confirm({
      title: '确认删除',
      content: `您确定要删除选中的 ${selectedProjectIds.length} 个项目吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        handleDelete()
      },
    })
  }

  const handleDelete = () => {
    const newProjects = projects.filter(p => !selectedProjectIds.includes(p.id))
    setProjects(newProjects)
    setIsSelectionMode(false)
    setSelectedProjectIds([])
    message.success('项目已删除')
    
    // Adjust pagination if necessary
    const maxPage = Math.ceil(newProjects.length / pageSize)
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage)
    }
  }

  const isAllSelected = currentProjects.length > 0 && currentProjects.every(p => selectedProjectIds.includes(p.id))

  return (
    <div className="pm-container">
      <TopBar />
      <LeftBar />
      
      <main className="pm-content">
        <div className="pm-header">
          <h2>需求项目总览</h2>
          <div className="pm-actions">
            <button 
              className={`delete-btn ${isSelectionMode ? 'active' : ''}`} 
              onClick={toggleSelectionMode}
            >
              {isSelectionMode ? (selectedProjectIds.length > 0 ? '确认删除' : '取消选择') : '删除项目'}
            </button>
            <button className="create-btn">新建项目</button>
          </div>
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
                {isSelectionMode && (
                  <th className="selection-col">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
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
              {currentProjects.map((project) => (
                <tr key={project.id}>
                  {isSelectionMode && (
                    <td className="selection-col">
                      <input 
                        type="checkbox" 
                        checked={selectedProjectIds.includes(project.id)}
                        onChange={() => handleSelectOne(project.id)}
                      />
                    </td>
                  )}
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
            <Pagination 
              current={currentPage} 
              total={projects.length} 
              pageSize={pageSize}
              onChange={handlePageChange}
              align="end" 
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProjectManagement
