import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { message, Select, Tabs, Upload, Button } from 'antd'
import { UploadOutlined, RobotOutlined, FormOutlined } from '@ant-design/icons'
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

// Mock AI Models
const AI_MODELS = [
  { value: 'gpt-4', label: 'GPT-4 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
]

interface RelationItem {
  reqId: number
  relationType: string
  reqLabel: string
}

type SectionKey = 'environment' | 'interaction' | 'internalComposition' | 'moduleResponses' | 'internalConstraints';

const SECTIONS: { key: SectionKey, label: string, placeholder: string }[] = [
  { key: 'environment', label: '所处环境', placeholder: '描述需求所处的物理和逻辑环境...' },
  { key: 'interaction', label: '与环境交互', placeholder: '描述需求与外部环境、用户或其他系统的交互方式...' },
  { key: 'internalComposition', label: '内部组成', placeholder: '描述需求的内部模块、组件 or 子系统构成...' },
  { key: 'moduleResponses', label: '组成模块间的响应', placeholder: '描述内部模块之间如何响应彼此的事件或状态变化...' },
  { key: 'internalConstraints', label: '内部约束', placeholder: '描述需求的内部约束条件...' },
]


function CreateRequirement() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Tab State
  const [activeTab, setActiveTab] = useState('manual')

  // Auto Gen State
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4')
  const [fileList, setFileList] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    relationships: [] as RelationItem[],
    environment: '',
    interaction: '',
    internalComposition: '',
    moduleResponses: '',
    internalConstraints: '',
    // Store canvas JSON data for each section
    canvasData: {} as Record<string, any>, 
  })
  
  // Initialize formData from location state if available (returning from section editor)
  useEffect(() => {
    if (location.state && location.state.formData) {
      setFormData(location.state.formData)
      // Optionally clear state to prevent overwriting if user navigates back again differently
      // history.replaceState({}, document.title) 
      // React Router's replace: navigate('.', { replace: true, state: {} }) but that might re-render.
      // For now, trust the latest state.
    }
  }, [location.state])

  // UI State
  const [currentRelationType, setCurrentRelationType] = useState('Satisfies')
  const [currentReqId, setCurrentReqId] = useState<number | null>(null)


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

  const handleSectionClick = (sectionKey: SectionKey, sectionLabel: string) => {
    // Navigate to section editor, passing current form data
    navigate(`/project/${type}/${id}/create/section/${sectionKey}`, {
      state: {
        formData,
        sectionLabel
      }
    })
  }

  // Mock Auto Analysis
  const handleAnalyze = () => {
    if (fileList.length === 0) {
      message.warning('请先上传文件')
      return
    }
    
    setIsAnalyzing(true)
    
    // Simulate API call
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        title: '自动生成的制动系统需求',
        description: '本需求描述了车辆在紧急制动情况下的系统响应行为，基于上传的文档自动提取。',
        environment: '车辆行驶在干燥沥青路面上，车速为80km/h。',
        interaction: '驾驶员踩下制动踏板，深度超过80%。',
        internalComposition: '制动控制器(BCU)、液压执行单元(HEU)、轮速传感器。',
        moduleResponses: 'BCU接收踏板信号，计算目标制动力，发送指令给HEU；HEU建立液压；轮速传感器反馈车速。',
      }))
      setIsAnalyzing(false)
      message.success('解析完成，内容已自动填充')
      setActiveTab('manual') // Switch back to manual tab to show results
    }, 2000)
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

  const renderManualForm = () => (
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
                onClick={() => handleSectionClick(section.key, section.label)}
              >
                <span className="detail-text">{section.label}</span>
                <span className="detail-arrow">›</span>
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
  )

  const renderAutoGenerate = () => (
    <div className="auto-generate-container">
      <div className="auto-gen-info">
        <h3><RobotOutlined /> 智能需求生成</h3>
        <p>上传需求文档或技术规范，AI 将自动提取关键信息并填充到表单中。</p>
      </div>

      <div className="form-group">
        <label>选择大模型</label>
        <Select
          size="large"
          value={selectedModel}
          onChange={setSelectedModel}
          options={AI_MODELS}
          className="model-select"
        />
      </div>

      <div className="form-group">
        <label>上传文档</label>
        <Upload.Dragger
          name="file"
          multiple={false}
          fileList={fileList}
          beforeUpload={(file) => {
            setFileList([file])
            return false // Prevent auto upload
          }}
          onRemove={() => setFileList([])}
          className="upload-dragger"
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .pdf, .docx, .txt 等格式文件
          </p>
        </Upload.Dragger>
      </div>

      <Button 
        type="primary" 
        size="large" 
        onClick={handleAnalyze} 
        loading={isAnalyzing}
        disabled={fileList.length === 0}
        className="analyze-btn"
        block
      >
        {isAnalyzing ? '正在解析中...' : '开始智能解析'}
      </Button>
    </div>
  )

  return (
    <div className="create-req-wrapper">
      <div className="create-req-header">
        <h2>新建{getTypeName(type)}项</h2>
        <span className="project-badge">项目ID: {id}</span>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'manual',
            label: <span><FormOutlined /> 条目创建</span>,
            children: renderManualForm(),
          },
          {
            key: 'auto',
            label: <span><RobotOutlined /> 自动生成</span>,
            children: renderAutoGenerate(),
          },
        ]}
        className="create-req-tabs"
      />
    </div>
  )
}

export default CreateRequirement