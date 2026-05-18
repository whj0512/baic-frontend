import React from 'react'
import { PlusCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import './VariableActionList.css'

interface Props {
  value?: string[][]
  onChange?: (value: string[][]) => void
}

const VariableActionList: React.FC<Props> = ({ value = [], onChange }) => {
  const handleAdd = () => {
    const newList = [...value, ['']]
    onChange?.(newList)
  }

  const handleDelete = (index: number) => {
    const newList = value.filter((_, i) => i !== index)
    onChange?.(newList)
  }

  const handleUpdate = (index: number, val: string) => {
    const newList = [...value]
    // 利用换行符区分同一个组内的多个字符串
    const lines = val.split('\n')
    newList[index] = lines
    onChange?.(newList)
  }

  return (
    <div className="var-action-control">
      <div className="var-action-toolbar">
        <PlusCircleOutlined className="var-action-add-btn" title="添加动作组" onClick={handleAdd} />
      </div>

      <div className="var-action-list">
        {Array.isArray(value) && value.map((item, index) => (
          <div key={index} className="var-action-item">
            <div className="var-action-header">
              <span className="var-action-title">Action {index + 1}</span>
              <DeleteOutlined
                className="var-action-delete-btn"
                onClick={() => handleDelete(index)}
                title="删除"
              />
            </div>
            
            <div className="var-action-content">
              <Input.TextArea
                size="small"
                autoSize={{ minRows: 1, maxRows: 4 }}
                value={Array.isArray(item) ? item.join('\n') : item}
                onChange={(e) => handleUpdate(index, e.target.value)}
                placeholder="动作内容（多行表示数组内多个元素）"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default VariableActionList
