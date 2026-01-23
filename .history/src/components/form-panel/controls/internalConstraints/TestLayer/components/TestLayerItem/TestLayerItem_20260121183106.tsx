import React from 'react'
import Assign from './Assign'
import Pickup1D from './Pickup1D'
import Pickup2D from './Pickup2D'
import './TestLayerItem.css'
import EditableSwitch from '../../../../common/EditableSwitch'

export type ValueType = 'assign' | 'pick1d' | 'pick2d'

export interface TestLayerItemData {
  id: string
  valueName?: string
  valueNameX?: string
  valueNameY?: string
  valueNameZ?: string
  table_id?: string
  valueType: ValueType
  positive_data: any
  negative_data?: any
  ref_graph?: any[]
}

interface TestLayerItemProps {
  index: number
  value: TestLayerItemData
  editableMode: boolean
  onUpdate: () => void
  onMove: (fromIndex: number, toIndex: number) => void
}

const TestLayerItem: React.FC<TestLayerItemProps> = ({
  index,
  value,
  editableMode,
  onUpdate,
  onMove,
}) => {
  const { valueType } = value
  const readonlyValue = getReadonlyText(value)

  const handleRemove = (e: React.MouseEvent) => {
    delete (value as any)['id']
    onUpdate()
    e.stopPropagation()
  }

  return (
    <div className="test-layer-item">
      <span className="test-layer-item-drag">::</span>
      <EditableSwitch
        editMode={editableMode}
        readonlyValue={readonlyValue}
        className="test-layer-item-content"
      >
        {(onFinish) => (
          <>
            {valueType === 'assign' && (
              <Assign value={value} onFinish={onFinish} onUpdate={onUpdate} />
            )}
            {valueType === 'pick1d' && (
              <Pickup1D value={value} onFinish={onFinish} onUpdate={onUpdate} />
            )}
            {valueType === 'pick2d' && (
              <Pickup2D value={value} onFinish={onFinish} onUpdate={onUpdate} />
            )}
          </>
        )}
      </EditableSwit>
      <button
        type="button"
        className="test-layer-item-delete"
        onClick={handleRemove}
        title="删除"
      >
        ×
      </button>
    </div>
  )
}

export default TestLayerItem

// 格式化只读显示文本
export const getReadonlyText = (value: TestLayerItemData): string => {
  const {
    valueType,
    valueName,
    valueNameX,
    valueNameY,
    positive_data,
    ref_graph,
  } = value

  let valueText = ''
  const graphNames =
    ref_graph && ref_graph.length > 0
      ? ref_graph.map((graph) => graph.graph_name).join(', ')
      : ''

  function normalizePositiveData(data: any): string[] {
    if (!data) return []

    if (Array.isArray(data)) {
      if (data.length === 1 && Array.isArray(data[0])) {
        return data[0].map(String)
      } else {
        return data.map(String)
      }
    }

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed)) {
          return parsed.map(String)
        }
      } catch (e) {
        return data
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      }
    }

    return [String(data)]
  }

  const flatPositiveData = normalizePositiveData(positive_data)
  const formattedValue = `[${flatPositiveData.join(', ')}]`

  switch (valueType) {
    case 'assign':
      valueText = graphNames
        ? `${valueName} = ${formattedValue}(${graphNames})`
        : `${valueName} = ${formattedValue}`
      break
    case 'pick1d':
      valueText = `${valueNameX}`
      break
    case 'pick2d':
      valueText = `(${valueNameX}, ${valueNameY})`
      break
    default:
      break
  }
  return valueText
}
