import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Checkbox, Table, Tag, Empty, Button } from 'antd'
import { PartitionOutlined, TableOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import './RelationshipAnalysis.css'
import type { ReqRelationship } from '../models/ReqRelationship'

// Mock Data
const MOCK_RELATIONSHIPS: ReqRelationship[] = [
    { id: 'rel-001', from_requirement: 'req-002', to_requirement: 'req-001', rel_type: 'Satisfies', project_id: 'p1' },
    { id: 'rel-002', from_requirement: 'req-003', to_requirement: 'req-001', rel_type: 'Satisfies', project_id: 'p1' },
    { id: 'rel-003', from_requirement: 'req-004', to_requirement: 'req-002', rel_type: 'DependsOn', project_id: 'p1' },
    { id: 'rel-004', from_requirement: 'req-005', to_requirement: 'req-002', rel_type: 'Refines', project_id: 'p1' },
]

const RELATION_TYPES = ['Satisfies', 'DependsOn', 'Refines', 'TracesTo', 'ParentOf', 'ChildOf']

function RelationshipAnalysis() {
    const { projectKey } = useParams<{ projectKey: string }>()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('graph')
    const [selectedTypes, setSelectedTypes] = useState<string[]>(RELATION_TYPES)

    // Filter Data
    const filteredData = MOCK_RELATIONSHIPS.filter(rel => selectedTypes.includes(rel.rel_type))

    // Table Columns
    const columns = [
        {
            title: '从需求 (From)',
            dataIndex: 'from_requirement',
            key: 'from_requirement',
            render: (text: string) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: '关系类型 (Type)',
            dataIndex: 'rel_type',
            key: 'rel_type',
            render: (type: string) => {
                let color = 'default'
                if (type === 'Satisfies') color = 'green'
                if (type === 'DependsOn') color = 'orange'
                if (type === 'Refines') color = 'purple'
                return <Tag color={color}>{type}</Tag>
            },
        },
        {
            title: '至需求 (To)',
            dataIndex: 'to_requirement',
            key: 'to_requirement',
            render: (text: string) => <Tag color="cyan">{text}</Tag>,
        },
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            className: 'text-gray-400 text-xs',
        },
    ]

    const renderGraph = () => (
        <div className="graph-container">
            {filteredData.length > 0 ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Placeholder Visualization */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ marginBottom: 20, color: '#666' }}>可视化图谱区域 (基于 AntV X6 或 G6)</p>
                        <div style={{ position: 'relative', width: 400, height: 300, border: '1px dashed #ccc', margin: '0 auto', background: '#fff' }}>
                            {/* Mock Nodes */}
                            {filteredData.slice(0, 3).map((rel, idx) => (
                                <div key={rel.id} style={{
                                    position: 'absolute',
                                    top: 50 + idx * 60,
                                    left: 50 + idx * 40,
                                    padding: '8px 16px',
                                    border: '1px solid #1890ff',
                                    borderRadius: 4,
                                    background: '#e6f7ff',
                                    fontSize: 12
                                }}>
                                    {rel.from_requirement} &rarr; {rel.to_requirement} ({rel.rel_type})
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <Empty description="暂无符合条件的关系数据" style={{ marginTop: 100 }} />
            )}
        </div>
    )



    const handleBack = () => {
        // Navigate back to project workspace
        if (projectKey) {
            navigate(`/workspace/${projectKey}`)
        } else {
            navigate(-1)
        }
    }

    return (
        <div className="relationship-analysis-container">
            {/* Header */}
            <div className="relationship-header">
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBack}
                    style={{ fontSize: '16px' }}
                >
                    返回项目空间
                </Button>
            </div>

            <div className="relationship-body">
                {/* Left Main Panel */}
                <div className="relationship-main">
                    {/* Custom Tabs Header */}
                    <div className="custom-tabs-header">
                        <div
                            className={`custom-tab-item ${activeTab === 'graph' ? 'active' : ''}`}
                            onClick={() => setActiveTab('graph')}
                        >
                            <PartitionOutlined /> 图形显示
                        </div>
                        <div
                            className={`custom-tab-item ${activeTab === 'table' ? 'active' : ''}`}
                            onClick={() => setActiveTab('table')}
                        >
                            <TableOutlined /> 表格显示
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="relationship-content">
                        {activeTab === 'graph' && renderGraph()}
                        {activeTab === 'table' && (
                            <div className="table-container">
                                <Table
                                    dataSource={filteredData}
                                    columns={columns}
                                    rowKey="id"
                                    pagination={{ pageSize: 10 }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Toolbar Panel */}
                <div className="relationship-toolbar">
                    <div className="toolbar-header">工具栏 (Project: {projectKey})</div>

                    <div className="filter-group">
                        <span className="filter-label">关系类型过滤</span>
                        <Checkbox.Group
                            options={RELATION_TYPES}
                            value={selectedTypes}
                            onChange={setSelectedTypes}
                            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                        />
                    </div>

                    <div className="filter-group">
                        <span className="filter-label">视图设置</span>
                        {/* Add more settings here later */}
                        <Checkbox defaultChecked>显示图例</Checkbox>
                        <Checkbox defaultChecked>显示方向箭头</Checkbox>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RelationshipAnalysis
