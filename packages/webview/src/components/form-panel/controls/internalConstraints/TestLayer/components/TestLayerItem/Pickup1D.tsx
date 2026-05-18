import React from 'react'
import type { TestLayerItemData } from '../TestLayerItem'
import './Pickup1D.css'

interface Pickup1DProps {
  value: TestLayerItemData
  onFinish: () => void
  onUpdate: () => void
}

const Pickup1D: React.FC<Pickup1DProps> = ({ value, onFinish, onUpdate }) => {
  const handleChange = (field: keyof TestLayerItemData, e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="pickup1d-editor" onBlur={handleBlur}>
      <input
        type="text"
        className="pickup1d-input"
        placeholder="Table ID"
        defaultValue={value.table_id}
        autoFocus
        onChange={(e) => handleChange('table_id', e)}
      />
      <input
        type="text"
        className="pickup1d-input"
        placeholder="X 轴变量名"
        defaultValue={value.valueNameX}
        onChange={(e) => handleChange('valueNameX', e)}
      />
      <input
        type="text"
        className="pickup1d-input"
        placeholder="Y 轴变量名"
        defaultValue={value.valueNameY}
        onChange={(e) => handleChange('valueNameY', e)}
      />
    </div>
  )
}

export default Pickup1D
