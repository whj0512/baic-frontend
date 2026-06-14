import { useState } from 'react'
import { message, Tabs, Upload, Button } from 'antd'
import { FormOutlined } from '@ant-design/icons'
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
                        { key: 'manual', label: <span><FormOutlined /> 条目创建</span> }
                    ]}
                    className="creator-tabs"
                    tabBarStyle={{ marginBottom: 0, paddingLeft: 24 }}
                />
            </div>

            {renderManualForm()}
        </div>
    )
}

export default RequirementCreator
