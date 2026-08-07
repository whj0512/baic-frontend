import { Button, Input } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import './DialogMapDataCarried.css'

interface DialogMapDataCarriedProps {
  value?: string[]
  onChange?: (value: string[]) => void
}

const DialogMapDataCarried = ({ value, onChange }: DialogMapDataCarriedProps) => {
  const items = Array.isArray(value) ? value : []

  return (
    <div className="dialog-map-data-carried">
      {items.map((item, index) => (
        <div key={index} className="dialog-map-data-carried__row">
          <Input
            size="small"
            value={item}
            placeholder="数据项"
            onChange={(event) => {
              const next = [...items]
              next[index] = event.target.value
              onChange?.(next)
            }}
          />
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onChange?.(items.filter((_, itemIndex) => itemIndex !== index))}
          />
        </div>
      ))}
      <Button
        size="small"
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => onChange?.([...items, ''])}
      >
        添加数据项
      </Button>
    </div>
  )
}

export default DialogMapDataCarried
