import { useMemo, useState } from 'react'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import NodePorts from '../graph/form-panel/controls/environment/NodePorts'
import './EntityCreatePage.css'

interface ProtocolTable {
  procTableName: string
  procTableItems: Record<string, string>
}

interface EntityPort {
  direction: string
  portName: string
  baseAttr: string
  procTables: Record<string, ProtocolTable>
}

interface CreateDevicePageProps {
  onBack: () => void
}

const parseJsonObject = (value: string) => {
  if (!value.trim()) return { value: {}, error: '' }

  try {
    const parsed = JSON.parse(value)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return { value: {}, error: '扩展属性必须是 JSON 对象' }
    }
    return { value: parsed as Record<string, unknown>, error: '' }
  } catch {
    return { value: {}, error: '扩展属性 JSON 格式不正确' }
  }
}

function CreateDevicePage({ onBack }: CreateDevicePageProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [ports, setPorts] = useState<EntityPort[]>([])
  const [propertiesText, setPropertiesText] = useState('')

  const propertiesResult = useMemo(() => parseJsonObject(propertiesText), [propertiesText])

  return (
    <div className="entity-create-page">
      <div className="entity-create-header">
        <div className="entity-create-title">
          <h2>新增设备</h2>
          <p>设备实体独立于项目存在，端口结构沿用环境图设备节点的端口配置。</p>
        </div>
        <div className="entity-create-actions">
          <button className="entity-secondary-btn" onClick={onBack}>
            <ArrowLeftOutlined />
            返回实体管理
          </button>
          <button
            className="entity-primary-btn"
            disabled
            title="后端实体接口接入后启用"
          >
            <SaveOutlined />
            保存
          </button>
        </div>
      </div>

      <div className="entity-create-form">
        <section className="entity-create-section">
          <h3 className="entity-create-section-title">基础信息</h3>
          <div className="entity-create-grid">
            <div className="entity-create-field">
              <label htmlFor="device-name">设备名称</label>
              <input
                id="device-name"
                className="entity-create-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="请输入设备名称"
              />
            </div>
            <div className="entity-create-field">
              <label htmlFor="device-type">设备类型</label>
              <input
                id="device-type"
                className="entity-create-input"
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="请输入设备类型"
              />
            </div>
          </div>
        </section>

        <section className="entity-create-section">
          <h3 className="entity-create-section-title">端口信息</h3>
          <div className="entity-create-control-panel">
            <NodePorts value={ports} onChange={setPorts} />
          </div>
        </section>

        <section className="entity-create-section">
          <h3 className="entity-create-section-title">扩展属性</h3>
          <div className="entity-create-field">
            <label htmlFor="device-properties">properties JSON</label>
            <textarea
              id="device-properties"
              className="entity-create-textarea"
              value={propertiesText}
              onChange={(event) => setPropertiesText(event.target.value)}
              placeholder='例如：{"vendor":"BAIC","version":"1.0"}'
            />
            {propertiesResult.error && (
              <span className="entity-create-error">{propertiesResult.error}</span>
            )}
          </div>
        </section>

        <section className="entity-create-section">
          <h3 className="entity-create-section-title">摘要</h3>
          <div className="entity-create-summary">
            <span className="entity-create-summary-item">名称：{name || '-'}</span>
            <span className="entity-create-summary-item">类型：{type || '-'}</span>
            <span className="entity-create-summary-item">端口：{ports.length}</span>
            <span className="entity-create-summary-item">
              扩展属性：{Object.keys(propertiesResult.value).length}
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CreateDevicePage
