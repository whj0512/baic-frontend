import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { API_ENDPOINTS, authFetch } from '../config/api'
import './CreateProject.css'

function CreateProject() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
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
      // 自动基于项目名称生成符合要求的唯一项目标识
      const cleanName = formData.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
      const baseKey = cleanName || 'proj'
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const projectKey = `${baseKey}-${randomSuffix}`

      const response = await authFetch(API_ENDPOINTS.projects, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: projectKey,
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
        <p>为项目设置名称和简要说明，创建后可继续在工作区完善需求。</p>
      </div>

      <form className="create-project-form" onSubmit={handleSubmit}>
        <div className="create-project-form-intro">
          <span className="create-project-form-kicker">基本信息</span>
          <p>项目名称用于识别与检索，建议使用简洁明确的名称。</p>
        </div>

        <div className="create-project-field">
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

        <div className="create-project-field">
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
