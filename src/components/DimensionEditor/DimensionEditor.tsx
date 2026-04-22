import { useState, useRef, useCallback, useEffect } from 'react'
import { Button, message, Select } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DownloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { Requirement } from '../../models/Requirement'
import FlowGraph, { type FlowGraphRef } from '../graph'
import DslEditor from '../dsl-editor'
import { getModelStrategy } from '../../models/strategies'
import { API_ENDPOINTS, getDslToRbgEndpoint, getRbgToDslEndpoint } from '../../config/api'
import { exportGraphToRBG } from '../../models/strategies/internalConstraints/exportGraph'
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

const SECTION_CONFIG: Record<SectionKey, { dimensionCode: string; label: string; graphField: keyof Requirement; dslField: keyof Requirement }> = {
  environment: { dimensionCode: 'IBD', label: '所处环境', graphField: 'graph_IBD', dslField: 'dsl_IBD' },
  interaction: { dimensionCode: 'ESD', label: '与环境交互', graphField: 'graph_ESD', dslField: 'dsl_ESD' },
  internalComposition: { dimensionCode: 'BDD', label: '内部组成', graphField: 'graph_BDD', dslField: 'dsl_BDD' },
  moduleResponses: { dimensionCode: 'ISD', label: '组成模块间的响应', graphField: 'graph_ISD', dslField: 'dsl_ISD' },
  internalConstraints: { dimensionCode: 'SC', label: '内部约束', graphField: 'graph_SC', dslField: 'dsl_SC' },
}

interface DimensionEditorProps {
  requirement: Requirement
  sectionKey: SectionKey
  onBack: () => void
  onSave?: (sectionKey: SectionKey, graphData: object, dslText: string) => void
}

