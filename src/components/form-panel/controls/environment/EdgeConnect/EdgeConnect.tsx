import React, { useMemo, useState } from 'react'
import { Button, Input, Select } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Graph, Edge } from '@antv/x6'
import './EdgeConnect.css'

// ============ Data Types ============
interface Interaction {
  name: string
  sender: string
  receiver: string
  message: string
}

interface Connect {
  interactions: Interaction[]
}

// ============ Props ============
interface Props {
  /** connect 字段值 */
  value?: Connect
  onChange?: (value: Connect) => void
  /** 由 FormPanel 自动注入 */
  graph?: Graph
  currentNodeId?: string  // FormPanel 以 selectedCell.id 传入
}

const EMPTY_INTERACTION = (): Interaction => ({
  name: '',
  sender: '',
  receiver: '',
  message: '',
})

const EdgeConnect: React.FC<Props> = ({ value, onChange, graph, currentNodeId }) => {
  const [expanded, setExpanded] = useState<number | null>(null)

  const interactions: Interaction[] = value?.interactions ?? []

  // 从当前边解析 source / target 节点，构造 sender/receiver 选项
  const nodeOptions = useMemo(() => {
    if (!graph || !currentNodeId) return []

    const edge = graph.getCellById(currentNodeId) as Edge | null
    if (!edge || !edge.isEdge()) return []

    const sourceId = (edge.getSource() as any)?.cell || (edge.getSource() as any)?.id
    const targetId = (edge.getTarget() as any)?.cell || (edge.getTarget() as any)?.id

    const options: { value: string; label: string }[] = []
      ;[sourceId, targetId].filter(Boolean).forEach((id) => {
        const node = graph.getCellById(id as string)
        if (node && node.isNode()) {
          const data = node.getData?.() || {}
          const label =
            data.deviceName ||
            data.ctrlName ||
            data.machineName ||
            data.ctrlUnitName ||
            data.nodeName ||
            (id as string).substring(0, 8)
          options.push({ value: id as string, label })
        }
      })

    return options
  }, [graph, currentNodeId])

  // ============ Helpers ============
  const notify = (newInteractions: Interaction[]) => {
    onChange?.({ ...value, interactions: newInteractions })
  }

  const addInteraction = () => {
    const next = [...interactions, EMPTY_INTERACTION()]
    notify(next)
    setExpanded(next.length - 1)
  }

  const removeInteraction = (idx: number) => {
    const next = interactions.filter((_, i) => i !== idx)
    notify(next)
    if (expanded === idx) setExpanded(null)
  }

  const updateField = (idx: number, field: keyof Interaction, val: string) => {
    const next = interactions.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    )
    notify(next)
  }

  const highlightNode = (nodeId: string) => {
    if (!graph || !nodeId) return
    const node = graph.getCellById(nodeId)
    if (node && node.isNode()) {
      graph.findView(node)?.highlight()
    }
  }

  const unhighlightNode = (nodeId: string) => {
    if (!graph || !nodeId) return
    const node = graph.getCellById(nodeId)
    if (node && node.isNode()) {
      graph.findView(node)?.unhighlight()
    }
  }

  // optionRender: 鼠标进入每个选项时高亮对应节点
  const makeOptionRender = () =>
    (opt: any) => (
      <div
        onMouseEnter={() => highlightNode(String(opt.value ?? ''))}
        onMouseLeave={() => unhighlightNode(String(opt.value ?? ''))}
        style={{ padding: '0' }}
      >
        {opt.label}
      </div>
    )

  // ============ Render ============
  return (
    <div className="edge-connect-container">
      {interactions.map((item, idx) => (
        <div key={idx} className="edge-connect-card">
          {/* 卡片标题行 */}
          <div
            className="edge-connect-card-header"
            onClick={() => setExpanded(expanded === idx ? null : idx)}
          >
            <span className="edge-connect-card-name">
              {item.name || `交互 ${idx + 1}`}
            </span>
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                removeInteraction(idx)
              }}
            />
          </div>

          {/* 展开详情 */}
          {expanded === idx && (
            <div className="edge-connect-card-body">
              <div className="edge-connect-row">
                <label>交互名称</label>
                <Input
                  size="small"
                  value={item.name}
                  onChange={(e) => updateField(idx, 'name', e.target.value)}
                  placeholder="交互名称"
                />
              </div>
              <div className="edge-connect-row">
                <label>发送方</label>
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  value={item.sender || undefined}
                  placeholder="选择发送方节点"
                  options={nodeOptions}
                  onChange={(val) => updateField(idx, 'sender', val)}
                  optionRender={makeOptionRender()}
                  allowClear
                />
              </div>
              <div className="edge-connect-row">
                <label>接收方</label>
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  value={item.receiver || undefined}
                  placeholder="选择接收方节点"
                  options={nodeOptions}
                  onChange={(val) => updateField(idx, 'receiver', val)}
                  optionRender={makeOptionRender()}
                  allowClear
                />
              </div>
              <div className="edge-connect-row">
                <label>消息内容</label>
                <Input
                  size="small"
                  value={item.message}
                  onChange={(e) => updateField(idx, 'message', e.target.value)}
                  placeholder="消息内容"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        onClick={addInteraction}
        block
      >
        添加交互
      </Button>
    </div>
  )
}

export default EdgeConnect
