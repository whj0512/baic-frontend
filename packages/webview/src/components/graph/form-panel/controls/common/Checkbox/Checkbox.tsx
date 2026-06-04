import React from 'react'

interface Props {
  value?: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

const Checkbox: React.FC<Props> = ({ value = false, onChange, disabled }) => {
  return (
    <input
      type="checkbox"
      className="form-control-checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
  )
}

export default Checkbox
