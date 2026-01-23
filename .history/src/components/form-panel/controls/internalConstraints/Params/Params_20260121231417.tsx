import React, { useState } from 'react'
import EditableSwitch from '../../common/EditableSwitch'
import ParamsEditor from './components/ParamsEditor'
import './Params.css'

interface ParamField {
  label: string
  value: string
}

interface ParamsProps {
  value?: ParamField[]
  onChange?: (value: ParamField[]) => void
}

const Params: React.FC<ParamsProps> = ({ value = [], onChange }) => {
  const [editingIndex, setEditingIndex] = useState(-1)
  const [paramsList, setParamsList] = useState<ParamField[]>(value)

  const handleAdd = () => {
    const newParam: ParamField = {
      label: 'default_var',
      value: '0',
    }
    const newList = [...paramsList, newParam]
    setParamsList(newList)
    setEditingIndex(newList.length - 1)
    onChange?.(newList)
  }

  const handleUpdate = () => {
    onChange?.(paramsList)
  }

  const handleDelete = (index: number) => {
    const newList = paramsList.filter((_, i) => i !== index)
    setParamsList(newList)
    onChange?.(newList)
  }

  return (
    <div className="params-control">
      <div className="params-toolbar">
        <button type="button" className="params-add-btn" onClick={handleAdd}>
          + 添加参数
        </button>
      </div>
      <div className="params-list">
        {paramsList.map((param, index) => (
          <div key={index} className="params-item">
            <EditableSwitch
              editMode={editingIndex === index}
              readonlyValue={`${param.label}=${param.value}`}
              onChange={(editable) => {
                if (editable) {
                  setEditingIndex(index)
                } else {
                  setEditingIndex(-1)
                }
              }}
            >
              {(onFinish) => (
                <ParamsEditor
                  value={param}
                  onFinish={onFinish}
                  onUpdate={handleUpdate}
                />
              )}
            </EditableSwitch>
            <button
              type="button"
              className="params-delete-btn"
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
