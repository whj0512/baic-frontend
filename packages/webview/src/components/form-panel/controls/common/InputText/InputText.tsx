import React from 'react'

interface Props {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

const InputText: React.FC<Props> = ({ value = '', onChange, placeholder, disabled }) => {
  return (
    <input
      type="text"
      className="form-control-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}

export default InputText
