import React from 'react'
import type { Graph } from '@antv/x6'
import { Button, Input, Select } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import './DialogMapWidgets.css'

type WidgetType = 'label' | 'image' | 'list' | 'button'
type WidgetActionType = 'execute' | 'navigate'

export interface DialogMapWidget {
  widget_id: string
  type: WidgetType | string
  name: string
  action: string
  action_type: WidgetActionType | string
  target: string
  condition: string
}

interface DialogMapWidgetsProps {
  value?: DialogMapWidget[]
  onChange?: (value: DialogMapWidget[]) => void
  graph?: Graph
}

const WIDGET_TYPE_OPTIONS = [
  { label: 'label', value: 'label' },
  { label: 'image', value: 'image' },
  { label: 'list', value: 'list' },
  { label: 'button', value: 'button' },
]

const ACTION_TYPE_OPTIONS = [
  { label: 'execute', value: 'execute' },
  { label: 'navigate', value: 'navigate' },
]

const createNextWidgetId = (widgets: DialogMapWidget[]) => {
  const usedIds = new Set(widgets.map(widget => widget.widget_id).filter(Boolean))

  for (let index = 1; ; index += 1) {
    const id = `WDG_${String(index).padStart(3, '0')}`
    if (!usedIds.has(id)) return id
  }
}

const createDefaultWidget = (widgets: DialogMapWidget[]): DialogMapWidget => ({
  widget_id: createNextWidgetId(widgets),
  type: 'button',
  name: '',
  action: '',
  action_type: 'execute',
  target: '',
  condition: '',
})

const normalizeWidgets = (value?: DialogMapWidget[]) => (
  Array.isArray(value) ? value : []
)

const getPageTargetOptions = (graph?: Graph) => {
  if (!graph) return []

  const seen = new Set<string>()
  return graph.getNodes()
    .filter(node => node.shape === 'page-node')
    .map(node => {
      const nodeName = node.getData()?.nodeName
      return typeof nodeName === 'string' ? nodeName.trim() : ''
    })
    .filter(nodeName => {
      if (!nodeName || seen.has(nodeName)) return false
      seen.add(nodeName)
      return true
    })
    .map(nodeName => ({ label: nodeName, value: nodeName }))
}

const DialogMapWidgets: React.FC<DialogMapWidgetsProps> = ({ value, onChange, graph }) => {
  const widgets = normalizeWidgets(value)
  const pageTargetOptions = getPageTargetOptions(graph)

  const commit = (nextWidgets: DialogMapWidget[]) => {
    onChange?.(nextWidgets)
  }

  const handleAdd = () => {
    commit([...widgets, createDefaultWidget(widgets)])
  }

  const handleDelete = (index: number) => {
    commit(widgets.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleUpdate = (index: number, updates: Partial<DialogMapWidget>) => {
    const nextWidgets = [...widgets]
    const nextWidget = {
      ...nextWidgets[index],
      ...updates,
    }

    if (updates.action_type && updates.action_type !== 'navigate') {
      nextWidget.target = ''
    }

    nextWidgets[index] = nextWidget
    commit(nextWidgets)
  }

  return (
    <div className="dialog-map-widgets">
      <div className="dialog-map-widgets__toolbar">
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          添加组件
        </Button>
      </div>

      <div className="dialog-map-widgets__list">
        {widgets.length === 0 && (
          <div className="dialog-map-widgets__empty">暂无组件</div>
        )}

        {widgets.map((widget, index) => {
          const isNavigate = widget.action_type === 'navigate'
          const widgetId = widget.widget_id || `Widget ${index + 1}`

          return (
            <div key={`${widgetId}-${index}`} className="dialog-map-widgets__item">
              <div className="dialog-map-widgets__header">
                <span className="dialog-map-widgets__title">{widgetId}</span>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(index)}
                />
              </div>

              <div className="dialog-map-widgets__body">
                <label className="dialog-map-widgets__field">
                  <span>类型</span>
                  <Select
                    size="small"
                    value={widget.type || 'button'}
                    options={WIDGET_TYPE_OPTIONS}
                    onChange={(nextType) => handleUpdate(index, { type: nextType })}
                  />
                </label>

                <label className="dialog-map-widgets__field">
                  <span>名称</span>
                  <Input
                    size="small"
                    value={widget.name || ''}
                    onChange={(event) => handleUpdate(index, { name: event.target.value })}
                    placeholder="组件名称"
                  />
                </label>

                <label className="dialog-map-widgets__field">
                  <span>动作类型</span>
                  <Select
                    size="small"
                    value={widget.action_type || 'execute'}
                    options={ACTION_TYPE_OPTIONS}
                    onChange={(nextActionType) => handleUpdate(index, { action_type: nextActionType })}
                  />
                </label>

                {isNavigate && (
                  <label className="dialog-map-widgets__field">
                    <span>目标页面</span>
                    <Select
                      size="small"
                      value={widget.target || undefined}
                      options={pageTargetOptions}
                      placeholder="选择 Page"
                      onChange={(nextTarget) => handleUpdate(index, { target: nextTarget })}
                      disabled={pageTargetOptions.length === 0}
                    />
                  </label>
                )}

                <label className="dialog-map-widgets__field dialog-map-widgets__field--wide">
                  <span>动作</span>
                  <Input.TextArea
                    size="small"
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    value={widget.action || ''}
                    onChange={(event) => handleUpdate(index, { action: event.target.value })}
                    placeholder="动作"
                  />
                </label>

                <label className="dialog-map-widgets__field dialog-map-widgets__field--wide">
                  <span>条件</span>
                  <Input.TextArea
                    size="small"
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    value={widget.condition || ''}
                    onChange={(event) => handleUpdate(index, { condition: event.target.value })}
                    placeholder="条件"
                  />
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DialogMapWidgets
