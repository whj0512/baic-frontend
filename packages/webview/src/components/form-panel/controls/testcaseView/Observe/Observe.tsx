import { CloseOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { AutoComplete } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import { type FC, useEffect, useMemo, useState } from 'react'
import EditableSwitch from '../../common/EditableSwitch'
import { getDatabaseDataForCase } from '../getDatabaseDataForCase'
import './Observe.css'

interface ObserveProps {
  value?: string[]
  onChange?: (value: string[]) => void
}

const normalizeObserveList = (value: unknown) => {
  return Array.isArray(value) ? value.map((item) => `${item ?? ''}`) : []
}

const Observe: FC<ObserveProps> = ({ value, onChange }) => {
  const normalizedValue = useMemo(() => normalizeObserveList(value), [value])
  const allOptions = useMemo<DefaultOptionType[]>(() => {
    return getDatabaseDataForCase().types.map((item) => ({
      label: item.name,
      value: item.name,
    }))
  }, [])

  const [items, setItems] = useState<string[]>(normalizedValue)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [nameOptions, setNameOptions] = useState<DefaultOptionType[]>(allOptions)

  useEffect(() => {
    setItems(normalizedValue)
    setEditingIndex((currentIndex) =>
      currentIndex !== null && currentIndex < normalizedValue.length ? currentIndex : null
    )
  }, [normalizedValue])

  const commit = (nextItems: string[]) => {
    setItems(nextItems)
    onChange?.(nextItems)
  }

  const handleAdd = () => {
    const nextItems = [...items, '']
    commit(nextItems)
    setNameOptions(allOptions)
    setEditingIndex(nextItems.length - 1)
  }

  const handleChange = (index: number, text: string) => {
    const nextItems = [...items]
    nextItems[index] = text
    commit(nextItems)
  }

  const handleSearch = (index: number, text: string) => {
    setNameOptions(
      allOptions.filter((item) => `${item.label ?? ''}`.includes(text))
    )
    handleChange(index, text)
  }

  const handleRemove = (index: number) => {
    commit(items.filter((_, itemIndex) => itemIndex !== index))
    setEditingIndex((currentIndex) => {
      if (currentIndex === null) return null
      if (currentIndex === index) return null
      return currentIndex > index ? currentIndex - 1 : currentIndex
    })
  }

  const handleEditChange = (index: number, editable: boolean) => {
    if (editable) {
      setNameOptions(allOptions)
      setEditingIndex(index)
      return
    }

    setEditingIndex(null)
  }

  return (
    <div className="testcase-observe-control">
      <div className="testcase-observe-toolbar">
        <PlusCircleOutlined className="testcase-observe-add" onClick={handleAdd} />
      </div>
      <div className="testcase-observe-list">
        {items.map((item, index) => (
          <div key={index} className="testcase-observe-item">
            <EditableSwitch
              className="testcase-observe-switch"
              editMode={editingIndex === index}
              readonlyValue={item}
              onChange={(editable) => handleEditChange(index, editable)}
            >
              {(onFinish) => (
                <AutoComplete
                  autoFocus
                  allowClear
                  options={nameOptions}
                  value={item}
                  placeholder="Signal"
                  onBlur={onFinish}
                  onSelect={(text) => handleChange(index, text)}
                  onSearch={(text) => handleSearch(index, text)}
                />
              )}
            </EditableSwitch>
            <CloseOutlined
              className="testcase-observe-remove"
              onClick={() => handleRemove(index)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Observe
