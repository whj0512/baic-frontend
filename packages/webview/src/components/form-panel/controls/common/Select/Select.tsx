import React from 'react'

interface Option {
  label: string
  value: string | number
}

interface Props {
  value?: string | number
  onChange: (value: string | number) => void
  options?: Option[]
  placeholder?: string
  disabled?: boolean
}

const Select: React.FC<Props> = ({ value = '', onChange, options = [], placeholder, disabled }) => {
  return (
    <select
      className="form-control-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export default Select
