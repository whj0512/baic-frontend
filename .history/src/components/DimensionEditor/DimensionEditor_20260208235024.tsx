import { useState, useRef, useCallback } from 'react'
import { Button, Select } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DownloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { Requirement } from '../../models/Requirement'
import FlowGraph, { type FlowGraphRef } from '../graph'
import DslEditor from '../dsl-editor'
import { exportGraphToJSON, importGraphFromJSON } from '../../models/strategies/internalConstraints'
import { API_ENDPOINTS } from '../../config/api'
import './DimensionEditor.css'

type ViewMode = 'visual' | 'dsl'

// SectionKey 与 CreateRequirement.tsx 保持一致
type SectionKey = 'environment' | 'interaction' | 'internalComposition' | 'moduleResponses' | 'internalConstraints'

// 大模型选项
const LLM_OPTIONS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3', label: 'Claude 3' },
  { value: 'qwen', label: '通义千问' },
]

// Section 配置
const SECTION_CONFIG: Record<SectionKey, { dimensionCode: string; label: string; graphField: keyof Requirement }> = {
  environment: { dimensionCode: 'IBD', label: '所处环境', graphField: 'graph_IBD' },
  interaction: { dimensionCode: 'ESD', label: '与环境交互', graphField: 'graph_ESD' },
  internalComposition: { dimensionCode: 'BDD', label: '内部组成', graphField: 'graph_BDD' },
  moduleResponses: { dimensionCode: 'ISD', label: '组成模块间的响应', graphField: 'graph_ISD' },
  internalConstraints: { dimensionCode: 'SC', label: '内部约束', graphField: 'graph_SC' },
}

interface DimensionEditorProps {
  requirement: Requirement
  sectionKey: SectionKey
  onBack: () => void
  onSave?: (sectionKey: SectionKey, graphData: object) => void
}

function DimensionEditor({ requirement, sectionKey, onBack, onSave }: DimensionEditorProps) {
  const config = SECTION_CONFIG[sectionKey]

  // 获取初始的图数据
  const getInitialGraphData = () => {
    const graphField = config.graphField
    return requirement[graphField] || {}
  }

  // Local state for the content description
  const [content, setContent] = useState(requirement.nl_text || '')

  // Local state for graph data
  const [graphData, setGraphData] = useState(getInitialGraphData())

  // Ref to hold latest graph data
  const graphDataRef = useRef(getInitialGraphData())

  // Ref to access FlowGraph instance
  const flowGraphRef = useRef<FlowGraphRef>(null)

  // 视图模式状态
  const [viewMode, setViewMode] = useState<ViewMode>('visual')
  const [dslContent, setDslContent] = useState(requirement.dsl_text || '')
  const [dslLoading, setDslLoading] = useState(false)
  const [dslError, setDslError] = useState<string | undefined>()

  // 大模型生成状态
  const [selectedLLM, setSelectedLLM] = useState<string>('gpt-4')
  const [generating, setGenerating] = useState(false)

  const handleGraphChange = (data: object) => {
    graphDataRef.current = data
    setGraphData(data)
  }

  // 使用大模型生成 DSL
  const handleGenerateDsl = useCallback(async () => {
    if (!content.trim()) {
      return
    }

    setGenerating(true)
    setDslError(undefined)

    try {
      const response = await fetch(API_ENDPOINTS.nlToDsl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: content,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.text()
      setDslContent(result)
    } catch (error) {
      setDslError(error instanceof Error ? error.message : '生成失败，请稍后重试')
    } finally {
      setGenerating(false)
    }
  }, [content])

  // 切换到 DSL 视图并转换
  const handleSwitchToDsl = useCallback(async () => {
    const graph = flowGraphRef.current?.getGraph()
    if (!graph) return

    setViewMode('dsl')
    setDslLoading(true)
    setDslError(undefined)

    try {
      const jsonData = exportGraphToJSON(graph, sectionKey, config.label)
      const response = await fetch(API_ENDPOINTS.rbgToDsl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.text()
      setDslContent(result)
    } catch (error) {
      setDslError(error instanceof Error ? error.message : '转换失败，请稍后重试')
    } finally {
      setDslLoading(false)
    }
  }, [sectionKey, config.label])

  // 切换到可视化视图
  const handleSwitchToVisual = useCallback(async () => {
    // 如果 DSL 内容为空，直接切换
    if (!dslContent.trim()) {
      setViewMode('visual')
      return
    }

    setDslLoading(true)
    setDslError(undefined)

    try {
      const response = await fetch(API_ENDPOINTS.dslToRbg, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: dslContent,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.text()
      const x6Data = importGraphFromJSON(result)

      // 更新图数据
      setGraphData(x6Data)
      graphDataRef.current = x6Data

      // 如果图实例存在，重新加载数据
      const graph = flowGraphRef.current?.getGraph()
      if (graph) {
        graph.fromJSON(x6Data)
      }

      setViewMode('visual')
    } catch (error) {
      setDslError(error instanceof Error ? error.message : '转换失败，请稍后重试')
    } finally {
      setDslLoading(false)
    }
  }, [dslContent])

  // 下载图的 JSON 数据
  const handleDownloadJSON = () => {
    const graph = flowGraphRef.current?.getGraph()
    if (!graph) return

    const jsonData = exportGraphToJSON(graph, sectionKey, config.label)
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sectionKey || 'graph'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = () => {
    if (onSave) {
      onSave(sectionKey, graphDataRef.current)
    }
    onBack()
  }

  return (
    <div className="dimension-editor">
      <div className="dimension-editor-header">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} type="text">
          返回概览
        </Button>
        <h2>
          <span className={`dimension-code tag-${config.dimensionCode}`}>{config.dimensionCode}</span>
          {config.label}
        </h2>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存
        </Button>
      </div>

      <div className="dimension-editor-content">
        <div className="editor-group">
          <label>内容描述</label>
          <textarea
            className="editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`请输入${config.label}详细内容...`}
          />
          <div className="editor-generate-row">
            <Select
              value={selectedLLM}
              onChange={setSelectedLLM}
              options={LLM_OPTIONS}
              style={{ width: 160 }}
              placeholder="选择大模型"
            />
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleGenerateDsl}
              loading={generating}
              disabled={!content.trim()}
            >
              生成
            </Button>
          </div>
        </div>

        <div className="editor-group">
          <div className="editor-group-header">
            <div className="editor-view-tabs">
              <label
                className={`editor-view-tab ${viewMode === 'dsl' ? 'active' : ''}`}
                onClick={handleSwitchToDsl}
              >
                DSL语言描述
              </label>
              <label
                className={`editor-view-tab ${viewMode === 'visual' ? 'active' : ''}`}
                onClick={handleSwitchToVisual}
              >
                可视化模型 (Flow/Logic)
              </label>
            </div>
            {viewMode === 'visual' && (
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={handleDownloadJSON}
              >
                导出 JSON
              </Button>
            )}
          </div>
          <div className="editor-canvas-container">
            {viewMode === 'visual' ? (
              <FlowGraph
                ref={flowGraphRef}
                sectionKey={sectionKey}
                data={graphData}
                onChange={handleGraphChange}
              />
            ) : (
              <DslEditor
                value={dslContent}
                loading={dslLoading}
                error={dslError}
                readOnly={false}
                onChange={setDslContent}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DimensionEditor
export type { SectionKey }
