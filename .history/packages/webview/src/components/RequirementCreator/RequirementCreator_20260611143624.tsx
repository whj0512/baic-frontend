import { useState } from 'react'
import { message, Tabs, Upload, Button } from 'antd'
import { UploadOutlined, RobotOutlined, FormOutlined } from '@ant-design/icons'
import { API_ENDPOINTS, authFetch } from '../../config/api'
import './RequirementCreator.css'

// Types
type SectionKey = 'environment' | 'interaction' | 'internalComposition' | 'moduleResponses' | 'internalConstraints';

interface RelationItem {
    reqId: number
    relationType: string
    reqLabel: string
}

interface RequirementCreatorProps {
    projectKey?: string
    formData?: {
        name: string
        req_type: string
        nl_text: string
        relationships: RelationItem[]
        sectionData: Record<string, any>
        sectionDslData: Record<string, string>
    }
    onChange?: (data: any) => void
    onSectionClick?: (sectionKey: SectionKey) => void
    onCancel?: () => void
    onSuccess?: () => void
}

// Mock Data (Same as CreateRequirement)
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

const AI_MODELS = [
    { value: 'gpt-4', label: 'GPT-4 Turbo' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'gemini-pro', label: 'Gemini Pro' },
]

// Sections Config (from RequirementOverview/CreateRequirement)
const SECTIONS: { key: SectionKey; dimensionCode: string; label: string; }[] = [
    { key: 'environment', dimensionCode: 'IBD', label: '所处环境' },
    { key: 'interaction', dimensionCode: 'ESD', label: '与环境交互' },
    { key: 'internalComposition', dimensionCode: 'BDD', label: '内部组成' },
    { key: 'moduleResponses', dimensionCode: 'ISD', label: '组成模块间的响应' },
    { key: 'internalConstraints', dimensionCode: 'SC', label: '内部约束' },
]

