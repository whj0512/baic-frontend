import { useMemo, useState } from 'react'
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import ControllerTimer from '../graph/form-panel/controls/environment/ControllerTimer'
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

interface ControllerTimerValue {
  timerName?: string
  intervalNum?: number
  addrNum?: string
}

interface CreateControlUnitPageProps {
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

function CreateControlUnitPage({ onBack }: CreateControlUnitPageProps) {
  const [name, setName] = useState('')
  const [model, setModel] = useState('')
  const [period, setPeriod] = useState('')
  const [ports, setPorts] = useState<EntityPort[]>([])
  const [timers, setTimers] = useState<ControllerTimerValue[]>([])
  const [propertiesText, setPropertiesText] = useState('')

  const propertiesResult = useMemo(() => parseJsonObject(propertiesText), [propertiesText])

  const updateTimer = (index: number, nextTimer: ControllerTimerValue) => {
    setTimers((prev) => prev.map((timer, timerIndex) => (
      timerIndex === index ? nextTimer : timer
    )))
  }

  const removeTimer = (index: number) => {
    setTimers((prev) => prev.filter((_, timerIndex) => timerIndex !== index))
  }

  return (
    <div className="entity-create-page">
      <div className="entity-create-header">
        <div className="entity-create-title">
          <h2>新增控制单元</h2>
          <p>控制单元独立于项目存在，端口、计时器和周期沿用环境图控制单元节点的配置含义。</p>
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
              <label htmlFor="control-unit-name">控制单元名称</label>
              <input
                id="control-unit-name"
                className="entity-create-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="请输入控制单元名称"
              />
            </div>
            <div className="entity-create-field">
              <label htmlFor="control-unit-model">型号</label>
              <input
                id="control-unit-model"
                className="entity-create-input"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="请输入控制单元型号"
              />
            </div>
            <div className="entity-create-field">
              <label htmlFor="control-unit-period">控制周期</label>
              <input
                id="control-unit-period"
                className="entity-create-input"
                type="number"
                min="0"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="请输入控制周期"
              />
            </div>
          </div>
        </section>

        <section className="entity-create-section">
          <h3 className="entity-create-section-title">计时器</h3>
          <div className="entity-create-timer-list">
            {timers.length > 0 ? (
              timers.map((timer, index) => (
                <div key={index} className="entity-create-timer-card">
                  <div className="entity-create-timer-header">
                    <span>{timer.timerName || `计时器 ${index + 1}`}</span>
                    <button
                      className="entity-secondary-btn"
                      onClick={() => removeTimer(index)}
                    >
                      <DeleteOutlined />
                      删除
                    </button>
                  </div>
                  <ControllerTimer
                    value={timer}
                    onChange={(nextTimer) => updateTimer(index, nextTimer)}
                  />
                </div>
              ))
            ) : (
              <div className="entity-create-empty">暂无计时器</div>
            )}
            <button
              className="entity-secondary-btn"
              onClick={() => setTimers((prev) => [...prev, {}])}
            >
              <PlusOutlined />
              添加计时器
            </button>
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
            <label htmlFor="control-unit-properties">properties JSON</label>
            <textarea
              id="control-unit-properties"
              className="entity-create-textarea"
              value={propertiesText}
              onChange={(event) => setPropertiesText(event.target.value)}
              placeholder='例如：{"safetyLevel":"ASIL-B","owner":"EE"}'
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
            <span className="entity-create-summary-item">型号：{model || '-'}</span>
            <span className="entity-create-summary-item">周期：{period || '-'}</span>
            <span className="entity-create-summary-item">端口：{ports.length}</span>
            <span className="entity-create-summary-item">计时器：{timers.length}</span>
            <span className="entity-create-summary-item">
              扩展属性：{Object.keys(propertiesResult.value).length}
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CreateControlUnitPage
