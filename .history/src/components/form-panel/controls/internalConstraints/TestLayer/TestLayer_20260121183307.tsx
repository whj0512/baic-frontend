import React, { useEffect, useState } from 'react'
import TestLayerItem, { TestLayerItemData } from './components/TestLayerItem'
import './TestLayer.css'

interface TestLayerProps {
  value?: TestLayerItemData[]
  onChange?: (value: TestLayerItemData[]) => void
}

const TestLayer: React.FC<TestLayerProps> = ({ value = [], onChange }) => {
  const [items, setItems] = useState<TestLayerItemData[]>(value)
  const [newLayerItemIndex, setNewLayerItemIndex] = useState(-1)

  // 确保每个项都有 id
  useEffect(() => {
    items.forEach((item) => {
      if (!item.id) {
        item.id = `item-${Date.now()}-${Math.random()}`
      }
    })
  }, [items])

  const handleAddAssign = () => {
    const newItem: TestLayerItemData = {
      id: `item-${Date.now()}`,
      valueName: '',
      valueType: 'assign',
      positive_data: [],
      negative_data: '',
    }
    const newItems = [...items, newItem]
    setItems(newItems)
    setNewLayerItemIndex(newItems.length - 1)
    onChange?.(newItems)
  }

  const handleAddPick1D = () => {
    const newItem: TestLayerItemData = {
      id: `item-${Date.now()}`,
      table_id: '',
      valueNameX: '',
      valueNameY: '',
      valueType: 'pick1d',
      positive_data: [],
      negative_data: [],
    }
    const newItems = [...items, newItem]
    setItems(newItems)
    setNewLayerItemIndex(newItems.length - 1)
    onChange?.(newItems)
  }

  const handleAddPick2D = () => {
    const newItem: TestLayerItemData = {
      id: `item-${Date.now()}`,
      table_id: '',
      valueNameX: '',
      valueNameY: '',
      valueNameZ: '',
      valueType: 'pick2d',
      positive_data: [],
      negative_data: [],
    }
    const newItems = [...items, newItem]
    setItems(newItems)
    setNewLayerItemIndex(newItems.length - 1)
    onChange?.(newItems)
  }

  const handleAddFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const params = JSON.parse(text)
      const copyItems = params?.map((param: any) => {
        const { name, value } = param
        return {
          id: `item-${Date.now()}-${Math.random()}`,
          valueName: name,
          valueType: 'assign' as const,
          positive_data: `[${value}]`,
          negative_data: '',
        }
      })
      if (copyItems) {
        const newItems = [...items, ...copyItems]
        setItems(newItems)
        onChange?.(newItems)
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error)
    }
  }

  const handleUpdate = () => {
    const validItems = items.filter((item) => !!item.id)
    setItems(validItems)
    onChange?.(validItems)
  }

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...items]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    setItems(newItems)
    onChange?.(newItems)
  }

  return (
    <div className="test-layer-control">
      <div className="test-layer-toolbar">
        <div className="test-layer-menu">
          <button type="button" className="test-layer-menu-btn" onClick={handleAddAssign}>
            + Add assign
          </button>
          <button type="button" className="test-layer-menu-btn" onClick={handleAddPick1D}>
            + Add pick1d
          </button>
          <button type="button" className="test-layer-menu-btn" onClick={handleAddPick2D}>
            + Add pick2d
          </button>
          <button type="button" className="test-layer-menu-btn" onClick={handleAddFromClipboard}>
            + Add clipboard
          </button>
        </div>
      </div>
      <div className="test-layer-list">
        {items.map((item, index) => (
          <TestLayerItem
            key={item.id}
            index={index}
            value={item}
            editableMode={index === newLayerItemIndex}
            onUpdate={handleUpdate}
            onMove={handleMoveItem}
          />
        ))}
      </div>
    </div>
  )
}

export default TestLayer
