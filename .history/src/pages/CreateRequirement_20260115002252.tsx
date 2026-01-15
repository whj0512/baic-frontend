import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { message, Select } from 'antd'
import './CreateRequirement.css'

// Mock available requirements for relationship linking
const MOCK_AVAILABLE_REQS = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: `需求项 ${i + 1} (System)`,
}))

const RELATION_TYPES = [
  { value: 'Satisfies', label: 'Satisfies' },
  { value: 'Derives', label: 'Derives From' },
  { value: 'Refines', label: 'Refines' },
  { value: 'Trace', label: 'Traces To' },
  { value: 'Parent', label: 'Parent Of' },
  { value: 'Child', label: 'Child Of' },
]

interface RelationItem {
  reqId: number
  relationType: string
  reqLabel: string
}

type SectionKey = 'environment' | 'interaction' | 'internalComposition' | 'moduleResponses';

const SECTIONS: { key: SectionKey, label: string, placeholder: string }[] = [
  { key: 'environment', label: '所处环境', placeholder: '描述需求所处的物理和逻辑环境...' },
  { key: 'interaction', label: '与环境交互', placeholder: '描述需求与外部环境、用户或其他系统的交互方式...' },
  { key: 'internalComposition', label: '内部组成', placeholder: '描述需求的内部模块、组件或子系统构成...' },
  { key: 'moduleResponses', label: '组成模块间的响应', placeholder: '描述内部模块之间如何响应彼此的事件或状态变化...' },
]


function CreateRequirement() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    relationships: [] as RelationItem[],
    environment: '',
    interaction: '',
    internalComposition: '',
    moduleResponses: '',
  })

  // UI State
  const [currentRelationType, setCurrentRelationType] = useState('Satisfies')
  const [currentReqId, setCurrentReqId] = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddRelation = () => {
    if (!currentReqId) return

    const targetReq = MOCK_AVAILABLE_REQS.find(r => r.value === currentReqId)
    if (!targetReq) return

    const newRelation: RelationItem = {
      reqId: currentReqId,
      relationType: currentRelationType,
      reqLabel: targetReq.label
    }

    // Prevent exact duplicates
    const exists = formData.relationships.some(
      r => r.reqId === newRelation.reqId && r.relationType === newRelation.relationType
    )

    if (exists) {
      message.warning('该关系已存在')
      return
    }

    setFormData(prev => ({
      ...prev,
      relationships: [...prev.relationships, newRelation]
    }))
    
    // Reset selection but keep type
    setCurrentReqId(null)
  }

  const handleRemoveRelation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      relationships: prev.relationships.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement actual requirement creation logic here
    console.log('Creating requirement:', { ...formData, projectType: type, projectId: id })
    message.success('需求项创建成功')
    navigate(`/project/${type}/${id}`)
  }

  const handleCancel = () => {
    navigate(-1)
  }

  const handleSectionClick = (key: SectionKey) => {
    setActiveSection(prev => (prev === key ? null : key))
  }

  const getTypeName = (t: string | undefined) => {
    switch(t?.toLowerCase()) {
      case 'system': return '系统需求'
      case 'subsystem': return '子系统需求'
      case 'software': return '软件需求'
      case 'component': return '部件需求'
      default: return '需求'
    }
  }

  return (
    <div className="create-req-wrapper">
      <div className="create-req-header">
        <h2>新建{getTypeName(type)}项</h2>
        <span className="project-badge">项目ID: {id}</span>
      </div>

      <form className="create-req-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">需求名称</label>
          <input
            type="text"
            id="title"
            name="title"
            className="form-input"
            placeholder={`请输入${getTypeName(type)}名称`}
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>制品间关系</label>
          <div className="relation-input-row">
            <select
              className="form-select relation-type-select"
              value={currentRelationType}
              onChange={(e) => setCurrentRelationType(e.target.value)}
            >
              {RELATION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            
            <Select
              style={{ flex: 1 }}
              placeholder="选择关联需求"
              options={MOCK_AVAILABLE_REQS}
              value={currentReqId}
              onChange={setCurrentReqId}
              className="antd-select-custom"
            />
            
            <button 
              type="button" 
              className="add-relation-btn"
              onClick={handleAddRelation}
              disabled={!currentReqId}
            >
              添加
            </button>
          </div>

          {/* List of added relations */}
          {formData.relationships.length > 0 && (
            <div className="relations-list">
              {formData.relationships.map((rel, index) => (
                <div key={`${rel.reqId}-${rel.relationType}-${index}`} className="relation-item">
                  <span className="relation-tag">{rel.relationType}</span>
                  <span className="relation-arrow">→</span>
                  <span className="relation-target">{rel.reqLabel}</span>
                  <button 
                    type="button" 
                    className="remove-relation-btn"
                    onClick={() => handleRemoveRelation(index)}
                    title="移除关系"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Fields Example */}
        {type === 'software' && (
          <div className="form-group">
            <label htmlFor="platform">目标平台</label>
            <input
              type="text"
              id="platform"
              name="platform"
              className="form-input"
              placeholder="e.g. Linux, QNX, Android"
            />
          </div>
        )}

        {type === 'component' && (
          <div className="form-group">
            <label htmlFor="interface">接口定义</label>
            <input
              type="text"
              id="interface"
              name="interface"
              className="form-input"
              placeholder="e.g. CAN, Ethernet"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="description">需求描述</label>
          <textarea
            id="description"
            name="description"
            className="form-textarea"
            placeholder="请输入详细描述"
            value={formData.description}
            onChange={handleChange}
            rows={6}
          />
        </div>

        {/* Accordion List Section */}
        <div className="detail-list">
          {SECTIONS.map((section) => (
            <div key={section.key} className="detail-item">
              <div 
                className="detail-item-header"
                onClick={() => handleSectionClick(section.key)}
              >
                <span className="detail-text">{section.label}</span>
                <span className="detail-arrow">{activeSection === section.key ? '▾' : '›'}</span>
              </div>
            </div>
          ))}
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

export default CreateRequirement