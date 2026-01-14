import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pagination, Modal, message } from 'antd'
import type { Requirement } from '../models/Requirement'
import './ProjectDetail.css'

// Generate mock requirements
const INITIAL_REQUIREMENTS: Requirement[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: `需求项 ${i + 1}`,
  description: `这是需求项 ${i + 1} 的详细描述内容...`,
  priority: i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low',
  status: i % 3 === 0 ? 'Open' : i % 3 === 1 ? 'In Progress' : 'Done',
  assignee: `开发人员 ${String.fromCharCode(65 + (i % 5))}`
}))

function ProjectDetail() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const [requirements, setRequirements] = useState<Requirement[]>(INITIAL_REQUIREMENTS)
  const [currentPage, setCurrentPage] = useState(1)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedReqIds, setSelectedReqIds] = useState<number[]>([])
  
  const pageSize = 10

  // Calculate pagination
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentRequirements = requirements.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleBack = () => {
    navigate(`/project/${type}`)
  }

  // Selection Logic
  const toggleSelectionMode = () => {
    if (isSelectionMode && selectedReqIds.length > 0) {
      showDeleteConfirm()
    } else {
      setIsSelectionMode(!isSelectionMode)
      if (isSelectionMode) {
        setSelectedReqIds([])
      }
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const currentIds = currentRequirements.map(req => req.id)
      const newSelection = [...new Set([...selectedReqIds, ...currentIds])]
      setSelectedReqIds(newSelection)
    } else {
      const currentIds = currentRequirements.map(req => req.id)
      setSelectedReqIds(selectedReqIds.filter(id => !currentIds.includes(id)))
    }
  }

  const handleSelectOne = (id: number) => {
    if (selectedReqIds.includes(id)) {
      setSelectedReqIds(selectedReqIds.filter(itemId => itemId !== id))
    } else {
      setSelectedReqIds([...selectedReqIds, id])
    }
  }

  const showDeleteConfirm = () => {
    Modal.confirm({
      title: '确认删除',
      content: `您确定要删除选中的 ${selectedReqIds.length} 个需求项吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        handleDelete()
      },
    })
  }

  const handleDelete = () => {
    const newRequirements = requirements.filter(req => !selectedReqIds.includes(req.id))
    setRequirements(newRequirements)
    setIsSelectionMode(false)
    setSelectedReqIds([])
    message.success('需求项已删除')
    
    const maxPage = Math.ceil(newRequirements.length / pageSize)
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage)
    }
  }

  const isAllSelected = currentRequirements.length > 0 && currentRequirements.every(req => selectedReqIds.includes(req.id))

  return (
    <div className="pd-content-wrapper">
      <div className="pd-header">
        <div className="pd-title-section">
          <button className="back-btn" onClick={handleBack}>
            ← 返回
          </button>
          <div className="pd-info">
            <h2>项目详情 (ID: {id})</h2>
            <span className="pd-type-badge">{type?.toUpperCase()}</span>
          </div>
        </div>
        <div className="pd-actions">
          <button 
            className={`delete-req-btn ${isSelectionMode ? 'active' : ''}`}
            onClick={toggleSelectionMode}
          >
            {isSelectionMode ? (selectedReqIds.length > 0 ? '确认删除' : '取消选择') : '删除需求'}
          </button>
          <button className="create-req-btn">新建需求</button>
        </div>
      </div>

      <div className="pd-list-container">
        <table className="pd-table">
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
              <th>ID</th>
              <th>需求标题</th>
              <th>描述</th>
              <th>优先级</th>
              <th>状态</th>
              <th>负责人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {currentRequirements.map((req) => (
              <tr key={req.id}>
                {isSelectionMode && (
                  <td className="selection-col">
                    <input 
                      type="checkbox" 
                      checked={selectedReqIds.includes(req.id)}
                      onChange={() => handleSelectOne(req.id)}
                    />
                  </td>
                )}
                <td>{req.id}</td>
                <td>{req.title}</td>
                <td className="desc-cell" title={req.description}>{req.description}</td>
                <td>
                  <span className={`priority-badge ${req.priority.toLowerCase()}`}>
                    {req.priority}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${req.status.toLowerCase().replace(' ', '-')}`}>
                    {req.status}
                  </span>
                </td>
                <td>{req.assignee}</td>
                <td>
                  <button className="action-btn">编辑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pd-pagination">
          <Pagination 
            current={currentPage} 
            total={requirements.length} 
            pageSize={pageSize}
            onChange={handlePageChange}
            align="end" 
          />
        </div>
      </div>
    </div>
  )
}

export default ProjectDetail
