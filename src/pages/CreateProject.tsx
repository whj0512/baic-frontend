import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import type { Project } from '../models/Project'
import './CreateProject.css'

function CreateProject() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 创建完整的 Project 对象
    const newProject: Project = {
      id: crypto.randomUUID(),
      key: formData.key,
      name: formData.name,
      description: formData.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // TODO: Implement actual project creation logic here
    console.log('Creating project:', newProject)
    message.success('项目创建成功')

    // 导航回首页
    navigate('/')
  }

  const handleCancel = () => {
    navigate(-1)
  }

  return (
    <div className="create-project-wrapper">
      <div className="create-project-header">
        <h2>新建项目</h2>
      </div>

      <form className="create-project-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="key">项目标识 <span className="required">*</span></label>
          <input
            type="text"
            id="key"
            name="key"
            className="form-input"
            placeholder="请输入项目标识（如：AVCS, FCS）"
            value={formData.key}
            onChange={handleChange}
            required
            pattern="[A-Za-z0-9_-]+"
            title="项目标识只能包含字母、数字、下划线和连字符"
          />
          <small className="form-hint">项目的唯一标识符，用于快速识别项目</small>
        </div>

        <div className="form-group">
          <label htmlFor="name">项目名称 <span className="required">*</span></label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-input"
            placeholder="请输入项目名称"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">项目描述</label>
          <textarea
            id="description"
            name="description"
            className="form-textarea"
            placeholder="请输入项目描述"
            value={formData.description}
            onChange={handleChange}
            rows={5}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={handleCancel}>
            取消
          </button>
          <button type="submit" className="submit-btn">
            创建
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateProject