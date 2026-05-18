import React from 'react'
import type { TestLayerItemData } from '../TestLayerItem'
import './Assign.css'

interface AssignProps {
  value: TestLayerItemData
  onFinish: () => void
  onUpdate: () => void
}

const Assign: React.FC<AssignProps> = ({ value, onFinish, onUpdate }) => {
  const handleChange = (field: 'valueName' | 'positive_data', e: React.ChangeEvent<HTMLInputElement>) => {
    (value as any)[field] = e.target.value
    onUpdate()
  }

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // 只有当焦点移出整个编辑器容器时才调用 onFinish
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      onFinish()
    }
  }

  return (
    <div className="assign-editor" onBlur={handleBlur}>
      <input
        type="text"
        className="assign-input"
        placeholder="变量名"
        defaultValue={value.valueName}
        autoFocus
        onChange={(e) => handleChange('valueName', e)}
      />
      <span className="assign-equals">=</span>
      <input
        type="text"
        className="assign-input"
        placeholder="值 (如: [1, 2, 3])"
        defaultValue={Array.isArray(value.positive_data) ? JSON.stringify(value.positive_data) : value.positive_data}
        onChange={(e) => handleChange('positive_data', e)}
      />
    </div>
  )
}

export default Assign
