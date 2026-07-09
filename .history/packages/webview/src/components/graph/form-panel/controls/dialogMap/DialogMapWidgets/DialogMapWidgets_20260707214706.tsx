import React, { useEffect, useRef, useState } from 'react'
import type { Graph } from '@antv/x6'
import { Button, Input, Select } from 'antd'
import { DeleteOutlined, DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
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
  currentNodeId?: string
}

const WIDGET_TYPE_OPTIONS = [
  { label: 'label', value: 'label' },
  { label: 'image', value: 'image' },
  { label: 'list', value: 'list' },
  { label: 'button', value: 'button' },
]

const ACTION_TYPE_OPTIONS = [
  { label: 'execute', value: 'execute' },
  { label: 'dismiss', value: 'dismiss' },
  { label: 'popout', value: 'navigate' },
  { label: 'navigate', value: 'navigate' },
]

const getPageWidgets = (value: unknown): DialogMapWidget[] => (
  Array.isArray(value) ? value : []
)

const collectPageWidgets = (
  graph: Graph | undefined,
  currentNodeId: string | undefined,
  currentWidgets: DialogMapWidget[],
) => {
  if (!graph) return currentWidgets

  return graph.getNodes()
    .filter(node => node.shape === 'page-node')
    .flatMap(node => (
      node.id === currentNodeId
        ? currentWidgets
        : getPageWidgets(node.getData()?.widgets)
    ))
}

const createNextWidgetId = (
  graph: Graph | undefined,
  currentNodeId: string | undefined,
  currentWidgets: DialogMapWidget[],
) => {
  const pageWidgets = collectPageWidgets(graph, currentNodeId, currentWidgets)
  const maxIndex = pageWidgets.reduce((maxValue, widget) => {
    const match = /^WDG_(\d+)$/.exec(widget.widget_id || '')
    if (!match) return maxValue

    return Math.max(maxValue, Number(match[1]))
  }, 0)

  return `WDG_${String(maxIndex + 1).padStart(3, '0')}`
}

const createDefaultWidget = (
  graph: Graph | undefined,
  currentNodeId: string | undefined,
  widgets: DialogMapWidget[],
): DialogMapWidget => ({
  widget_id: createNextWidgetId(graph, currentNodeId, widgets),
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

const getWidgetCollapseId = (widget: DialogMapWidget, index: number) => (
  widget.widget_id || `Widget ${index + 1}`
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

const findPageNodesByName = (graph: Graph | undefined, nodeName: string) => {
  if (!graph || !nodeName) return []

  return graph.getNodes().filter(node => {
    const currentNodeName = node.getData()?.nodeName
    return node.shape === 'page-node'
      && typeof currentNodeName === 'string'
      && currentNodeName.trim() === nodeName
  })
}

const DialogMapWidgets: React.FC<DialogMapWidgetsProps> = ({ value, onChange, graph, currentNodeId }) => {
  const widgets = normalizeWidgets(value)
  const pageTargetOptions = getPageTargetOptions(graph)
  const widgetCollapseSignature = widgets.map(getWidgetCollapseId).join('\u0001')
  const pendingExpandedWidgetIdRef = useRef<string | null>(null)
  const [collapsedWidgetIds, setCollapsedWidgetIds] = useState<Set<string>>(
    () => new Set(widgetCollapseSignature ? widgetCollapseSignature.split('\u0001') : [])
  )

  useEffect(() => {
    const nextCollapsedWidgetIds = new Set(widgetCollapseSignature ? widgetCollapseSignature.split('\u0001') : [])
    if (pendingExpandedWidgetIdRef.current) {
      nextCollapsedWidgetIds.delete(pendingExpandedWidgetIdRef.current)
      pendingExpandedWidgetIdRef.current = null
    }
    setCollapsedWidgetIds(nextCollapsedWidgetIds)
  }, [currentNodeId, widgetCollapseSignature])

  const commit = (nextWidgets: DialogMapWidget[]) => {
    onChange?.(nextWidgets)
  }

  const handleAdd = () => {
    const nextWidget = createDefaultWidget(graph, currentNodeId, widgets)
    pendingExpandedWidgetIdRef.current = nextWidget.widget_id
    commit([...widgets, nextWidget])
  }

  const handleDelete = (index: number) => {
    const widgetId = widgets[index]?.widget_id
    if (widgetId) {
      setCollapsedWidgetIds((current) => {
        const next = new Set(current)
        next.delete(widgetId)
        return next
      })
    }
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

  const toggleWidget = (widgetId: string) => {
    setCollapsedWidgetIds((current) => {
      const next = new Set(current)
      if (next.has(widgetId)) {
        next.delete(widgetId)
      } else {
        next.add(widgetId)
      }
      return next
    })
  }

  const highlightPageNode = (nodeName: string) => {
    findPageNodesByName(graph, nodeName).forEach(node => {
      graph?.findView(node)?.highlight()
    })
  }

  const unhighlightPageNode = (nodeName: string) => {
    findPageNodesByName(graph, nodeName).forEach(node => {
      graph?.findView(node)?.unhighlight()
    })
  }

  const clearPageNodeHighlights = () => {
    pageTargetOptions.forEach(option => {
      unhighlightPageNode(String(option.value))
    })
  }

  const renderTargetOption = (option: any) => {
    const nodeName = String(option.value ?? '')

    return (
      <div
        className="dialog-map-widgets__target-option"
        onMouseEnter={() => highlightPageNode(nodeName)}
        onMouseLeave={() => unhighlightPageNode(nodeName)}
      >
        {option.label}
      </div>
    )
  }

  return (
    <div className="dialog-map-widgets">
      <div className="dialog-map-widgets__toolbar">
        <Button
          type="primary"
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
          const widgetId = getWidgetCollapseId(widget, index)
          const isCollapsed = collapsedWidgetIds.has(widgetId)

          return (
            <div key={`${widgetId}-${index}`} className="dialog-map-widgets__item">
              <div
                className="dialog-map-widgets__header"
                role="button"
                tabIndex={0}
                onClick={() => toggleWidget(widgetId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleWidget(widgetId)
                  }
                }}
              >
                <span className="dialog-map-widgets__title">
                  {isCollapsed ? <RightOutlined /> : <DownOutlined />}
                  <span>{widgetId}</span>
                </span>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDelete(index)
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </div>

              {!isCollapsed && (
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
                      optionRender={renderTargetOption}
                      onChange={(nextTarget) => {
                        unhighlightPageNode(nextTarget)
                        handleUpdate(index, { target: nextTarget })
                      }}
                      onOpenChange={(open) => {
                        if (!open) clearPageNodeHighlights()
                      }}
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
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DialogMapWidgets
