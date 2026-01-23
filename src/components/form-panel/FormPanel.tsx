import React, { useState, useEffect, useCallback } from 'react'
import type { FormSchema, FormControl, ControlDependency } from '../graph/strategies/types'
import type { Graph, Cell } from '@antv/x6'
import './FormPanel.css'

interface Props {
  schema: FormSchema | null
  controlMap: Map<string, React.FC<any>>
  data: Record<string, any>
  onUpdate: (fieldName: string, value: any) => void
  targetType: 'canvas' | 'edge' | 'node'
  graph?: Graph
  selectedCell?: Cell | null
}

// 检查依赖条件是否满足
const checkDependency = (dependency: ControlDependency, data: Record<string, any>): boolean => {
  const { name, condition } = dependency
  const value = data[name]

  if (typeof condition === 'function') {
    return condition(value)
  }

  return value === condition
}

// 判断控件是否应该显示
const shouldShowControl = (control: FormControl, data: Record<string, any>): boolean => {
  const { hidden = false, dependencies } = control

  // 没有依赖条件，使用默认的 hidden 值
  if (!dependencies || dependencies.length === 0) {
    return !hidden
  }

  // 检查依赖条件
  for (const dep of dependencies) {
    const conditionMet = checkDependency(dep, data)
    if (conditionMet) {
      // 条件满足时，使用依赖配置的 hidden 值（默认为 false，即显示）
      const depHidden = dep.hidden ?? false
      return !depHidden
    }
  }

  // 没有任何依赖条件满足，使用控件默认的 hidden 值
  return !hidden
}

const FormPanel: React.FC<Props> = ({ schema, controlMap, data, onUpdate, targetType, graph, selectedCell }) => {
  const [activeTab, setActiveTab] = useState(0)

  // 切换选中元素时重置 Tab
  useEffect(() => {
    setActiveTab(0)
  }, [targetType, schema])

  if (!schema?.tabs?.length) {
    return (
      <div className="form-panel">
        <div className="form-panel-empty">
          {targetType === 'canvas' ? '画布属性' : '请选择元素'}
        </div>
      </div>
    )
  }

  return (
    <div className="form-panel">
      {/* Tab 切换 */}
      <div className="form-panel-tabs">
        {schema.tabs.map((tab, index) => (
          <div
            key={tab.name}
            className={`form-panel-tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {tab.name}
          </div>
        ))}
      </div>

      {/* 表单内容 */}
      <div className="form-panel-content">
        {schema.tabs[activeTab]?.groups?.map((group, groupIndex) => {
          // 查找 title 旁边的控件（如 DeleteCoverageButton）
          const titleControl = group.controls?.find(c => c.shape === 'DeleteCoverageButton')
          const TitleControlComponent = titleControl ? controlMap.get(titleControl.shape) : null

          return (
            <div key={groupIndex} className="form-panel-group">
              {group.title && (
                <div className="form-panel-group-title">
                  <span>{group.title}</span>
                  {TitleControlComponent && titleControl && (
                    <TitleControlComponent
                      value={data[titleControl.name]}
                      onChange={(value: any) => onUpdate(titleControl.name, value)}
                      onFieldUpdate={onUpdate}
                      graph={graph}
                      currentNodeId={selectedCell?.id}
                      {...titleControl}
                    />
                  )}
                </div>
              )}
              {group.controls?.map((control) => {
                // 跳过已在 title 旁渲染的控件
                if (control.shape === 'DeleteCoverageButton') {
                  return null
                }

                // 检查是否应该显示该控件
                if (!shouldShowControl(control, data)) {
                  return null
                }

                const Control = controlMap.get(control.shape)
                if (!Control) {
                  console.warn(`Control not found: ${control.shape}`)
                  return null
                }

                return (
                  <div key={control.name} className="form-panel-item">
                    {control.label && (
                      <label className="form-panel-label">
                        {control.label}
                        {control.extra && <span className="form-panel-extra">{control.extra}</span>}
                      </label>
                    )}
                    <Control
                      value={data[control.name]}
                      onChange={(value: any) => onUpdate(control.name, value)}
                      onFieldUpdate={onUpdate}
                      graph={graph}
                      currentNodeId={selectedCell?.id}
                      {...control}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FormPanel
