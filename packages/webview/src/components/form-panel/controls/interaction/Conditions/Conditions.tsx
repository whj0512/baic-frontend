import React from 'react'
import { Input } from 'antd'
import './Conditions.css'

interface Props {
  value?: string[]
  onChange?: (value: string[]) => void
}

const Conditions: React.FC<Props> = ({ value = [], onChange }) => {
  const conditions: string[] = Array.isArray(value) ? value : []

  const update = (next: string[]) => {
    onChange?.([...next])
  }

  const handleAdd = () => {
    update([...conditions, ''])
  }

  const handleUpdate = (index: number, text: string) => {
    const next = [...conditions]
    next[index] = text
    update(next)
  }

  const handleDelete = (index: number) => {
    const next = conditions.filter((_, i) => i !== index)
    update(next)
  }

  return (
    <div className="conditions-control">
      <div className="conditions-toolbar">
        <button type="button" className="conditions-add-btn" onClick={handleAdd}>
          + 添加条件
        </button>
      </div>

      {conditions.length === 0 && (
        <div className="conditions-empty">暂无条件，点击上方按钮添加</div>
      )}

      <div className="conditions-list">
        {conditions.map((cond, index) => (
          <div key={index} className="conditions-item">
            <span className="conditions-item-index">{index + 1}</span>
            <Input
              className="conditions-item-input"
              size="small"
              value={cond}
              placeholder={`条件表达式 ${index + 1}`}
              onChange={(e) => handleUpdate(index, e.target.value)}
            />
            <button
              type="button"
              className="conditions-delete-btn"
              onClick={() => handleDelete(index)}
              title="删除"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Conditions
