import React, { useState, useEffect, useRef } from 'react'
import EditableSwitch from '../../common/EditableSwitch'
import './TargetSelecter.css'

interface TargetNode {
  id: string
  name: string
}

interface TargetSelecterProps {
  value?: TargetNode
  onChange?: (value: TargetNode) => void
  graph?: any
  currentNodeId?: string
}

const TargetSelecter: React.FC<TargetSelecterProps> = ({
  value = { id: '', name: '' },
  onChange,
  graph,
  currentNodeId
}) => {
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([])
  const [searchValue, setSearchValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tempEdgeRef = useRef<any>(null)
  const onFinishRef = useRef<(() => void) | null>(null)

  // 获取可选节点列表
  useEffect(() => {
    if (!graph) return

    const nodes = graph.getNodes()
    const filteredNodes = nodes.filter((node: any) => {
      const data = node.getData() || {}
      const shape = node.shape

      // 过滤掉当前节点和特定类型的节点
      return (
        node.id !== currentNodeId &&
        shape !== 'start-node' &&
        shape !== 'goto-node' &&
        shape !== 'call-node'
      )
    })

    const nodeOptions = filteredNodes.map((node: any) => {
      const data = node.getData() || {}
      return {
        id: node.id,
        name: data.nodeName || node.id.substring(0, 8)
      }
    })

    setOptions(nodeOptions)
  }, [graph, currentNodeId])

  // 清理临时边
  const cleanup = () => {
    if (!graph) return

    // 移除临时边
    if (tempEdgeRef.current) {
      try {
        graph.removeEdge(tempEdgeRef.current)
      } catch (e) {
        // 边可能已经被移除
      }
      tempEdgeRef.current = null
    }
  }

  // 创建临时连接边
  const createTempEdge = (targetNodeId: string) => {
    if (!graph || !currentNodeId || !targetNodeId) return

    // 先清理旧的临时边
    cleanup()

    const sourceNode = graph.getCellById(currentNodeId)
    const targetNode = graph.getCellById(targetNodeId)

    if (!sourceNode || !targetNode) return

    // 创建带动画的临时虚线边
    const edge = graph.addEdge({
      source: { cell: currentNodeId },
      target: { cell: targetNodeId },
      attrs: {
        line: {
          stroke: '#1890ff',
          strokeWidth: 2,
          strokeDasharray: '5 5',
          targetMarker: {
            name: 'classic',
            size: 8
          },
          style: {
            animation: 'ant-line 30s infinite linear'
          }
        }
      },
      router: {
        name: 'orth',
        args: {
          padding: {
            left: 50,
          },
        },
      },
      zIndex: -1
    })

    tempEdgeRef.current = edge
  }

  // 当选中目标节点时，显示临时连接
  useEffect(() => {
    // 清理之前的临时边
    cleanup()

    // 如果有选中的目标节点，创建新的临时边
    if (value && value.id && graph && currentNodeId) {
      createTempEdge(value.id)
    }

    // 组件卸载时清理
    return () => {
      cleanup()
    }
  }, [value?.id, graph, currentNodeId])

  // 处理选择
  const handleSelect = (option: { id: string; name: string }) => {
    // 取消高亮
    handleOptionMouseLeave(option.id)

    onChange?.({ id: option.id, name: option.name })
    setShowDropdown(false)
    setSearchValue('')
  }

  // 处理搜索
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
    setShowDropdown(true)
  }

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    option.id.toLowerCase().includes(searchValue.toLowerCase())
  )

  // 处理鼠标悬停选项 - 高亮节点
  const handleOptionMouseEnter = (nodeId: string) => {
    if (!graph || !nodeId) return

    const node = graph.getCellById(nodeId)
    if (!node) return

    const view = graph.findViewByCell(node)
    if (view) {
      view.highlight()
    }
  }

  // 处理鼠标离开选项 - 取消高亮
  const handleOptionMouseLeave = (nodeId: string) => {
    if (!graph || !nodeId) return

    const node = graph.getCellById(nodeId)
    if (!node) return

    const view = graph.findViewByCell(node)
    if (view) {
      view.unhighlight()
    }
  }

  // 处理失焦
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // 保存 currentTarget 的引用，因为在 setTimeout 中它可能变为 null
    const currentTarget = e.currentTarget
    // 延迟执行，允许点击下拉选项
    setTimeout(() => {
      if (!currentTarget || !currentTarget.contains(document.activeElement)) {
        setShowDropdown(false)
        setSearchValue('')
        // 调用 onFinish 关闭 EditableSwitch
        if (onFinishRef.current) {
          onFinishRef.current()
        }
      }
    }, 200)
  }

  const readonlyValue = value?.name || (value?.id ? value.id.substring(0, 8) : '未设置')

  return (
    <div className="target-selecter" onBlur={handleBlur}>
      <EditableSwitch readonlyValue={readonlyValue}>
        {(onFinish) => {
          // 保存 onFinish 回调到 ref
          onFinishRef.current = onFinish

          return (
            <div className="target-selecter-editor">
              <input
                ref={inputRef}
                type="text"
                className="target-selecter-input"
                placeholder="搜索目标节点"
                value={searchValue}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                autoFocus
              />
              {showDropdown && filteredOptions.length > 0 && (
                <div className="target-selecter-dropdown">
                  {filteredOptions.map(option => (
                    <div
                      key={option.id}
                      className="target-selecter-option"
                      onMouseDown={() => handleSelect(option)}
                      onMouseEnter={() => handleOptionMouseEnter(option.id)}
                      onMouseLeave={() => handleOptionMouseLeave(option.id)}
                    >
                      {option.name}
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && filteredOptions.length === 0 && searchValue && (
                <div className="target-selecter-dropdown">
                  <div className="target-selecter-empty">无匹配节点</div>
                </div>
              )}
            </div>
          )
        }}
      </EditableSwitch>
    </div>
  )
}

export default TargetSelecter
