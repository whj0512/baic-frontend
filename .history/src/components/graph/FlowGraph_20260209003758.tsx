import React, { useEffect, useRef, useMemo, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Graph, Snapline, Stencil, Edge, Cell } from '@antv/x6'
import { register } from '@antv/x6-react-shape'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import NodeWrapper from '../nodes/common/NodeWrapper'
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
}

// 暴露给父组件的方法
export interface FlowGraphRef {
  getGraph: () => Graph | null
}

const FlowGraph = forwardRef<FlowGraphRef, FlowGraphProps>(
  ({ sectionKey, data, onChange, readOnly = false }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stencilContainerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const stencilRef = useRef<Stencil | null>(null)
  const [graphReady, setGraphReady] = useState(false)

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

    const graph = new Graph({
      container: containerRef.current,
      // autoResize: true,
      height: 500
      grid: { size: 10, visible: true },
      panning: true,
      mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
      // 交互配置
      interacting: !readOnly ? {
        nodeMovable: true,
        edgeMovable: true,
        edgeLabelMovable: true,
      } : false,
      background: { color: '#f8f9fa' },
      // 启用选中功能
      selecting: {
        enabled: true,
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
      },
      // 连线配置
      connecting: {
        // 不允许边悬空（必须连接到目标节点）
        allowBlank: false,
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
                targetMarker: {
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
        stencilGraphWidth: 160,
        stencilGraphHeight: 0,
        collapsable: true,
        groups: [
          {
            name: 'default',
            title: '基础组件',
          },
        ],
        layoutOptions: {
          columns: 1,
          columnWidth: 140,
          rowHeight: 80,
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

      // 点击画布空白处关闭菜单
      graph.on('blank:click', () => {
        setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
      })

      // 点击节点/边时关闭菜单
      graph.on('cell:click', () => {
        setContextMenu(prev => ({ ...prev, visible: false, cell: null }))
      })
    }

    graph.use(new Snapline({ enabled: true }))

    return () => {
      graph.dispose()
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
      {!readOnly && (
        <div
          className="graph-sidebar"
          ref={stencilContainerRef}
          style={{ padding: 0 }}
        />
      )}
      <div className="graph-content-wrapper">
        <div ref={containerRef} className="x6-graph-container" />
        {!readOnly && graphReady && graphRef.current && (
          <div className="graph-toolbar">
            <AddEdgePanel graph={graphRef.current} edgeRules={strategy.edgeRules} />
          </div>
        )}
        {!readOnly && <div className="graph-help-text">Ctrl + 滚轮缩放 | 拖拽空白处平移</div>}
      </div>
      {/* 右侧表单面板 */}
      {!readOnly && graphReady && graphRef.current && (
        <FormPanelContainer
          graph={graphRef.current}
          formConfig={strategy.formConfig}
        />
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
