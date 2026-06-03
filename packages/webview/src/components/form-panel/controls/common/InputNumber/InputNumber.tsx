import React from 'react'

interface Props {
  value?: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

const InputNumber: React.FC<Props> = ({ value, onChange, min, max, step = 1, disabled }) => {
  return (
    <input
      type="number"
      className="form-control-input"
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    />
  )
}

export default InputNumber
