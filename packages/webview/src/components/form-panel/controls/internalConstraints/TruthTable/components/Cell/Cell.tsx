import React, { useState, useEffect, useRef } from 'react'
import { Select, Tooltip, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import type { Graph } from '@antv/x6'
import ActionEditor from '../../../ActionEditor'
import './Cell.css'
import type { ActionValue } from '../../../ActionEditor/ActionEditor'

interface CellProps {
  value: any
  readonly: boolean
  type: 'header' | 'body' | 'footer'
  contextMenu?: {
    items: MenuProps['items']
    onClick: (e: any) => void
  }
  onUpdate?: (value: any) => void
  onFinish?: () => void
  graph?: Graph
  currentNodeId?: string
}

const bodyOptions = [
  { value: 'true', label: 'true' },
  { value: 'false', label: 'false' },
  { value: '-', label: '-' },
]

export const Cell: React.FC<CellProps> = ({
  value: _value,
  type,
  onUpdate,
  onFinish: onFinishProp,
  readonly,
  contextMenu,
  graph,
  currentNodeId,
}) => {
  // 处理 header 类型的值
  let value = _value
  if (type === 'header') {
    if (_value && typeof _value === 'string') {
      // 解析 "name symbol value" 格式
      const parts = _value.split(' ')
      value = {
        name: parts[0] || '',
        symbol: parts[1] || '',
        value: parts[2] || '',
        isStandard: true,
      }
    } else if (!_value) {
      value = { name: '', symbol: '', value: '', isStandard: true }
    }
  }

  const [editMode, setEditMode] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  const handleFinish = () => {
    setEditMode(false)
    onFinishProp?.()
  }

  const handleSelect = (selectedValue: string) => {
    onUpdate?.(selectedValue)
    setLocalValue(selectedValue)
    setEditMode(false)
  }

  const handleActionUpdate = (actionValue: ActionValue) => {
    // 将 ActionValue 转换为字符串格式
    const v = `${actionValue.name || ''} ${actionValue.symbol || ''} ${actionValue.value || ''}`.trim()
    onUpdate?.(v)
    setLocalValue(actionValue)
  }

  const handleTargetChange = (target: { id: string; name: string }) => {
    onUpdate?.(target)
    setLocalValue(target)
    setEditMode(false)
  }

  const handleClick = () => {
    if (!readonly) {
      setEditMode(true)
    }
  }

  // 渲染编辑模式
  if (editMode) {
    switch (type) {
      case 'header':
        return (
          <div className="cell-editing" style={{ padding: '2px' }}>
            <ActionEditor
              value={localValue}
              onUpdate={handleActionUpdate}
              onFinish={handleFinish}
              controlSchema={{ groupId: 'normal_testcase' }}
            />
          </div>
        )
      case 'body':
        return (
          <div className="cell-editing">
            <Select
              autoFocus
              value={localValue || '-'}
              options={bodyOptions}
              placeholder="真值"
              style={{ width: '100%' }}
              onBlur={handleFinish}
              onSelect={handleSelect}
            />
          </div>
        )
      case 'footer':
        return (
          <div className="cell-editing">
            <FooterEditor
              value={localValue}
              onChange={handleTargetChange}
              onFinish={handleFinish}
              graph={graph}
              currentNodeId={currentNodeId}
            />
          </div>
        )
      default:
        return null
    }
  }

  // 渲染显示模式
  const text =
    type === 'footer'
      ? (localValue?.name || localValue?.id || localValue || '-')
      : type === 'header'
      ? (typeof localValue === 'string'
          ? localValue
          : `${localValue.name || ''} ${localValue.symbol || ''} ${localValue.value || ''}`.trim() || '-')
      : localValue || '-'

  const cellContent = (
    <span className="cell cell-display" onClick={handleClick}>
      <Tooltip title={text}>{text}</Tooltip>
    </span>
  )

  return contextMenu ? (
    <Dropdown menu={contextMenu} trigger={['contextMenu']}>
      {cellContent}
    </Dropdown>
  ) : (
    cellContent
  )
}

// Footer 编辑器组件 - 简化版的 TargetSelecter
interface FooterEditorProps {
  value?: { id: string; name: string }
  onChange?: (value: { id: string; name: string }) => void
  onFinish?: () => void
  graph?: Graph
  currentNodeId?: string
}

const FooterEditor: React.FC<FooterEditorProps> = ({
  value = { id: '', name: '' },
  onChange,
  onFinish,
  graph,
  currentNodeId,
}) => {
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([])
  const [searchValue, setSearchValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const tempEdgeRef = useRef<any>(null)

  // 获取可选节点列表
  useEffect(() => {
    if (!graph) return

    const nodes = graph.getNodes()
    const filteredNodes = nodes.filter((node: any) => {
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

    cleanup()

    const sourceNode = graph.getCellById(currentNodeId)
    const targetNode = graph.getCellById(targetNodeId)

    if (!sourceNode || !targetNode) return

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
        }
      },
      router: {
        name: 'orth',
        args: {
          padding: { left: 50 },
        },
      },
      zIndex: -1
    })

    tempEdgeRef.current = edge
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      if (containerRef.current && containerRef.current.contains(target)) {
        return
      }

      // 检查是否点击在滚动条上
      const isClickOnScrollbar = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect()
        const x = event.clientX
        const y = event.clientY

        if (x >= rect.left + element.clientWidth && x <= rect.right) {
          return true
        }
        if (y >= rect.top + element.clientHeight && y <= rect.bottom) {
          return true
        }
        return false
      }

      let currentElement = target
      while (currentElement && currentElement !== document.body) {
        if (isClickOnScrollbar(currentElement)) {
          return
        }
        currentElement = currentElement.parentElement as HTMLElement
      }

      cleanup()
      onFinish?.()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onFinish])

  // 处理选择
  const handleSelect = (option: { id: string; name: string }) => {
    handleOptionMouseLeave(option.id)
    cleanup()
    onChange?.({ id: option.id, name: option.name })
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

    // 创建临时边预览
    createTempEdge(nodeId)
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

    cleanup()
  }

  return (
    <div className="footer-editor" ref={containerRef}>
      <input
        type="text"
        className="footer-editor-input"
        placeholder="搜索目标节点"
        value={searchValue}
        onChange={handleSearchChange}
        onFocus={() => setShowDropdown(true)}
        autoFocus
      />
      {showDropdown && filteredOptions.length > 0 && (
        <div className="footer-editor-dropdown">
          {filteredOptions.map(option => (
            <div
              key={option.id}
              className="footer-editor-option"
              onMouseDown={() => handleSelect(option)}
              onMouseEnter={() => handleOptionMouseEnter(option.id)}
              onMouseLeave={() => handleOptionMouseLeave(option.id)}
            >
              {option.name}
            </div>
          ))}
        </div>
      )}
      {showDropdown && filteredOptions.length === 0 && (
        <div className="footer-editor-dropdown">
          <div className="footer-editor-empty">无匹配节点</div>
        </div>
      )}
    </div>
  )
}

export default Cell
