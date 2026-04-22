import { useEffect, useRef, useMemo, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Graph, Snapline, Stencil, Edge, Cell, Transform } from '@antv/x6'
import { register } from '@antv/x6-react-shape'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { CloseCircleOutlined, DeleteOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import NodeWrapper from '../nodes/internalConstraints/NodeWrapper'
import { getStrategy } from './strategies'
import FormPanelContainer from '../form-panel'
import AddEdgePanel from './AddEdgePanel'
import './FlowGraph.css'

// Register common components
register({
  shape: 'custom-rect-node',
  width: 120,
  height: 60,
  component: NodeWrapper,
})

interface FlowGraphProps {
  sectionKey: string
  data?: any
  onChange?: (data: any) => void
  readOnly?: boolean
  errorMessage?: string
  onDismissError?: () => void
}

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

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{
      visible: boolean
      x: number
      y: number
      cell: Cell | null
    }>({ visible: false, x: 0, y: 0, cell: null })

    const strategy = useMemo(() => getStrategy(sectionKey), [sectionKey])

    // 暴露 getGraph 方法给父组件
    useImperativeHandle(ref, () => ({
      getGraph: () => graphRef.current,
    }), [graphReady])

    // 关闭右键菜单
    const closeContextMenu = useCallback(() => {
      setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
    }, [])

    // 删除元素
    const handleDeleteCell = useCallback(() => {
      if (contextMenu.cell && graphRef.current) {
        graphRef.current.removeCell(contextMenu.cell)
      }
      closeContextMenu()
    }, [contextMenu.cell, closeContextMenu])

    // 右键菜单配置
    const contextMenuItems: MenuProps['items'] = [
      {
        key: 'delete',
        label: '删除元素',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: handleDeleteCell,
      },
    ]

    useEffect(() => {
      // Strategy-specific registration
      if (strategy.registerNodes) {
        strategy.registerNodes()
      }

      if (!containerRef.current) return

      const graphInnerContainer = document.createElement('div')
      graphInnerContainer.style.width = '100%'
      graphInnerContainer.style.height = '100%'
      containerRef.current.appendChild(graphInnerContainer)

      const graph = new Graph({
        container: graphInnerContainer,
        autoResize: true,
        grid: { size: 10, visible: true },
        panning: true,
        mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
        // 交互配置
        interacting: !readOnly ? {
          nodeMovable: true,
          // 对基于坐标的边禁用默认拖拽，改用自定义双击垂直拖拽
          edgeMovable: (cellView: any) => {
            const edge = cellView.cell
            const src = edge.getSource()
            return !!src?.cell // 只有关联了cell的边允许默认拖拽行为，纯坐标边(如时序图)禁用
          },
          edgeLabelMovable: true,
        } : false,
        background: { color: '#f8f9fa' },
        // // 启用选中功能
        selecting: {
          enabled: true,
          showNodeSelectionBox: true,
          showEdgeSelectionBox: true,
        },
        // 连线配置
        connecting: {
          // 允许边悬空（因为时序图等坐标级别的线必须在未指定特定节点的情况下放置且可拖拉）
          allowBlank: true,
          // 允许多条边连接到同一个节点
          allowMulti: true,
          // 不允许从节点直接拖出边（使用添加连线按钮）
          allowNode: false,
          // 不允许边连接到边
          allowEdge: false,
          // 不允许创建循环连接
          allowLoop: false,
          // 高亮可连接的目标
          highlight: true,
          // 吸附到节点
          snap: {
            radius: 30,
          },
          // 边的默认样式
          createEdge() {
            return new Edge({
              attrs: {
                line: {
                  stroke: '#1890ff',
                  strokeWidth: 2,
                  sourceMarker: strategy.defaultSourceMarker !== undefined ? strategy.defaultSourceMarker : undefined,
                  targetMarker: strategy.defaultEdgeMarker !== undefined ? strategy.defaultEdgeMarker : {
                    name: 'block',
                    width: 12,
                    height: 8,
                  },
                },
              },
              router: {
                name: 'orth',
              },
              connector: {
                name: 'rounded',
                args: { radius: 8 },
              },
            })
          },
          // 验证连接是否合法
          validateConnection({ sourceCell, targetCell }) {
            // 不允许连接到自身
            if (sourceCell && targetCell && sourceCell === targetCell) {
              return false
            }
            return true
          },
        },
      })

      graphRef.current = graph
      setGraphReady(true)

      if (!readOnly && stencilContainerRef.current) {
        const stencil = new Stencil({
          title: '组件库',
          target: graph,
          stencilGraphWidth: strategy.stencilGraphWidth || 160,
          stencilGraphHeight: strategy.stencilGraphHeight || 0,
          stencilGraphPadding: strategy.stencilGraphPadding || 10,
          collapsable: true,
          groups: [
            {
              name: 'default',
              title: '基础组件',
            },
          ],
          layoutOptions: strategy.stencilLayoutOptions || {
            columns: 1,
            columnWidth: 140,
            rowHeight: 120,
          },
        })

        if (stencilContainerRef.current) {
          stencilContainerRef.current.appendChild(stencil.container)
        }
        stencilRef.current = stencil

        const nodes = strategy.sidebarItems.map((item) => {
          const { data: defaultData, ...otherAttrs } = item.defaultAttrs || {};
          return graph.createNode({
            shape: item.shape,
            ...otherAttrs,
            // Ensure data has what we need（元数据）
            data: {
              nodeName: item.label,
              ...(defaultData || {})
            }
          })
        })

        stencil.load(nodes, 'default')
      }

      if (data && Object.keys(data).length > 0) {
        graph.fromJSON(data)
      }

      if (onChange && !readOnly) {
        const updateData = () => onChange(graph.toJSON())
        graph.on('node:change:position', updateData)
        graph.on('node:added', updateData)
        graph.on('node:removed', updateData)
        graph.on('edge:added', updateData)
        graph.on('edge:removed', updateData)
        graph.on('cell:change:data', updateData)
      }

      // 监听时序图边的数据变化，自动更新 label
      graph.on('edge:change:data', ({ edge }) => {
        const data = edge.getData() || {}
        // 判断是否是时序图消息边
        if (data.sourceId !== undefined && data.targetId !== undefined) {
          const parts = []
          if (data.stereotype && data.stereotype !== 'base') {
            parts.push(`<<${data.stereotype}>>`)
          }
          const msg = data.message || ''
          const prm = data.params ? data.params.map((item: any) => `${item.name}: ${item.type}`).join(', ') : ''
          const ret = data.returnType ? `: ${data.returnType}` : ''

          const mainPart = `${msg}(${prm})${ret}`
          if (mainPart !== '()') {
            parts.push(mainPart)
          }
          const labelText = parts.join('\n')

          if (labelText) {
            edge.setLabels([{ attrs: { label: { text: labelText } } }])
          } else {
            edge.setLabels([])
          }

          // 根据 msgType 切换箭头形态
          if (data.msgType === 'async') {
            edge.attr('line/targetMarker/name', 'classic')
          } else if (data.msgType === 'sync') {
            edge.attr('line/targetMarker/name', 'block')
          }

          // 根据 isReturn 切换实线与虚线
          edge.attr({
            line: {
              strokeDasharray: data.isReturn ? 5 : null
            }
          })
        }
      })

      // 边删除时清理对应的 port
      if (!readOnly) {
        graph.on('edge:removed', ({ edge }) => {
          const src = edge.getSource() as { cell?: string; port?: string }
          const tgt = edge.getTarget() as { cell?: string; port?: string }

          const cleanupPort = (cellId: string | undefined, portId: string | undefined) => {
            if (!cellId || !portId) return
            const node = graph.getCellById(cellId)
            if (!node || !node.isNode()) return

            // 仅清理支持多 port 的节点上的动态 port
            const nodeShape = node.shape
            const supportsMultiple = strategy.edgeRules?.supportsMultiplePorts?.(nodeShape) ?? false
            if (!supportsMultiple) return

            // 如果该 port 仍被其他边使用，不删除
            const connectedEdges = graph.getConnectedEdges(node)
            const stillInUse = connectedEdges.some((e) => {
              const eSrc = e.getSource() as { cell?: string; port?: string }
              const eTgt = e.getTarget() as { cell?: string; port?: string }
              return (eSrc?.cell === cellId && eSrc?.port === portId) ||
                (eTgt?.cell === cellId && eTgt?.port === portId)
            })
            if (stillInUse) return

            // 删除 port
            try {
              ; (node as any).removePort(portId)
            } catch {
              // port 可能已不存在
            }
          }

          cleanupPort(src?.cell, src?.port)
          cleanupPort(tgt?.cell, tgt?.port)
        })
      }

      // 右键菜单事件
      if (!readOnly) {
        graph.on('cell:contextmenu', ({ e, cell }) => {
          e.preventDefault()
          e.stopPropagation()
          setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            cell,
          })
        })

        // 点击画布空白处关闭菜单和收起属性面板
        graph.on('blank:click', () => {
          setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
          setFormPanelCollapsed(true)
        })

        // 点击节点时关闭菜单并展开属性面板
        graph.on('node:click', () => {
          setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
          setFormPanelCollapsed(false)
        })

        // 点击边时关闭菜单并展开属性面板
        graph.on('edge:click', () => {
          setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
          setFormPanelCollapsed(false)
        })

        // ====== 悬停时添加源/目标端点拖拽工具，实现坐标系边的「拉伸」 ======
        if (sectionKey === 'interaction' || sectionKey === 'moduleResponses') {
          graph.on('edge:mouseenter', ({ edge }) => {
            edge.addTools([
              { name: 'source-arrowhead', args: { attrs: { fill: '#1890ff', stroke: '#fff', 'stroke-width': 2, r: 4 } } },
              { name: 'target-arrowhead', args: { attrs: { fill: '#1890ff', stroke: '#fff', 'stroke-width': 2, r: 4 } } },
              // { name: 'vertices' }
            ])
          })

          graph.on('edge:mouseleave', ({ edge }) => {
            edge.removeTools()
          })
        }

      }


      graph.use(new Snapline({ enabled: true }))
      graph.use(new Transform({
        resizing: {
          enabled: true,
          orthogonal: false,
          restrict: true,
        }
      }))

      return () => {
        const currentStencil = stencilRef.current

        // 清理 stencil 实例及其 DOM
        stencilRef.current = null

        // 使用 setTimeout 延迟卸载，避免 React 18+ 中的同步卸载冲突
        // 修复报错: "Attempted to synchronously unmount a root while React was already rendering"
        setTimeout(() => {
          if (currentStencil) {
            if (currentStencil.container && currentStencil.container.parentNode) {
              currentStencil.container.parentNode.removeChild(currentStencil.container)
            }
            currentStencil.dispose()
          }

          graph.dispose()
          if (graphInnerContainer && graphInnerContainer.parentNode) {
            graphInnerContainer.parentNode.removeChild(graphInnerContainer)
          }
        }, 0)

        setGraphReady(false)
      }
    }, [strategy, readOnly]) // Re-init when strategy changes (sectionKey changes) or readOnly changes.

    // Handle data updates when switching sections if the component is reused
    useEffect(() => {
      if (graphRef.current && data) {
        // Data handling logic (same as before)
      }
    }, [data])

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
              style={{ padding: sidebarCollapsed ? 0 : strategy.stencilGraphPadding, width: sidebarCollapsed ? 0 : (strategy.stencilGraphWidth || 160) }}
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
          {!readOnly && graphReady && graphRef.current && (
            <AddEdgePanel
              graph={graphRef.current}
              edgeRules={strategy.edgeRules}
              edgeMode={strategy.edgeMode}
              defaultSourceMarker={strategy.defaultSourceMarker}
              defaultEdgeMarker={strategy.defaultEdgeMarker}
            />
          )}
          {!readOnly && <div className="graph-help-text">Ctrl + 滚轮缩放 | 拖拽空白处平移</div>}
        </div>
        {/* 右侧表单面板 */}
        {!readOnly && graphReady && graphRef.current && (
          <div className={`form-panel-wrapper${formPanelCollapsed ? ' collapsed' : ''}`}>
            <button
              className="panel-toggle-btn form-panel-toggle-btn"
              onClick={() => setFormPanelCollapsed(prev => !prev)}
              title={formPanelCollapsed ? '展开属性面板' : '收起属性面板'}
            >
              {formPanelCollapsed ? <LeftOutlined /> : <RightOutlined />}
            </button>
            <FormPanelContainer
              graph={graphRef.current}
              formConfig={strategy.formConfig}
            />
          </div>
        )}
        {/* 右键菜单 */}
        {contextMenu.visible && (
          <Dropdown
            menu={{ items: contextMenuItems }}
            open={true}
            onOpenChange={(open) => !open && closeContextMenu()}
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
