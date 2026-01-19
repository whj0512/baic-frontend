import { useState, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import './RequirementSectionEditor.css'
import FlowGraph from '../components/graph'

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

  const handleGraphChange = (data: any) => {
    graphDataRef.current = data
    setGraphData(data)
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
          <label>可视化模型 (Flow/Logic)</label>
          <div style={{ height: '500px' }}>
            <FlowGraph 
              sectionKey={sectionKey}
              data={graphData} 
              onChange={handleGraphChange} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default RequirementSectionEditor
