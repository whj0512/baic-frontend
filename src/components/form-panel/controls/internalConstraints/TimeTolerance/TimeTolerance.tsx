import React, { useState } from 'react'
import EditableSwitch from '../../common/EditableSwitch'
import './TimeTolerance.css'

interface TimeToleranceValue {
  type: 'absolute' | 'percent'
  value: number
}

interface TimeToleranceProps {
  value?: TimeToleranceValue
  onChange?: (value: TimeToleranceValue) => void
}

const TimeTolerance: React.FC<TimeToleranceProps> = ({
  value = { type: 'percent', value: 5 },
  onChange
}) => {
  const [toleranceData, setToleranceData] = useState<TimeToleranceValue>(value)

  const handleTypeChange = (type: 'absolute' | 'percent') => {
    const newData = { type, value: 0 }
    setToleranceData(newData)
    onChange?.(newData)
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0
    const newData = { ...toleranceData, value: newValue }
    setToleranceData(newData)
    onChange?.(newData)
  }

  const displayValue = toleranceData.type === 'percent'
    ? `${toleranceData.value}%`
    : `${toleranceData.value}`

  const typeLabel = toleranceData.type === 'percent' ? '百分比' : '绝对值'

  return (
    <div className="time-tolerance-control">
      <div className="time-tolerance-toolbar">
        <select
          className="time-tolerance-type-select"
          value={toleranceData.type}
          onChange={(e) => handleTypeChange(e.target.value as 'absolute' | 'percent')}
        >
          <option value="absolute">绝对值</option>
          <option value="percent">百分比</option>
        </select>
      </div>
      <EditableSwitch readonlyValue={displayValue}>
        {(onFinish) => (
          <div className="time-tolerance-input-group">
            <input
              type="number"
              className="time-tolerance-input"
              defaultValue={toleranceData.value}
              min={0}
              autoFocus
              onBlur={onFinish}
              onChange={handleValueChange}
            />
            <span className="time-tolerance-label">{typeLabel}</span>
          </div>
        )}
      </EditableSwitch>
    </div>
  )
}

export default TimeTolerance
