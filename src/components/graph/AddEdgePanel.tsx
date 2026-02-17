import React, { useState, useMemo, useRef } from 'react'
import { Button, Radio } from 'antd'
import { PlusOutlined, CloseOutlined } from '@ant-design/icons'
import type { Graph, Node, Edge } from '@antv/x6'
import type { EdgeRules } from './strategies/types'
import './AddEdgePanel.css'

interface AddEdgePanelProps {
  graph: Graph
  edgeRules?: EdgeRules
}

interface NodeOption {
  id: string
  name: string
  shape: string
}

const AddEdgePanel: React.FC<AddEdgePanelProps> = ({ graph, edgeRules }) => {
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

  // 获取画布上所有节点
  const nodes = useMemo<NodeOption[]>(() => {
    if (!expanded) return []
    return graph.getNodes().map(node => ({
      id: node.id,
      name: node.getData()?.nodeName || node.id.substring(0, 8),
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

  // 创建临时预览边
  const createTempEdge = (srcId: string, tgtId: string) => {
    if (!graph || !srcId || !tgtId || srcId === tgtId) return
    cleanupTempEdge()

    const edge = graph.addEdge({
      source: srcId,
      target: tgtId,
      attrs: {
        line: {
          stroke: '#1890ff',
          strokeWidth: 2,
          strokeDasharray: '5 5',
          targetMarker: { name: 'classic', size: 8 },
          style: { animation: 'ant-line 30s infinite linear' },
        },
      },
      router: { name: 'orth' },
      zIndex: -1,
    })
    tempEdgeRef.current = edge
  }

  // 更新临时边
  const updateTempEdge = (srcId: string, tgtId: string) => {
    if (srcId && tgtId && srcId !== tgtId) {
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
        .filter((e: Edge) => {
          const src = e.getSource() as Edge.TerminalCellData
          return src?.cell === nodeId
        })
        .map((e: Edge) => {
          const src = e.getSource() as Edge.TerminalCellData
          return src?.port
        })
        .filter(Boolean)
    )

    // 查找第一个未连接的输出 port
    const freePort = outPorts.find((p: any) => !usedOutputPortIds.has(p.id))
    if (freePort) return freePort.id

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
        .filter((e: Edge) => {
          const tgt = e.getTarget() as Edge.TerminalCellData
          return tgt?.cell === nodeId
        })
        .map((e: Edge) => {
          const tgt = e.getTarget() as Edge.TerminalCellData
          return tgt?.port
        })
        .filter(Boolean)
    )

    // 查找第一个未连接的输入 port
    const freePort = inPorts.find((p: any) => !usedInputPortIds.has(p.id))
    if (freePort) return freePort.id

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
    if (!sourceId || !targetId || sourceId === targetId) return

    cleanupTempEdge()

    const sourceNode = graph.getCellById(sourceId) as Node
    const targetNode = graph.getCellById(targetId) as Node
    if (!sourceNode || !targetNode) return

    // 确保两个节点都有 port groups 和初始 ports
    ensurePortGroups(sourceNode)
    ensureInitialPorts(sourceNode)
    ensurePortGroups(targetNode)
    ensureInitialPorts(targetNode)

    // 查找或创建源节点输出 port
    const sourcePortId = findOrCreateOutputPort(sourceNode, sourceId)
    if (!sourcePortId) return

    // 查找或创建目标节点输入 port
    const targetPortId = findOrCreateInputPort(targetNode, targetId)
    if (!targetPortId) return

    // 构建边的配置（通过 port 连接）
    const edgeConfig: any = {
      source: { cell: sourceId, port: sourcePortId },
      target: { cell: targetId, port: targetPortId },
      attrs: {
        line: {
          stroke: '#1890ff',
          strokeWidth: 2,
          targetMarker: { name: 'block', width: 12, height: 8 },
        },
      },
      router: { name: 'orth' },
      connector: { name: 'rounded', args: { radius: 8 } },
      data: {
        // 保存 sourceOutput 用于导出时判断 condition 节点的分支
        sourceOutput: sourceOutput || undefined,
      },
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

  const sourceOptions = filterOptions(sourceSearch, targetId)
  const targetOptions = filterOptions(targetSearch, sourceId)

  if (!expanded) {
    return (
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setExpanded(true)}
      >
        添加连线
      </Button>
    )
  }

  return (
    <div className="add-edge-panel">
      <div className="add-edge-panel-header">
        <span>添加连线</span>
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
          disabled={!sourceId || !targetId || sourceId === targetId}
          onClick={handleConfirm}
        >
          确认
        </Button>
      </div>
    </div>
  )
}

export default AddEdgePanel
