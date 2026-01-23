import React from 'react'
import { PlusCircleOutlined } from '@ant-design/icons'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import TableEditor, { TableProps } from './components/TableEditor'
import './TruthTable.css'

interface TruthTableProps {
  value?: TableProps
  onChange?: (value: TableProps) => void
}

const defaultTruthTable: TableProps = {
  body: [
    {
      targetNode: null,
      list: [''],
    },
  ],
  header: [''],
}

const menus: MenuProps['items'] = [
  { key: 'row', label: '添加原子条件' },
  { key: 'column', label: '添加真值组合' },
]

const TruthTable: React.FC<TruthTableProps> = ({ value, onChange }) => {
  const formItemValue = value || defaultTruthTable
  const { header: firstCol, body: restCols } = formItemValue

  const handleSelect: MenuProps['onClick'] = ({ key }) => {
    if (!firstCol.length && key !== 'row') {
      // 第一个必须是新增行
      return handleSelect({ key: 'row' } as any)
    }

    switch (key) {
      case 'row':
        firstCol.push('')
        restCols.forEach(({ list: restCell }) => {
          if (restCell.length) {
            restCell.push('')
          }
        })
        break
      case 'column':
        restCols.push({
          targetNode: null,
          list: new Array(firstCol.length).fill(''),
        })
        break
      default:
        break
    }
    handleUpdateList()
  }

  const handleUpdateList = () => {
    onChange?.(formItemValue)
  }

  return (
    <div className="truth-table-container">
      <div className="truth-table-toolbar">
        <Dropdown menu={{ items: menus, onClick: handleSelect }}>
          <PlusCircleOutlined className="add-icon" />
        </Dropdown>
      </div>
      <TableEditor
        tableType="truthTable"
        defaultValue={formItemValue}
        onUpdate={handleUpdateList}
      />
    </div>
  )
}

export default TruthTable
