import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import './CreateProject.css'

type TabKey = 'environment' | 'interaction' | 'internalComposition' | 'moduleResponses';

function CreateProject() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('environment')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'system',
    // Fields for the new tabs
    environment: '',
    interaction: '',
    internalComposition: '',
    moduleResponses: '',
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
    // TODO: Implement actual project creation logic here
    console.log('Creating project:', formData)
    message.success('需求项目创建成功')
    // Navigate to the newly created project's detail page (mock ID 999)
    navigate(`/project/${formData.type}/999`)
  }

  const handleCancel = () => {
    navigate(-1)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'environment':
        return (
          <textarea
            name="environment"
            className="form-textarea"
            placeholder="描述项目所处的物理和逻辑环境..."
            value={formData.environment}
            onChange={handleChange}
            rows={8}
          />
        )
      case 'interaction':
        return (
          <textarea
            name="interaction"
            className="form-textarea"
            placeholder="描述项目与外部环境、用户或其他系统的交互方式..."
            value={formData.interaction}
            onChange={handleChange}
            rows={8}
          />
        )
      case 'internalComposition':
        return (
          <textarea
            name="internalComposition"
            className="form-textarea"
            placeholder="描述项目的内部模块、组件或子系统构成..."
            value={formData.internalComposition}
            onChange={handleChange}
            rows={8}
          />
        )
      case 'moduleResponses':
        return (
          <textarea
            name="moduleResponses"
            className="form-textarea"
            placeholder="描述内部模块之间如何响应彼此的事件或状态变化..."
            value={formData.moduleResponses}
            onChange={handleChange}
            rows={8}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="create-project-wrapper">
      <div className="create-project-header">
        <h2>新建需求项目</h2>
      </div>

      <form className="create-project-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">项目名称</label>
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
          <label htmlFor="type">项目类型</label>
          <select
            id="type"
            name="type"
            className="form-select"
            value={formData.type}
            onChange={handleChange}
          >
            <option value="system">系统需求</option>
            <option value="subsystem">子系统需求</option>
            <option value="software">软件需求</option>
            <option value="component">部件需求</option>
          </select>
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

        {/* Tabs Section */}
        <div className="tabs-container">
          <div className="tabs-nav">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'environment' ? 'active' : ''}`}
              onClick={() => setActiveTab('environment')}
            >
              所处环境
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'interaction' ? 'active' : ''}`}
              onClick={() => setActiveTab('interaction')}
            >
              与环境交互
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'internalComposition' ? 'active' : ''}`}
              onClick={() => setActiveTab('internalComposition')}
            >
              内部组成
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'moduleResponses' ? 'active' : ''}`}
              onClick={() => setActiveTab('moduleResponses')}
            >
              组成模块间的响应
            </button>
          </div>
          <div className="tab-content">
            {renderTabContent()}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={handleCancel}>
            返回
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
