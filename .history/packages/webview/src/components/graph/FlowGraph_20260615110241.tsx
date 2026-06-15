import {
  useRef,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import type { Graph, Stencil } from '@antv/x6'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { CloseCircleOutlined, DeleteOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { getStrategy } from './strategies'
import FormPanelContainer from './form-panel'
import {
  type FlowGraphContextMenuState,
} from './flowGraph/graphEventRegistry'
import { useFlowGraphInstance } from './flowGraph/useFlowGraphInstance'
import './FlowGraph.css'

interface FlowGraphProps {
  sectionKey: string
  data?: any
  onChange?: (data: any) => void
  readOnly?: boolean
  errorMessage?: string
  onDismissError?: () => void
}

const DEFAULT_FORM_PANEL_WIDTH = 280
const MIN_FORM_PANEL_WIDTH = 220
const MAX_FORM_PANEL_WIDTH = 580

const clampFormPanelWidth = (width: number) => (
  Math.min(Math.max(width, MIN_FORM_PANEL_WIDTH), MAX_FORM_PANEL_WIDTH)
)

// 暴露给父组件的方法
export interface FlowGraphRef {
  getGraph: () => Graph | null
}

const FlowGraph = forwardRef<FlowGraphRef, FlowGraphProps>(
  ({ sectionKey, data, onChange, readOnly = false, errorMessage, onDismissError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const stencilContainerRef = useRef<HTMLDivElement>(null)
    const graphRef = useRef<Graph | null>(null)
    const stencilRef = useRef<Stencil | null>(null)
    const [graphReady, setGraphReady] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    const [formPanelCollapsed, setFormPanelCollapsed] = useState(true)
    const [formPanelWidth, setFormPanelWidth] = useState(DEFAULT_FORM_PANEL_WIDTH)
    const [formPanelResizing, setFormPanelResizing] = useState(false)
    const formPanelResizeStartRef = useRef({
      x: 0,
      width: DEFAULT_FORM_PANEL_WIDTH,
    })

    const [contextMenu, setContextMenu] = useState<FlowGraphContextMenuState>({
      visible: false,
      x: 0,
      y: 0,
      cell: null,
    })

    const strategy = useMemo(() => getStrategy(sectionKey), [sectionKey])

    // 暴露 getGraph 方法给父组件
    useImperativeHandle(ref, () => ({
      getGraph: () => graphRef.current,
    }), [graphReady])

    const closeContextMenu = useCallback(() => {
      setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
    }, [])

    const handleDeleteCell = useCallback(() => {
      if (contextMenu.cell && graphRef.current) {
        graphRef.current.removeCell(contextMenu.cell)
      }
      closeContextMenu()
    }, [contextMenu.cell, closeContextMenu])

    const handleFormPanelResizeStart = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      formPanelResizeStartRef.current = {
        x: event.clientX,
        width: formPanelWidth,
      }
      setFormPanelResizing(true)
    }, [formPanelWidth])

    useEffect(() => {
      if (!formPanelResizing) {
        return undefined
      }

      const handleMouseMove = (event: MouseEvent) => {
        const { x, width } = formPanelResizeStartRef.current
        const nextWidth = clampFormPanelWidth(width + x - event.clientX)
        setFormPanelWidth(nextWidth)
      }

      const handleMouseUp = () => {
        setFormPanelResizing(false)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.classList.add('flow-graph-form-panel-resizing')

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.classList.remove('flow-graph-form-panel-resizing')
      }
    }, [formPanelResizing])

    const contextMenuItems: MenuProps['items'] = [
      {
        key: 'delete',
        label: '删除元素',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: handleDeleteCell,
      },
    ]

    useFlowGraphInstance({
      sectionKey,
      data,
      onChange,
      readOnly,
      strategy,
      containerRef,
      stencilContainerRef,
      graphRef,
      stencilRef,
      setGraphReady,
      setContextMenu,
      setFormPanelCollapsed,
    })

    return (
      <div className="flow-graph-container" onClick={closeContextMenu}>
        {/* 错误横幅：转换失败时在顶部显示 */}
        {errorMessage && (
          <div className="flow-graph-error-banner">
            <CloseCircleOutlined className="flow-graph-error-icon" />
            <span className="flow-graph-error-text">{errorMessage}</span>
            {onDismissError && (
              <button className="flow-graph-error-dismiss" onClick={onDismissError} title="关闭">
                ✕
              </button>
            )}
          </div>
        )}
        {!readOnly && (
          <div className={`graph-sidebar-wrapper${sidebarCollapsed ? ' collapsed' : ''}`}>
            <div
              className="graph-sidebar"
              ref={stencilContainerRef}
              style={{
                padding: sidebarCollapsed ? 0 : strategy.stencilGraphPadding,
                width: sidebarCollapsed ? 0 : (strategy.stencilGraphWidth || 160),
              }}
            />
            <button
              className="panel-toggle-btn sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(prev => !prev)}
              title={sidebarCollapsed ? '展开组件库' : '收起组件库'}
            >
              {sidebarCollapsed ? <RightOutlined /> : <LeftOutlined />}
            </button>
          </div>
        )}
        <div className="graph-content-wrapper">
          <div ref={containerRef} className="x6-graph-container" />
          {!readOnly && <div className="graph-help-text">Ctrl + 滚轮缩放 | 拖拽空白处平移</div>}
        </div>
        {!readOnly && graphReady && graphRef.current && (
          <div
            className={`form-panel-wrapper${formPanelCollapsed ? ' collapsed' : ''}${formPanelResizing ? ' resizing' : ''}`}
            style={{
              '--form-panel-width': `${formPanelWidth}px`,
            } as CSSProperties}
          >
            <button
              className="panel-toggle-btn form-panel-toggle-btn"
              onClick={() => setFormPanelCollapsed(prev => !prev)}
              title={formPanelCollapsed ? '展开属性面板' : '收起属性面板'}
            >
              {formPanelCollapsed ? <LeftOutlined /> : <RightOutlined />}
            </button>
            <div
              className="form-panel-resize-handle"
              onMouseDown={handleFormPanelResizeStart}
              title="拖拽调整属性面板宽度"
            />
            <FormPanelContainer
              graph={graphRef.current}
              formConfig={strategy.formConfig}
            />
          </div>
        )}
        {contextMenu.visible && (
          <Dropdown
            menu={{ items: contextMenuItems }}
            open={true}
            onOpenChange={(open) => !open && closeContextMenu()}
            overlayStyle={{ zIndex: 10000 }}
          >
            <div
              style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                width: 1,
                height: 1,
              }}
            />
          </Dropdown>
        )}
      </div>
    )
  })

export default FlowGraph
