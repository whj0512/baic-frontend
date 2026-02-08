import { useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, DownloadOutlined } from '@ant-design/icons'
import './RequirementSectionEditor.css'
import FlowGraph, { type FlowGraphRef } from '../components/graph'
import DslEditor from '../components/dsl-editor'
import { exportGraphToJSON, importGraphFromJSON } from '../models/strategies/internalConstraints'
import { API_ENDPOINTS } from '../config/api'

type ViewMode = 'visual' | 'dsl'

function RequirementSectionEditor() {
  const navigate = useNavigate()
  const { type, id, sectionKey } = useParams<{ type: string; id: string; sectionKey: string }>()
  const location = useLocation()
  
  // Get initial state passed from the previous page
  const initialState = location.state || {}
  const { formData: initialFormData, sectionLabel } = initialState

  // Local state for the specific section content
  const [content, setContent] = useState(initialFormData ? initialFormData[sectionKey!] : '')
  
  // Local state for graph data
  // Check if canvasData exists in initialFormData and if it has data for this sectionKey
  const initialCanvasData = initialFormData?.canvasData?.[sectionKey!] || {}
  const [graphData, setGraphData] = useState(initialCanvasData)

  // Ref to hold latest graph data to avoid re-renders on every node change if we just want to save at the end
  const graphDataRef = useRef(initialCanvasData)

  // Ref to access FlowGraph instance
  const flowGraphRef = useRef<FlowGraphRef>(null)

  // 视图模式状态
  const [viewMode, setViewMode] = useState<ViewMode>('dsl')
  const [dslContent, setDslContent] = useState('')
  const [dslLoading, setDslLoading] = useState(false)
  const [dslError, setDslError] = useState<string | undefined>()

  const handleGraphChange = (data: any) => {
    graphDataRef.current = data
    setGraphData(data)
  }

  // 切换到 DSL 视图并转换
  const handleSwitchToDsl = useCallback(async () => {
    const graph = flowGraphRef.current?.getGraph()
    if (!graph) return

    setViewMode('dsl')
    setDslLoading(true)
    setDslError(undefined)

    try {
      const jsonData = exportGraphToJSON(graph, sectionKey, sectionLabel)
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
  }, [sectionKey, sectionLabel])

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

    const jsonData = exportGraphToJSON(graph, sectionKey, sectionLabel)
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
    // Update canvasData map
    const updatedCanvasData = {
      ...(initialFormData.canvasData || {}),
      [sectionKey!]: graphDataRef.current
    }

    // Navigate back with the updated formData
    const updatedFormData = { 
      ...initialFormData, 
      [sectionKey!]: content,
      canvasData: updatedCanvasData
    }
    
    navigate(`/project/${type}/${id}/create`, { state: { formData: updatedFormData } })
  }

  const handleCancel = () => {
    // Navigate back without saving changes to this section
    navigate(`/project/${type}/${id}/create`, { state: { formData: initialFormData } })
  }

  if (!initialFormData || !sectionKey) {
    return (
      <div className="section-editor-error">
        <h3>Error: Missing form data or section key.</h3>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="section-editor-wrapper">
      <div className="section-editor-header">
        <Button icon={<ArrowLeftOutlined />} onClick={handleCancel} type="text">
          返回
        </Button>
        <h2>编辑: {sectionLabel}</h2>
        <Button 
          type="primary" 
          icon={<SaveOutlined />} 
          onClick={handleSave}
        >
          保存并返回
        </Button>
      </div>

      <div className="section-editor-content">
        <div className="editor-group">
          <label>内容描述</label>
          <textarea
            className="editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`请输入${sectionLabel}详细内容...`}
            autoFocus
          />
        </div>

        <div className="editor-group">
          <div className="editor-group-header">
            <div className="editor-view-tabs">
              <label
                className={`editor-view-tab ${viewMode === 'visual' ? 'active' : ''}`}
                onClick={handleSwitchToVisual}
              >
                可视化模型 (Flow/Logic)
              </label>
              <label
                className={`editor-view-tab ${viewMode === 'dsl' ? 'active' : ''}`}
                onClick={handleSwitchToDsl}
              >
                DSL语言描述
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
          <div style={{ height: '500px' }}>
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

export default RequirementSectionEditor