function RequirementCreator({
    projectKey,
    formData,
    onChange,
    onSectionClick,
    onCancel,
    onSuccess
}: RequirementCreatorProps) {
    // Tab State
    const [activeTab, setActiveTab] = useState('manual')

    // Local state fallback if not provided via props (for standalone usage safety)
    const [localFormData, setLocalFormData] = useState({
        name: '',
        req_type: '',
        nl_text: '',
        relationships: [] as RelationItem[],
        sectionData: {} as Record<string, any>,
        sectionDslData: {} as Record<string, string>
    })

    // Start with local, but prefer props
    const currentFormData = formData || localFormData

    // Relation State
    const [currentRelationType, setCurrentRelationType] = useState('Satisfies')
    const [currentReqId, setCurrentReqId] = useState<number | null>(null)

    // Auto Gen State
    const [selectedModel, setSelectedModel] = useState<string>('gpt-4')
    const [fileList, setFileList] = useState<any[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    const updateFormData = (newData: any) => {
        if (onChange) {
            onChange(newData)
        } else {
            setLocalFormData(newData)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        // Use callback form of state update if using local, but for props we need to merge with current
        const newData = {
            ...currentFormData,
            [name]: value
        }
        updateFormData(newData)
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

        const exists = currentFormData.relationships.some(
            r => r.reqId === newRelation.reqId && r.relationType === newRelation.relationType
        )

        if (exists) {
            message.warning('该关系已存在')
            return
        }

        const newData = {
            ...currentFormData,
            relationships: [...currentFormData.relationships, newRelation]
        }
        updateFormData(newData)
        setCurrentReqId(null)
    }

    const handleRemoveRelation = (index: number) => {
        const newData = {
            ...currentFormData,
            relationships: currentFormData.relationships.filter((_, i) => i !== index)
        }
        updateFormData(newData)
    }

    const handleSubmit = async () => {
        // Validation
        if (!currentFormData.name) {
            message.error('请输入需求名称')
            return
        }
        if (!currentFormData.nl_text) {
            message.error('请输入需求描述')
            return
        }

        try {
            const response = await authFetch(API_ENDPOINTS.requirements, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_key: projectKey,
                    name: currentFormData.name,
                    req_type: currentFormData.req_type || undefined,
                    nl_text: currentFormData.nl_text,
                    graph_IBD: currentFormData.sectionData.environment,
                    graph_ESD: currentFormData.sectionData.interaction,
                    graph_BDD: currentFormData.sectionData.internalComposition,
                    graph_ISD: currentFormData.sectionData.moduleResponses,
                    graph_SC: currentFormData.sectionData.internalConstraints,
                    dsl_IBD: currentFormData.sectionDslData.environment,
                    dsl_ESD: currentFormData.sectionDslData.interaction,
                    dsl_BDD: currentFormData.sectionDslData.internalComposition,
                    dsl_ISD: currentFormData.sectionDslData.moduleResponses,
                    dsl_SC: currentFormData.sectionDslData.internalConstraints,
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || '创建失败')
            }

            const data = await response.json()
            console.log('Created requirement:', data)
            message.success('需求项创建成功')
            if (onSuccess) onSuccess()
        } catch (error: any) {
            console.error('Creation error:', error)
            message.error(error.message || '创建需求失败')
        }
    }

    const handleAnalyze = () => {
        if (fileList.length === 0) {
            message.warning('请先上传文件')
            return
        }
        setIsAnalyzing(true)
        setTimeout(() => {
            const newData = {
                ...currentFormData,
                nl_text: '本需求描述了车辆在紧急制动情况下的系统响应行为，基于上传的文档自动提取。',
            }
            updateFormData(newData)
            setIsAnalyzing(false)
            message.success('解析完成，内容已自动填充')
            setActiveTab('manual')
        }, 2000)
    }

    const renderManualForm = () => (
        <>
            <div className="creator-content">
                {/* Requirement Name */}
                <div className="creator-section">
                    <div className="section-header">
                        <span className="section-title">需求名称 <span style={{ color: '#ef4444' }}>*</span></span>
                    </div>
                    <div className="form-group">
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            placeholder="请输入需求名称"
                            value={currentFormData.name}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Requirement Type */}
                <div className="creator-section">
                    <div className="section-header">
                        <span className="section-title">需求类型</span>
                    </div>
                    <div className="form-group">
                        <input
                            type="text"
                            name="req_type"
                            className="form-input"
                            placeholder="请输入需求类型"
                            value={currentFormData.req_type}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Natural Language Description */}
                <div className="creator-section">
                    <div className="section-header">
                        <span className="section-title">自然语言描述 (NL)</span>
                    </div>
                    <div className="form-group">
                        <textarea
                            name="nl_text"
                            className="form-textarea"
                            placeholder="请输入详细描述"
                            value={currentFormData.nl_text}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Relationships */}
                <div className="creator-section">
                    <div className="section-header">
                        <span className="section-title">制品间关系</span>
                    </div>
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
                        <select
                            className="form-select"
                            style={{ flex: 1 }}
                            value={currentReqId || ''}
                            onChange={(e) => setCurrentReqId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="" disabled>选择关联需求</option>
                            {MOCK_AVAILABLE_REQS.map(req => (
                                <option key={req.value} value={req.value}>{req.label}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="add-relation-btn"
                            onClick={handleAddRelation}
                            disabled={!currentReqId}
                        >
                            添加
                        </button>
                    </div>
                    {currentFormData.relationships.length > 0 && (
                        <div className="relations-list">
                            {currentFormData.relationships.map((rel, index) => (
                                <div key={index} className="relation-item">
                                    <span className="relation-tag">{rel.relationType}</span>
                                    <span className="relation-arrow">→</span>
                                    <span className="relation-target">{rel.reqLabel}</span>
                                    <button
                                        type="button"
                                        className="remove-relation-btn"
                                        onClick={() => handleRemoveRelation(index)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Dimensions - Placeholder for creation view */}
                <div className="creator-section">
                    <div className="section-header">
                        <span className="section-title">五维模型定义</span>
                    </div>
                    <div className="dimension-list">
                        {SECTIONS.map((section) => (
                            <div
                                key={section.key}
                                className="dimension-item"
                                onClick={() => onSectionClick && onSectionClick(section.key)}
                            >
                                <div className="dimension-item-left">
                                    <span className={`dimension-tag tag-${section.dimensionCode}`}>{section.dimensionCode}</span>
                                    <span className="dimension-label">{section.label}</span>
                                </div>
                                <div className="dimension-item-right">
                                    {currentFormData.sectionData && currentFormData.sectionData[section.key] ? (
                                        <span className="dimension-status has-data">已定义</span>
                                    ) : (
                                        <span className="dimension-status no-data">未定义</span>
                                    )}
                                    <span className="dimension-arrow">›</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="creator-footer">
                <button type="button" className="btn-cancel" onClick={onCancel}>
                    取消
                </button>
                <button type="button" className="btn-submit" onClick={handleSubmit}>
                    创建需求
                </button>
            </div>
        </>
    )

    const renderAutoGenerate = () => (
        <div className="creator-content">
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#374151' }}>智能需求生成</h3>
                <p style={{ marginBottom: '2rem', color: '#6b7280' }}>上传文档，AI 帮您提取需求内容。</p>

                <div style={{ maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <select
                        className="form-select"
                        style={{ width: '100%', height: '40px' }} // Added height to match Button size roughly
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                    >
                        {AI_MODELS.map(model => (
                            <option key={model.value} value={model.value}>{model.label}</option>
                        ))}
                    </select>
                    <Upload.Dragger
                        name="file"
                        multiple={false}
                        fileList={fileList}
                        beforeUpload={(file) => {
                            setFileList([file])
                            return false
                        }}
                        onRemove={() => setFileList([])}
                    >
                        <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                        <p className="ant-upload-text">点击上传文档</p>
                    </Upload.Dragger>
                    <Button
                        type="primary"
                        size="large"
                        onClick={handleAnalyze}
                        loading={isAnalyzing}
                        disabled={fileList.length === 0}
                        block
                    >
                        开始解析
                    </Button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="requirement-creator">
            <div className="creator-header">
                <div className="creator-title-row">
                    <h2>新建需求</h2>
                    <span className="creator-badge">Project: {projectKey}</span>
                </div>
            </div>

            <div className="creator-tabs-container">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        { key: 'manual', label: <span><FormOutlined /> 条目创建</span> },
                        { key: 'auto', label: <span><RobotOutlined /> 自动生成</span> }
                    ]}
                    className="creator-tabs"
                    tabBarStyle={{ marginBottom: 0, paddingLeft: 24 }}
                />
            </div>

            {activeTab === 'manual' ? renderManualForm() : renderAutoGenerate()}
        </div>
    )
}

export default RequirementCreator
