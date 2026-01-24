import React, { useState } from 'react'
import { PlusCircleOutlined, CloseOutlined } from '@ant-design/icons'
import { Dropdown, InputNumber } from 'antd'
import type { MenuProps } from 'antd'
import EditableSwitch from '../../common/EditableSwitch'
import './TestTimeProps.css'

enum TestTimeType {
  wait = 'wait',
  sustain = 'sustain',
  checkpoint = 'checkpoint',
}

interface TestTimeValue {
  type: TestTimeType
  value: number
  unit: 'sec'
}

interface TestTimePropsProps {
  value?: TestTimeValue
  onChange?: (value: TestTimeValue | undefined) => void
}

const UNIT_TEXT = '秒'

const testTimeTypeOptions: MenuProps['items'] = [
  { key: 'wait', label: 'wait' },
  { key: 'sustain', label: 'sustain' },
  { key: 'checkpoint', label: 'checkpoint' },
]

const TestTimeProps: React.FC<TestTimePropsProps> = ({ value, onChange }) => {
  const [editable, setEditable] = useState(false)

  const handleSelect: MenuProps['onClick'] = ({ key }) => {
    const defaultItem: TestTimeValue = {
      type: key as TestTimeType,
      value: 5,
      unit: 'sec',
    }
    setEditable(true)
    onChange?.(defaultItem)
  }

  const handleInputChange = (newValue: number | null) => {
    if (value && newValue !== null) {
      onChange?.({
        ...value,
        value: newValue,
      })
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(undefined)
  }

  const handleChangeEditableMode = (mode: boolean) => {
    setEditable(mode)
  }

  return (
    <div className="test-time-props">
      <div className="test-time-props-toolbar">
        <Dropdown menu={{ items: testTimeTypeOptions, onClick: handleSelect }}>
          <PlusCircleOutlined className="add-icon" />
        </Dropdown>
      </div>
      {value?.type && (
        <div className="test-time-props-content">
          <EditableSwitch
            readonlyValue={`${value.type}: ${value.value} ${UNIT_TEXT}`}
            editMode={editable}
            onChange={handleChangeEditableMode}
          >
            {(onFinish) => (
              <div className="test-time-props-editor">
                <InputNumber
                  autoFocus
                  addonBefore={value.type}
                  defaultValue={value.value}
                  addonAfter={UNIT_TEXT}
                  onBlur={onFinish}
                  onChange={handleInputChange}
                  onPressEnter={onFinish}
                  style={{ width: '100%' }}
                />
                <CloseOutlined className="remove-icon" onClick={handleRemove} />
              </div>
            )}
          </EditableSwitch>
        </div>
      )}
    </div>
  )
}

export default TestTimeProps
