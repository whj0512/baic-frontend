import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './CreateProject.css'

function CreateProject() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSubmitting(true)
    try {
      const response = await authFetch(API_ENDPOINTS.projects, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: formData.key || null,
          name: formData.name || null,
          description: formData.description || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '创建失败')
      }

      message.success('项目创建成功')
      navigate('/')
    } catch (error: any) {
      console.error('Create project error:', error)
      message.error(error.message || '创建项目失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
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
          <button type="button" className="cancel-btn" onClick={handleCancel} disabled={submitting}>
            取消
          </button>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? '创建中...' : '创建'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateProject
