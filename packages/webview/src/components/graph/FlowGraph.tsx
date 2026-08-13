import {
  useRef,
  useMemo,
  useState,
  lazy,
  Suspense,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import type { Cell, Graph, Stencil } from '@antv/x6'
import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { CloseCircleOutlined, DeleteOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { getStrategy } from './strategies'
import FormPanelContainer from './form-panel'
import {
  AdvancedEditorHostProvider,
  useAdvancedEditorHost,
} from '../../hooks/useAdvancedEditor'
import {
  type FlowGraphContextMenuState,
} from './flowGraph/graphEventRegistry'
import { useFlowGraphInstance } from './flowGraph/useFlowGraphInstance'
import type { GraphChangeScheduler } from './flowGraph/changeScheduler'
import { loadFlowGraphData } from './flowGraph/loadGraphData'
import './FlowGraph.css'

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

interface FlowGraphProps {
  sectionKey: string
  data?: any
  onChange?: (data: any) => void
  readOnly?: boolean
  initialFormPanelCollapsed?: boolean
  preserveFormPanelOnBlank?: boolean
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
  loadData: (nextData: any) => void
  flushChanges: () => object | null
}

const FlowGraphContent = forwardRef<FlowGraphRef, FlowGraphProps>(
  ({
    sectionKey,
    data,
    onChange,
    readOnly = false,
    initialFormPanelCollapsed = true,
    preserveFormPanelOnBlank = false,
    errorMessage,
    onDismissError,
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const stencilContainerRef = useRef<HTMLDivElement>(null)
    const graphRef = useRef<Graph | null>(null)
    const stencilRef = useRef<Stencil | null>(null)
    const changeSchedulerRef = useRef<GraphChangeScheduler | null>(null)
    const [graphReady, setGraphReady] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    const [formPanelCollapsed, setFormPanelCollapsed] = useState(initialFormPanelCollapsed)
    const [formPanelCell, setFormPanelCell] = useState<Cell | null>(null)
    const [formPanelWidth, setFormPanelWidth] = useState(DEFAULT_FORM_PANEL_WIDTH)
    const [formPanelResizing, setFormPanelResizing] = useState(false)
    const formPanelWrapperRef = useRef<HTMLDivElement>(null)
    const formPanelResizeFrameRef = useRef<number | null>(null)
    const pendingFormPanelWidthRef = useRef(DEFAULT_FORM_PANEL_WIDTH)
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

    const activeAdvancedEditor = useAdvancedEditorHost()
    const strategy = useMemo(() => getStrategy(sectionKey), [sectionKey])

    // 暴露 getGraph 方法给父组件
    useImperativeHandle(ref, () => ({
      getGraph: () => graphRef.current,
      loadData: (nextData: any) => {
        const graph = graphRef.current
        const scheduler = changeSchedulerRef.current
        if (!graph || !scheduler) return

        setFormPanelCell(null)
        loadFlowGraphData({ data: nextData, graph, scheduler, strategy })
      },
      flushChanges: () => changeSchedulerRef.current?.snapshot() ?? null,
    }), [graphReady, strategy])

    const closeContextMenu = useCallback(() => {
      setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
    }, [])

    const handleDeleteCell = useCallback(() => {
      if (contextMenu.cell && graphRef.current) {
        if (strategy.canRemoveCell?.(contextMenu.cell) !== false) {
          graphRef.current.removeCell(contextMenu.cell)
        }
      }
      closeContextMenu()
    }, [contextMenu.cell, closeContextMenu, strategy])

    const handleFormPanelResizeStart = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      formPanelResizeStartRef.current = {
        x: event.clientX,
        width: formPanelWidth,
      }
      pendingFormPanelWidthRef.current = formPanelWidth
      setFormPanelResizing(true)
    }, [formPanelWidth])

    useEffect(() => {
      if (!formPanelResizing) {
        return undefined
      }

      const handleMouseMove = (event: MouseEvent) => {
        const { x, width } = formPanelResizeStartRef.current
        const nextWidth = clampFormPanelWidth(width + x - event.clientX)
        pendingFormPanelWidthRef.current = nextWidth

        if (formPanelResizeFrameRef.current !== null) return
        formPanelResizeFrameRef.current = requestAnimationFrame(() => {
          formPanelResizeFrameRef.current = null
          formPanelWrapperRef.current?.style.setProperty(
            '--form-panel-width',
            `${pendingFormPanelWidthRef.current}px`,
          )
        })
      }

      const handleMouseUp = () => {
        if (formPanelResizeFrameRef.current !== null) {
          cancelAnimationFrame(formPanelResizeFrameRef.current)
          formPanelResizeFrameRef.current = null
        }
        setFormPanelWidth(pendingFormPanelWidthRef.current)
        setFormPanelResizing(false)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.classList.add('flow-graph-form-panel-resizing')

      return () => {
        if (formPanelResizeFrameRef.current !== null) {
          cancelAnimationFrame(formPanelResizeFrameRef.current)
          formPanelResizeFrameRef.current = null
        }
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
      changeSchedulerRef,
      setGraphReady,
      setContextMenu,
      setFormPanelCollapsed,
      setFormPanelCell,
      preserveFormPanelOnBlank,
    })

    return (
      <div
        className="flow-graph-container"
        onClick={closeContextMenu}
        onBlurCapture={() => changeSchedulerRef.current?.flush()}
      >
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
            ref={formPanelWrapperRef}
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
            {!formPanelCollapsed && (
              <FormPanelContainer
                graph={graphRef.current}
                formConfig={strategy.formConfig}
                selectedCell={formPanelCell}
              />
            )}
          </div>
        )}
        {!readOnly && activeAdvancedEditor && (
          <div
            className="flow-advanced-editor-wrapper"
            style={{
              '--advanced-editor-width': `${activeAdvancedEditor.width}px`,
            } as CSSProperties}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flow-advanced-editor-header">
              <div className="flow-advanced-editor-title">{activeAdvancedEditor.title}</div>
              <button
                type="button"
                className="flow-advanced-editor-close"
                onClick={activeAdvancedEditor.closeEditor}
                title={activeAdvancedEditor.cancelText}
              >
                ×
              </button>
            </div>
            <div className="flow-advanced-editor-toolbar">
              <span className="flow-advanced-editor-lang">
                Language:{' '}
                <span className="flow-advanced-editor-lang-badge">
                  {activeAdvancedEditor.languageLabel}
                </span>
              </span>
              <span className="flow-advanced-editor-shortcut">
                <kbd>Ctrl</kbd>+<kbd>S</kbd> {activeAdvancedEditor.shortcutLabel}
              </span>
            </div>
            <div className="flow-advanced-editor-body">
              <Suspense fallback={<div className="flow-advanced-editor-loading">Loading editor...</div>}>
                <MonacoEditor
                  key={activeAdvancedEditor.id}
                  height="100%"
                  defaultLanguage={activeAdvancedEditor.editorLanguage}
                  value={activeAdvancedEditor.draftValue}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fixedOverflowWidgets: true,
                    fontSize: 14,
                    lineNumbers: 'on',
                    automaticLayout: true,
                  }}
                  onChange={(nextValue) => activeAdvancedEditor.setDraftValue(nextValue ?? '')}
                  onMount={activeAdvancedEditor.handleEditorMount}
                />
              </Suspense>
            </div>
            <div className="flow-advanced-editor-footer">
              <Button onClick={activeAdvancedEditor.closeEditor}>
                {activeAdvancedEditor.cancelText}
              </Button>
              <Button type="primary" onClick={activeAdvancedEditor.saveEditor}>
                {activeAdvancedEditor.saveText}
              </Button>
            </div>
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

const FlowGraph = forwardRef<FlowGraphRef, FlowGraphProps>((props, ref) => (
  <AdvancedEditorHostProvider>
    <FlowGraphContent {...props} ref={ref} />
  </AdvancedEditorHostProvider>
))

export default FlowGraph