function DimensionEditor({ requirement, sectionKey, onBack, onSave }: DimensionEditorProps) {
  const config = SECTION_CONFIG[sectionKey]
  const modelStrategy = getModelStrategy(sectionKey)

  // 获取初始的图数据
  const getInitialGraphData = (): object => {
    const graphField = config.graphField
    return (requirement[graphField] as object) || {}
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
  const [viewMode, setViewMode] = useState<ViewMode>('dsl')

  // Use specific DSL field for the current section
  const [dslContent, setDslContent] = useState(requirement[config.dslField as keyof Requirement] as string || '')
  const [dslLoading, setDslLoading] = useState(false)
  const [dslError, setDslError] = useState<string | undefined>()

  // 可视化视图中的错误（RBG→DSL 转换失败时显示在 FlowGraph 顶部）
  const [graphError, setGraphError] = useState<string | undefined>()

  // 大模型生成状态
  const [selectedLLM, setSelectedLLM] = useState<string>('gpt-4')
  const [generating, setGenerating] = useState(false)

  const handleGraphChange = (data: object) => {
    graphDataRef.current = data
    setGraphData(data)
  }

  // 监听远程 graph 数据变化（WebSocket 推送导致 requirement prop 更新）
  useEffect(() => {
    const remoteGraph = (requirement[config.graphField] as object) || {}
    const remoteStr = JSON.stringify(remoteGraph)
    const localStr = JSON.stringify(graphDataRef.current)

    if (remoteStr !== localStr && remoteStr !== '{}') {
      message.info('其他用户更新了图数据，已自动同步')
      setGraphData(remoteGraph)
      graphDataRef.current = remoteGraph
      const graph = flowGraphRef.current?.getGraph()
      if (graph) graph.fromJSON(remoteGraph)
    }
  }, [requirement, config.graphField])

  // 监听远程 DSL 数据变化
  useEffect(() => {
    const remoteDsl = (requirement[config.dslField as keyof Requirement] as string) || ''
    if (remoteDsl && remoteDsl !== dslContent) {
      message.info('其他用户更新了 DSL 数据，已自动同步')
      setDslContent(remoteDsl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirement, config.dslField])

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
    // 已经在 DSL 视图时，直接返回，不重复调用转换接口
    if (viewMode === 'dsl') return

    const graph = flowGraphRef.current?.getGraph()
    if (!graph) return

    setDslLoading(true)
    setGraphError(undefined)

    try {
      const jsonData = modelStrategy.exportGraphToJSON(graph, sectionKey, config.label)
      // console.log(jsonData)
      const response = await fetch(getRbgToDslEndpoint(config.dimensionCode), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => null)
        throw new Error(errBody?.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.text()
      setViewMode('dsl')
      setDslContent(result)
    } catch (error) {
      // 转换失败时保持在可视化视图，将错误信息展示在 FlowGraph 顶部
      setGraphError(error instanceof Error ? error.message : '转换失败，请稍后重试')
    } finally {
      setDslLoading(false)
    }
  }, [viewMode, sectionKey, config.label, config.dimensionCode, modelStrategy])

  // 清除 DSL 错误，让用户继续在编辑器中编辑
  const handleDismissError = useCallback(() => {
    setDslError(undefined)
  }, [])

  // 清除可视化视图中的图错误
  const handleDismissGraphError = useCallback(() => {
    setGraphError(undefined)
  }, [])

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
      const response = await fetch(getDslToRbgEndpoint(config.dimensionCode), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: dslContent,
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => null)
        throw new Error(errBody?.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.text()
      const x6Data = modelStrategy.importGraphFromJSON(result)

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

    const jsonData = modelStrategy.exportGraphToJSON(graph)
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

  // ==== DEBUG 调试函数 ====
  const handlePrintRBG = () => {
    const graph = flowGraphRef.current?.getGraph()
    console.log(graph)
    if (!graph) return
    if (sectionKey === 'internalConstraints') {
      const rbgData = exportGraphToRBG(graph, requirement.id, content)
      console.log('======  OUTPUT RUN RESULT: exportGraphToRBG ======')
      console.log(rbgData) // 直接保持为对象，方便在浏览器折叠展开
      message.success('打印成功！请按 F12 打开开发者工具控制台查看')
    } else {
      message.warning('仅支持内部约束画布使用该函数')
    }
  }

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    // If it's a new requirement (draft), just call onSave and return
    if (requirement.id === 'NEW') {
      if (onSave) {
        onSave(sectionKey, graphDataRef.current, dslContent)
        message.success('暂存成功')
      }
      onBack()
      return
    }

    // If it's an existing requirement, call API
    setSaving(true)
    try {
      const token = localStorage.getItem('token')

      const payload = {
        [config.graphField]: graphDataRef.current,
        [config.dslField]: dslContent,
        nl_text: content
      }

      const response = await fetch(`${API_ENDPOINTS.requirements}/${requirement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '保存失败')
      }

      // const data = await response.json()

      if (onSave) {
        onSave(sectionKey, graphDataRef.current, dslContent)
      }
      message.success('保存成功')
      onBack()

    } catch (error: any) {
      console.error('Save error:', error)
      message.error(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
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
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
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
              <div style={{ display: 'flex', gap: '8px' }}>
                {sectionKey === 'internalConstraints' && (
                  <Button
                    size="small"
                    onClick={handlePrintRBG}
                    title="在控制台打印生成的 RBG 格式 JSON"
                  >
                    控制台打印 RBG
                  </Button>
                )}
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadJSON}
                >
                  导出 JSON
                </Button>
              </div>
            )}
          </div>
          <div className="editor-canvas-container">
            {viewMode === 'visual' ? (
              <FlowGraph
                ref={flowGraphRef}
                sectionKey={sectionKey}
                data={graphData}
                onChange={handleGraphChange}
                errorMessage={graphError}
                onDismissError={handleDismissGraphError}
              />
            ) : (
              <DslEditor
                sectionKey={sectionKey}
                value={dslContent}
                loading={dslLoading}
                error={dslError}
                onDismissError={handleDismissError}
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
