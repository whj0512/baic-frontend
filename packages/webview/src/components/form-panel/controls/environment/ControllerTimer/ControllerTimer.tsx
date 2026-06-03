import React from 'react'
import './ControllerTimer.css'
import { Input } from 'antd'

interface ControllerTimerValue {
  timerName?: string
  intervalNum?: number
  addrNum?: string
}

interface Props {
  value?: ControllerTimerValue
  onChange: (value: ControllerTimerValue) => void
  disabled?: boolean
}

const ControllerTimer: React.FC<Props> = ({ value = {}, onChange, disabled }) => {
  const handleChange = (field: keyof ControllerTimerValue, val: any) => {
    onChange({
      ...value,
      [field]: val
    })
  }

  return (
    <div className="controller-timer-control">
      <div className="controller-timer-item">
        <label>计时器名称</label>
        <Input
          className="form-control-input"
          value={value.timerName || ''}
          onChange={(e) => handleChange('timerName', e.target.value)}
          disabled={disabled}
          placeholder="请输入计时器名称"
        />
      </div>
      <div className="controller-timer-item">
        <label>计时器间隔</label>
        <Input
          type="number"
          className="form-control-input"
          value={value.intervalNum ?? ''}
          onChange={(e) => handleChange('intervalNum', e.target.value ? Number(e.target.value) : undefined)}
          disabled={disabled}
          placeholder="请输入间隔时间"
        />
      </div>
      <div className="controller-timer-item">
        <label>寄存器地址</label>
        <Input
          className="form-control-input"
          value={value.addrNum || ''}
          onChange={(e) => handleChange('addrNum', e.target.value)}
          disabled={disabled}
          placeholder="请输入寄存器地址"
        />
      </div>
    </div>
  )
}

export default ControllerTimer
