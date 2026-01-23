import React from 'react'
import { Select } from 'antd'
import EditableSwitch from '../../../../EditableSwitch'
import './PathCoverage.css'

const { Option } = Select

interface PathCoverageProps {
  value?: string
  onChange?: (value: string) => void
}

const PathCoverage: React.FC<PathCoverageProps> = ({
  value = 'All',
  onChange,
}) => {
  const handleSelect = (selectedValue: string) => {
    onChange?.(selectedValue)
  }

  return (
    <EditableSwitch readonlyValue={value || '未设置'}>
      {(onFinish) => (
        <Select
          style={{ width: '100%' }}
          value={value}
          onBlur={onFinish}
          onSelect={handleSelect}
        >
          <Option value="All">All</Option>
          <Option value="1-path">1-path</Option>
        </Select>
      )}
    </EditableSwitch>
  )
}

export default PathCoverage
