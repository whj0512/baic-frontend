import React, { useState } from 'react'
import { PlusCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { Dropdown, Input } from 'antd'
import type { MenuProps } from 'antd'
import './LocalVariableList.css'

export interface LocalVariable {
  id: string
  type: 'List' | 'Number' | 'String'
  name: string
  default: string | string[]
  factor?: string
}

interface Props {
  value?: LocalVariable[]
  onChange?: (value: LocalVariable[]) => void
}

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const LocalVariableList: React.FC<Props> = ({ value = [], onChange }) => {
  const [editingIndex, setEditingIndex] = useState<number>(-1)

  const handleAdd = (type: 'List' | 'Number' | 'String') => {
    const newVar: LocalVariable = {
      id: generateId(),
      type,
      name: '',
      default: type === 'List' ? [] : (type === 'Number' ? '0' : ''),
    }
    if (type === 'Number') {
      newVar.factor = '1'
    }
    const newList = [...value, newVar]
    onChange?.(newList)
    setEditingIndex(newList.length - 1)
  }

  const handleDelete = (index: number) => {
    const newList = value.filter((_, i) => i !== index)
    onChange?.(newList)
  }

  const handleUpdate = (index: number, updates: Partial<LocalVariable>) => {
    const newList = [...value]
    newList[index] = { ...newList[index], ...updates } as LocalVariable
    onChange?.(newList)
  }

  const items: MenuProps['items'] = [
    { key: 'List', label: 'List' },
    { key: 'Number', label: 'Number' },
    { key: 'String', label: 'String' },
  ]

  const onMenuClick: MenuProps['onClick'] = (e) => {
    handleAdd(e.key as 'List' | 'Number' | 'String')
  }

  return (
    <div className="local-var-control">
      <div className="local-var-toolbar">
        <Dropdown menu={{ items, onClick: onMenuClick }} trigger={['click']}>
          <PlusCircleOutlined className="local-var-add-btn" title="添加变量" />
        </Dropdown>
      </div>

      <div className="local-var-list">
        {value.map((item, index) => (
          <div key={item.id} className="local-var-item">
            <div className="local-var-header">
              <span className="local-var-type">[{item.type}]</span>
              <DeleteOutlined
                className="local-var-delete-btn"
                onClick={() => handleDelete(index)}
                title="删除"
              />
            </div>

            <div className="local-var-content">
              <div className="local-var-row">
                <span className="local-var-label">Name</span>
                <Input
                  size="small"
                  value={item.name}
                  onChange={(e) => handleUpdate(index, { name: e.target.value })}
                  placeholder="变量名"
                />
              </div>

              {item.type === 'Number' && (
                <>
                  <div className="local-var-row">
                    <span className="local-var-label">Default</span>
                    <Input
                      size="small"
                      value={item.default as string}
                      onChange={(e) => handleUpdate(index, { default: e.target.value })}
                      placeholder="默认值"
                    />
                  </div>
                  <div className="local-var-row">
                    <span className="local-var-label">Factor</span>
                    <Input
                      size="small"
                      value={item.factor as string}
                      onChange={(e) => handleUpdate(index, { factor: e.target.value })}
                      placeholder="Factor"
                    />
                  </div>
                </>
              )}

              {item.type === 'String' && (
                <div className="local-var-row">
                  <span className="local-var-label">Default</span>
                  <Input
                    size="small"
                    value={item.default as string}
                    onChange={(e) => handleUpdate(index, { default: e.target.value })}
                    placeholder="默认值"
                  />
                </div>
              )}

              {item.type === 'List' && (
                <div className="local-var-row">
                  <span className="local-var-label">Default</span>
                  <Input
                    size="small"
                    value={Array.isArray(item.default) ? item.default.join(',') : item.default}
                    onChange={(e) => {
                      // 移除 .filter(Boolean) 以保留尾部空字符，从而允许用户手动输入逗号
                      const val = e.target.value.split(',')
                      handleUpdate(index, { default: val })
                    }}
                    placeholder="以逗号分隔的值"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LocalVariableList
