import React, { useState, useMemo, useRef } from 'react'
import { Button, Radio } from 'antd'
import { PlusOutlined, CloseOutlined } from '@ant-design/icons'
import type { Graph, Node } from '@antv/x6'
import type { EdgeRules, EdgeMode } from './strategies/types'
import Draggable from 'react-draggable'
import './AddEdgePanel.css'

interface AddEdgePanelProps {
  graph: Graph
  edgeRules?: EdgeRules
  /** 无 edgeRules 时的连线模式，默认 'direct'（直连节点）；'sequence' 为时序图坐标连线模式 */
  edgeMode?: EdgeMode
  defaultSourceMarker?: string | Record<string, any> | null
  defaultEdgeMarker?: string | Record<string, any> | null
}

interface NodeOption {
  id: string
  name: string
  shape: string
}

const AddEdgePanel: React.FC<AddEdgePanelProps> = ({ graph, edgeRules, edgeMode, defaultSourceMarker, defaultEdgeMarker }) => {
  // 当前连线模式判断：
  // - 有 edgeRules：走 Port 连线逻辑（优先级最高，本变量不影响）
  // - edgeMode === 'sequence'：走时序图坐标连线逻辑（offsetY 防重叠 + 自连线 + 自动 label）
  // - 其他（默认 'direct'）：走简单直连节点逻辑
  const isSequenceMode = !edgeRules && edgeMode === 'sequence'
  const [expanded, setExpanded] = useState(false)
  const [sourceId, setSourceId] = useState<string>('')
  const [targetId, setTargetId] = useState<string>('')
  const [sourceOutput, setSourceOutput] = useState<string>('')
  const [sourceSearch, setSourceSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')
  const [showSourceDropdown, setShowSourceDropdown] = useState(false)
  const [showTargetDropdown, setShowTargetDropdown] = useState(false)
  const sourceInputRef = useRef<HTMLInputElement>(null)
  const targetInputRef = useRef<HTMLInputElement>(null)
  const tempEdgeRef = useRef<any>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  // 获取画布上所有节点
  const nodes = useMemo<NodeOption[]>(() => {
    if (!expanded) return []
    return graph.getNodes().map(node => ({
      id: node.id,
      name: node.getData()?.className || node.getData()?.nodeName || node.id.substring(0, 8),
      shape: node.shape,
    }))
  }, [graph, expanded])

  // 获取当前选中源节点的 shape
  const sourceNodeShape = useMemo(() => {
    if (!sourceId) return ''
    const node = graph.getCellById(sourceId)
    return node?.shape || ''
  }, [graph, sourceId])

  // 判断起始节点是否有多个输出
  const hasMultipleOutputs = useMemo(() => {
    if (!sourceId || !edgeRules?.hasMultipleOutputs) return false
    return edgeRules.hasMultipleOutputs(sourceId, sourceNodeShape)
  }, [sourceId, sourceNodeShape, edgeRules])

  // 获取输出选项
  const outputOptions = useMemo(() => {
    if (!hasMultipleOutputs || !edgeRules?.getOutputOptions) return []
    return edgeRules.getOutputOptions(sourceId, sourceNodeShape)
  }, [hasMultipleOutputs, sourceId, sourceNodeShape, edgeRules])

  // 高亮节点
  const highlightNode = (nodeId: string) => {
    if (!graph || !nodeId) return
    const node = graph.getCellById(nodeId)
    if (!node) return
    const view = graph.findViewByCell(node)
    if (view) {
      view.highlight()
    }
  }

  // 取消高亮节点
  const unhighlightNode = (nodeId: string) => {
    if (!graph || !nodeId) return
    const node = graph.getCellById(nodeId)
    if (!node) return
    const view = graph.findViewByCell(node)
    if (view) {
      view.unhighlight()
    }
  }

  // 清理临时边
  const cleanupTempEdge = () => {
    if (tempEdgeRef.current) {
      try {
        graph.removeEdge(tempEdgeRef.current)
      } catch (e) {
        // 边可能已被移除
      }
      tempEdgeRef.current = null
    }
  }

  // 是否允许自连线（仅时序图 sequence 模式允许，直连模式下自连线无意义）
  const allowSelfLoop = isSequenceMode

  // 创建临时预览边
  const createTempEdge = (srcId: string, tgtId: string) => {
    if (!graph || !srcId || !tgtId) return
    if (srcId === tgtId && !allowSelfLoop) return
    cleanupTempEdge()

    const edgeOpts: any = {
      attrs: {
        line: {
          stroke: '#1890ff',
          strokeWidth: 2,
          strokeDasharray: '5 5',
          sourceMarker: defaultSourceMarker !== undefined ? defaultSourceMarker : undefined,
          targetMarker: defaultEdgeMarker !== undefined ? defaultEdgeMarker : { name: 'classic', size: 8 },
          style: { animation: 'ant-line 30s infinite linear' },
        },
      },
      zIndex: -1,
    }

    if (srcId === tgtId) {
      // 自连线：用坐标 + vertices 画出可见的回环
      const node = graph.getCellById(srcId) as Node
      if (!node) return
      const bbox = node.getBBox()
      const rightX = bbox.x + bbox.width
      const centerY = bbox.center.y
      const loopOffset = 40
      edgeOpts.source = { x: rightX, y: centerY }
      edgeOpts.target = { x: rightX, y: centerY + 20 }
      edgeOpts.vertices = [
        { x: rightX + loopOffset, y: centerY },
        { x: rightX + loopOffset, y: centerY + 20 },
      ]
    } else {
      edgeOpts.source = srcId
      edgeOpts.target = tgtId
      edgeOpts.router = { name: 'manhattan' }
    }

    const edge = graph.addEdge(edgeOpts)
    tempEdgeRef.current = edge
  }

  // 更新临时边
  const updateTempEdge = (srcId: string, tgtId: string) => {
    if (srcId && tgtId && (srcId !== tgtId || allowSelfLoop)) {
      createTempEdge(srcId, tgtId)
    } else {
      cleanupTempEdge()
    }
  }

  // 获取节点显示名称
  const getNodeName = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    return node?.name || ''
  }

  // 过滤选项
  const filterOptions = (search: string, excludeId?: string) => {
    return nodes.filter(option => {
      if (excludeId && option.id === excludeId) return false
      const searchLower = search.toLowerCase()
      return option.name.toLowerCase().includes(searchLower) ||
        option.id.toLowerCase().includes(searchLower)
    })
  }

  // ======== Port 管理辅助函数 ========

  // 确保节点有 port groups 配置
  const ensurePortGroups = (node: Node) => {
    if (!edgeRules?.getPortGroups) return
    const nodeShape = node.shape
    const portGroups = edgeRules.getPortGroups(nodeShape)

    // 检查节点是否已有 port groups
    const existingPorts = node.getPorts()
    if (existingPorts.length > 0) return // 已有 ports，说明 groups 已配置

    // 通过 prop 设置 port groups
    node.prop('ports/groups', portGroups)
  }

  // 确保固定 port 节点有初始 ports
  const ensureInitialPorts = (node: Node) => {
    if (!edgeRules?.getInitialPorts) return
    const nodeShape = node.shape
    const initialPorts = edgeRules.getInitialPorts(nodeShape)

    if (initialPorts.length === 0) return

    const existingPorts = node.getPorts()
    // 如果已有 ports，跳过
    if (existingPorts.length > 0) return

    initialPorts.forEach((port: any) => {
      node.addPort(port)
    })
  }

  // 查找或创建输出 port
  const findOrCreateOutputPort = (node: Node, nodeId: string): string | null => {
    const nodeShape = node.shape

    // Condition 节点：使用选中的输出 port
    if (nodeShape === 'condition-node') {
      return sourceOutput || null
    }

    const supportsMultiple = edgeRules?.supportsMultiplePorts?.(nodeShape) ?? false
    const ports = node.getPorts() || []

    // 获取输出 ports（group 为 'out'）
    const outPorts = ports.filter((p: any) => p.group === 'out')

    if (!supportsMultiple) {
      // 固定 port 节点：使用已有的单个输出 port
      return outPorts[0]?.id || null
    }

    // 动态 port 节点：查找未连接的空闲输出 port 或创建新的
    const edges = graph.getConnectedEdges(node)
    const usedOutputPortIds = new Set(
      edges
        .filter((e) => {
          const src = e.getSource() as { cell?: string; port?: string }
          return src?.cell === nodeId
        })
        .map((e) => {
          const src = e.getSource() as { cell?: string; port?: string }
          return src?.port
        })
        .filter(Boolean)
    )

    // 查找第一个未连接的输出 port
    const freePort = outPorts.find((p: any) => !usedOutputPortIds.has(p.id))
    if (freePort) return freePort.id ?? null

    // 创建新的输出 port
    const newPortId = `out-${outPorts.length}`
    node.addPort({ id: newPortId, group: 'out' })
    return newPortId
  }

  // 查找或创建输入 port
  const findOrCreateInputPort = (node: Node, nodeId: string): string | null => {
    const nodeShape = node.shape
    const supportsMultiple = edgeRules?.supportsMultiplePorts?.(nodeShape) ?? false
    const ports = node.getPorts() || []

    // 获取输入 ports（group 为 'in'）
    const inPorts = ports.filter((p: any) => p.group === 'in')

    if (!supportsMultiple) {
      // 固定 port 节点：使用已有的单个输入 port
      return inPorts[0]?.id || null
    }

    // 动态 port 节点：查找未连接的空闲输入 port 或创建新的
    const edges = graph.getConnectedEdges(node)
    const usedInputPortIds = new Set(
      edges
        .filter((e) => {
          const tgt = e.getTarget() as { cell?: string; port?: string }
          return tgt?.cell === nodeId
        })
        .map((e) => {
          const tgt = e.getTarget() as { cell?: string; port?: string }
          return tgt?.port
        })
        .filter(Boolean)
    )

    // 查找第一个未连接的输入 port
    const freePort = inPorts.find((p: any) => !usedInputPortIds.has(p.id))
    if (freePort) return freePort.id ?? null

    // 创建新的输入 port
    const newPortId = `in-${inPorts.length}`
    node.addPort({ id: newPortId, group: 'in' })
    return newPortId
  }

  // ======== 事件处理 ========

  // 处理选择起始节点
  const handleSelectSource = (option: NodeOption) => {
    unhighlightNode(option.id)
    setSourceId(option.id)
    setSourceSearch('')
    setShowSourceDropdown(false)

    // 重置输出选项
    setSourceOutput('')

    // 如果有输出选项，设置默认值
    if (edgeRules?.hasMultipleOutputs?.(option.id, option.shape)) {
      const options = edgeRules.getOutputOptions?.(option.id, option.shape) || []
      if (options.length > 0) {
        setSourceOutput(options[0].value)
      }
    }

    updateTempEdge(option.id, targetId)
  }

  // 处理选择目标节点
  const handleSelectTarget = (option: NodeOption) => {
    unhighlightNode(option.id)
    setTargetId(option.id)
    setTargetSearch('')
    setShowTargetDropdown(false)
    updateTempEdge(sourceId, option.id)
  }

  // 确认创建连线
  const handleConfirm = () => {
    if (!sourceId || !targetId) return
    if (sourceId === targetId && !allowSelfLoop) return

    cleanupTempEdge()

    const sourceNode = graph.getCellById(sourceId) as Node
    const targetNode = graph.getCellById(targetId) as Node
    if (!sourceNode || !targetNode) return

    // 构建边的配置
    const edgeConfig: any = {
      attrs: {
        line: {
          stroke: '#1890ff',
          strokeWidth: 2,
          sourceMarker: defaultSourceMarker !== undefined ? defaultSourceMarker : undefined,
          targetMarker: defaultEdgeMarker !== undefined ? defaultEdgeMarker : { name: 'block', width: 12, height: 8 },
        },
      },
      router: { name: 'manhattan' },
      connector: { name: 'rounded', args: { radius: 8 } },
      data: {
        sourceOutput: sourceOutput || undefined,
      },
    }

    if (edgeRules) {
      // === 模式一：有 edgeRules，通过 Port 连接 ===
      ensurePortGroups(sourceNode)
      ensureInitialPorts(sourceNode)
      ensurePortGroups(targetNode)
      ensureInitialPorts(targetNode)

      const sourcePortId = findOrCreateOutputPort(sourceNode, sourceId)
      if (!sourcePortId) return
      const targetPortId = findOrCreateInputPort(targetNode, targetId)
      if (!targetPortId) return

      edgeConfig.source = { cell: sourceId, port: sourcePortId }
      edgeConfig.target = { cell: targetId, port: targetPortId }

      // 为 condition 节点的 output 赋予默认的 condition 属性和标签
      if (sourceOutput === 'out-yes' || sourceOutput === 'out-no') {
        const conditionText = sourceOutput === 'out-yes' ? '[Yes]' : '[No]'
        edgeConfig.data.condition = conditionText
        edgeConfig.labels = [{ attrs: { text: { text: conditionText } } }]
      }
    } else if (isSequenceMode) {
      // === 模式二：时序图坐标连线（sequence mode） ===
      // 计算相同节点对之间已有的边数量，用于 Y 轴偏移避免重叠
      const existingEdges = graph.getEdges().filter((e) => {
        const eSrc = e.getSource() as { cell?: string }
        const eTgt = e.getTarget() as { cell?: string }
        // 兼容通过坐标连接的边，通过 data 中的 sourceId 和 targetId 判断
        const data = e.getData() || {}
        const srcId = eSrc?.cell || data.sourceId
        const tgtId = eTgt?.cell || data.targetId
        return (srcId === sourceId && tgtId === targetId) ||
          (srcId === targetId && tgtId === sourceId)
      })
      const offsetY = existingEdges.length * 40

      const initData = { ...edgeConfig.data, sourceId, targetId }
      edgeConfig.data = initData

      if (sourceId === targetId) {
        // === 自连线：从节点右侧画出回环 ===
        const bbox = sourceNode.getBBox()
        const rightX = bbox.x + bbox.width
        const centerY = bbox.center.y + offsetY
        const loopOffset = 40

        edgeConfig.source = { x: rightX, y: centerY }
        edgeConfig.target = { x: rightX, y: centerY + 20 }
        edgeConfig.vertices = [
          { x: rightX + loopOffset, y: centerY },
          { x: rightX + loopOffset, y: centerY + 20 },
        ]
        // 自连线不使用 manhattan router，用直连折线
        delete edgeConfig.router
      } else {
        const sourceCenter = sourceNode.getBBox().center
        const targetCenter = targetNode.getBBox().center

        edgeConfig.source = {
          x: sourceCenter.x,
          y: sourceCenter.y + offsetY,
        }
        edgeConfig.target = {
          x: targetCenter.x,
          y: targetCenter.y + offsetY,
        }
      }

      const formatLabel = (data: any) => {
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
        return parts.join('\n')
      }

      const labelText = formatLabel(initData)
      if (labelText) {
        const displayLabel = labelText.length > 25 ? labelText.substring(0, 25) + '...' : labelText
        edgeConfig.labels = [{
          attrs: {
            text: { text: displayLabel }
          }
        }]
      }
    } else {
      // === 模式三：直连节点（direct mode，默认） ===
      // 直接使用 cell id 连接，让 X6 自动计算连线位置
      edgeConfig.source = sourceId
      edgeConfig.target = targetId
    }

    graph.addEdge(edgeConfig)

    // 重置状态
    setSourceId('')
    setTargetId('')
    setSourceOutput('')
    setExpanded(false)
  }

  // 取消
  const handleCancel = () => {
    cleanupTempEdge()
    setSourceId('')
    setTargetId('')
    setSourceOutput('')
    setSourceSearch('')
    setTargetSearch('')
    setExpanded(false)
  }

  // 处理失焦
  const handleBlur = (
    e: React.FocusEvent<HTMLDivElement>,
    setShowDropdown: (show: boolean) => void,
    setSearch: (s: string) => void
  ) => {
    const currentTarget = e.currentTarget
    setTimeout(() => {
      if (!currentTarget?.contains(document.activeElement)) {
        setShowDropdown(false)
        setSearch('')
      }
    }, 200)
  }

  // 无 edgeRules 时允许自连线，不排除已选节点
  const sourceOptions = filterOptions(sourceSearch, allowSelfLoop ? undefined : targetId)
  const targetOptions = filterOptions(targetSearch, allowSelfLoop ? undefined : sourceId)

  if (!expanded) {
    return (
      <div className="add-edge-toolbar">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setExpanded(true)}
        >
          添加连线
        </Button>
      </div>
    )
  }

  return (
    <Draggable nodeRef={nodeRef} handle=".add-edge-panel-header" bounds="parent">
      <div ref={nodeRef} className="add-edge-panel-container">
        <div className="add-edge-panel">
          <div className="add-edge-panel-header" style={{ cursor: 'move' }}>
            <span style={{ userSelect: 'none' }}>添加连线</span>
            <CloseOutlined className="add-edge-panel-close" onClick={handleCancel} />
          </div>

          <div className="add-edge-panel-body">
            {/* 起始节点选择器 */}
            <div
              className="add-edge-selector"
              onBlur={(e) => handleBlur(e, setShowSourceDropdown, setSourceSearch)}
            >
              <label>起始节点</label>
              <input
                ref={sourceInputRef}
                type="text"
                className="add-edge-input"
                placeholder={sourceId ? getNodeName(sourceId) : '搜索节点...'}
                value={sourceSearch}
                onChange={(e) => {
                  setSourceSearch(e.target.value)
                  setShowSourceDropdown(true)
                }}
                onFocus={() => setShowSourceDropdown(true)}
              />
              {showSourceDropdown && sourceOptions.length > 0 && (
                <div className="add-edge-dropdown">
                  {sourceOptions.map(option => (
                    <div
                      key={option.id}
                      className="add-edge-option"
                      onMouseDown={() => handleSelectSource(option)}
                      onMouseEnter={() => highlightNode(option.id)}
                      onMouseLeave={() => unhighlightNode(option.id)}
                    >
                      {option.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 输出选择器（仅当起始节点有多个输出时显示） */}
            {hasMultipleOutputs && outputOptions.length > 0 && (
              <div className="add-edge-selector">
                <label>输出端口</label>
                <Radio.Group
                  value={sourceOutput}
                  onChange={(e) => setSourceOutput(e.target.value)}
                  className="add-edge-output-selector"
                >
                  {outputOptions.map(option => (
                    <Radio key={option.value} value={option.value}>
                      {option.label}
                    </Radio>
                  ))}
                </Radio.Group>
              </div>
            )}

            {/* 目标节点选择器 */}
            <div
              className="add-edge-selector"
              onBlur={(e) => handleBlur(e, setShowTargetDropdown, setTargetSearch)}
            >
              <label>目标节点</label>
              <input
                ref={targetInputRef}
                type="text"
                className="add-edge-input"
                placeholder={targetId ? getNodeName(targetId) : '搜索节点...'}
                value={targetSearch}
                onChange={(e) => {
                  setTargetSearch(e.target.value)
                  setShowTargetDropdown(true)
                }}
                onFocus={() => setShowTargetDropdown(true)}
              />
              {showTargetDropdown && targetOptions.length > 0 && (
                <div className="add-edge-dropdown">
                  {targetOptions.map(option => (
                    <div
                      key={option.id}
                      className="add-edge-option"
                      onMouseDown={() => handleSelectTarget(option)}
                      onMouseEnter={() => highlightNode(option.id)}
                      onMouseLeave={() => unhighlightNode(option.id)}
                    >
                      {option.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="add-edge-panel-footer">
            <Button size="small" onClick={handleCancel}>取消</Button>
            <Button
              size="small"
              type="primary"
              disabled={!sourceId || !targetId || (sourceId === targetId && !allowSelfLoop)}
              onClick={handleConfirm}
            >
              确认
            </Button>
          </div>
        </div>
      </div>
    </Draggable>
  )
}

export default AddEdgePanel
