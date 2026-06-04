import React from 'react'
import type { TestLayerItemData } from '.'
import './Pickup2D.css'

interface Pickup2DProps {
  value: TestLayerItemData
  onFinish: () => void
  onUpdate: () => void
}

const Pickup2D: React.FC<Pickup2DProps> = ({ value, onFinish, onUpdate }) => {
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
    <div className="pickup2d-editor" onBlur={handleBlur}>
      <input
        type="text"
        className="pickup2d-input"
        placeholder="Table ID"
        defaultValue={value.table_id}
        autoFocus
        onChange={(e) => handleChange('table_id', e)}
      />
      <input
        type="text"
        className="pickup2d-input"
        placeholder="X 轴变量名"
        defaultValue={value.valueNameX}
        onChange={(e) => handleChange('valueNameX', e)}
      />
      <input
        type="text"
        className="pickup2d-input"
        placeholder="Y 轴变量名"
        defaultValue={value.valueNameY}
        onChange={(e) => handleChange('valueNameY', e)}
      />
      <input
        type="text"
        className="pickup2d-input"
        placeholder="Z 轴变量名"
        defaultValue={value.valueNameZ}
        onChange={(e) => handleChange('valueNameZ', e)}
      />
    </div>
  )
}

export default Pickup2D
