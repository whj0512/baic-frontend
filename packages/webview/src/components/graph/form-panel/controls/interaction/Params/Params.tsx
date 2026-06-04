import React, { useState } from 'react'
import EditableSwitch from '../../common/EditableSwitch'
import ParamsEditor from './components/ParamsEditor'
import './Params.css'

interface ParamField {
  name: string
  type: string
}

interface ParamsProps {
  value?: ParamField[]
  onChange?: (value: ParamField[]) => void
}

const Params: React.FC<ParamsProps> = ({ value = [], onChange }) => {
  const [editingIndex, setEditingIndex] = useState(-1)

  const handleAdd = () => {
    const newParam: ParamField = {
      name: 'paramName',
      type: 'string',
    }
    const newList = [...value, newParam]
    setEditingIndex(newList.length - 1)
    onChange?.(newList)
  }

  const handleUpdate = (newValue: ParamField, index: number) => {
    const newList = [...value]
    newList[index] = newValue
    onChange?.(newList)
  }

  const handleDelete = (index: number) => {
    const newList = value.filter((_, i) => i !== index)
    onChange?.(newList)
  }

  return (
    <div className="interaction-params-control">
      <div className="interaction-params-toolbar">
        <button type="button" className="interaction-params-add-btn" onClick={handleAdd}>
          + 添加参数
        </button>
      </div>
      <div className="interaction-params-list">
        {value.map((param, index) => (
          <div key={index} className="interaction-params-item">
            <EditableSwitch
              editMode={editingIndex === index}
              readonlyValue={`${param.name}: ${param.type}`}
              onChange={(editable: boolean) => {
                if (editable) {
                  setEditingIndex(index)
                } else {
                  setEditingIndex(-1)
                }
              }}
            >
              {(onFinish: () => void) => (
                <ParamsEditor
                  value={param}
                  onFinish={onFinish}
                  onUpdate={(newParam) => handleUpdate(newParam, index)}
                />
              )}
            </EditableSwitch>
            <button
              type="button"
              className="interaction-params-delete-btn"
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

export default Params
