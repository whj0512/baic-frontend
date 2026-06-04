import React, { useState } from 'react'
import { TreeSelect } from 'antd'
import './RefGraphs.css'
import EditableSwitch from '../../common/EditableSwitch'

interface RefGraphsValue {
  id: string
  name: string
}

interface RefGraphsProps {
  value?: RefGraphsValue
  onChange?: (value: RefGraphsValue) => void
}

// 模拟的图树形数据（实际项目中应从后端获取）
const mockGraphTree = [
  {
    value: 'folder1',
    title: '文件夹1',
    fileType: 2, // 2 表示文件夹
    children: [
      {
        value: 'graph1',
        title: '图1',
        fileType: 1, // 1 表示文件
        id: 'graph-001',
      },
      {
        value: 'graph2',
        title: '图2',
        fileType: 1,
        id: 'graph-002',
      },
    ],
  },
  {
    value: 'folder2',
    title: '文件夹2',
    fileType: 2,
    children: [
      {
        value: 'graph3',
        title: '图3',
        fileType: 1,
        id: 'graph-003',
      },
    ],
  },
]

const RefGraphs: React.FC<RefGraphsProps> = ({
  value = { id: '', name: '' },
  onChange,
}) => {
  const [graphTree] = useState(mockGraphTree)

  const handleSelect = (_selectedValue: string, option: any) => {
    // 跳过文件夹
    if (option.fileType === 2) {
      return
    }

    onChange?.({
      id: option.id || option.value,
      name: option.title,
    })
  }

  const handleChange = (selectedValue: string) => {
    if (!selectedValue) {
      onChange?.({ id: '', name: '' })
    }
  }

  return (
    <EditableSwitch readonlyValue={value.name || '未选择'}>
      {(onFinish) => (
        <TreeSelect
          showSearch
          style={{ width: '100%' }}
          value={value.name || undefined}
          dropdownStyle={{ maxHeight: 400, overflow: 'auto', minWidth: 200 }}
          placeholder="请选择引用图"
          allowClear
          popupMatchSelectWidth={false}
          treeDefaultExpandAll
          onBlur={onFinish}
          onSelect={handleSelect}
          onChange={handleChange}
          treeData={graphTree}
          treeNodeFilterProp="title"
        />
      )}
    </EditableSwitch>
  )
}

export default RefGraphs
