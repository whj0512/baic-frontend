import { useMemo, useState } from 'react'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import CreateControlUnitPage from '../components/EntityManagement/CreateControlUnitPage'
import CreateDevicePage from '../components/EntityManagement/CreateDevicePage'
import './EntityManagement.css'

type EntityTab = 'device' | 'controlUnit'
type EntityManagementView = 'list' | 'createDevice' | 'createControlUnit'

interface EntityPort {
  portName?: string
}

interface EntityTimer {
  timerName?: string
}

interface DeviceEntity {
  id: string
  name: string
  type?: string
  ports?: EntityPort[]
  created_by?: string
  created_at: string
  updated_at: string
  properties?: Record<string, unknown>
}

interface ControlUnitEntity {
  id: string
  name: string
  model?: string
  period?: number
  ports?: EntityPort[]
  timers?: EntityTimer[]
  created_by?: string
  created_at: string
  updated_at: string
  properties?: Record<string, unknown>
}

interface EntityManagementProps {
  onBack: () => void
}

const deviceEntities: DeviceEntity[] = []
const controlUnitEntities: ControlUnitEntity[] = []

const entityTabs: Array<{ key: EntityTab; label: string }> = [
  { key: 'device', label: '设备实体' },
  { key: 'controlUnit', label: '控制单元' },
]

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const getCountLabel = (value: unknown[] | undefined) => {
  return Array.isArray(value) ? String(value.length) : '0'
}

const getPropertiesLabel = (properties?: Record<string, unknown>) => {
  return properties && Object.keys(properties).length > 0 ? '已配置' : '未配置'
}

function EntityManagement({ onBack }: EntityManagementProps) {
  const [activeTab, setActiveTab] = useState<EntityTab>('device')
  const [view, setView] = useState<EntityManagementView>('list')
  const [searchQuery, setSearchQuery] = useState('')

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const filteredDevices = useMemo(() => {
    if (!normalizedSearchQuery) return deviceEntities

    return deviceEntities.filter((entity) =>
      [
        entity.name,
        entity.type,
        getPropertiesLabel(entity.properties),
      ].some((value) => (value || '').toLowerCase().includes(normalizedSearchQuery))
    )
  }, [normalizedSearchQuery])

  const filteredControlUnits = useMemo(() => {
    if (!normalizedSearchQuery) return controlUnitEntities

    return controlUnitEntities.filter((entity) =>
      [
        entity.name,
        entity.model,
        entity.period?.toString(),
        getPropertiesLabel(entity.properties),
      ].some((value) => (value || '').toLowerCase().includes(normalizedSearchQuery))
    )
  }, [normalizedSearchQuery])

  const isDeviceTab = activeTab === 'device'
  const emptyMessage = normalizedSearchQuery
    ? '没有找到匹配的全局实体'
    : isDeviceTab
      ? '暂无全局设备实体'
      : '暂无全局控制单元'

  if (view === 'createDevice') {
    return <CreateDevicePage onBack={() => setView('list')} />
  }

  if (view === 'createControlUnit') {
    return <CreateControlUnitPage onBack={() => setView('list')} />
  }

  return (
    <div className="entity-management-wrapper">
      <div className="entity-management-header">
        <div>
          <h2>实体管理</h2>
          <p>管理独立于项目存在的全局设备实体与控制单元。</p>
        </div>
        <div className="entity-management-actions">
          <button className="entity-secondary-btn" onClick={onBack}>
            <ArrowLeftOutlined />
            返回首页
          </button>
          <button
            className="entity-primary-btn"
            onClick={() => setView(isDeviceTab ? 'createDevice' : 'createControlUnit')}
          >
            <PlusOutlined />
            {isDeviceTab ? '新增设备' : '新增控制单元'}
          </button>
        </div>
      </div>

      <div className="entity-toolbar">
        <div className="entity-tabs" role="tablist" aria-label="实体类型">
          {entityTabs.map((tab) => (
            <button
              key={tab.key}
              className={`entity-tab ${activeTab === tab.key ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          className="entity-search-input"
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={isDeviceTab ? '搜索设备实体名称、类型或扩展属性...' : '搜索控制单元名称、型号、周期或扩展属性...'}
        />
      </div>

      <div className="entity-list-container">
        <table className="entity-table">
          <thead>
            {isDeviceTab ? (
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>端口数量</th>
                <th>扩展属性</th>
                <th>创建时间</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            ) : (
              <tr>
                <th>名称</th>
                <th>型号</th>
                <th>周期</th>
                <th>端口数量</th>
                <th>计时器数量</th>
                <th>扩展属性</th>
                <th>创建时间</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            )}
          </thead>
          <tbody>
            {isDeviceTab ? (
              filteredDevices.length > 0 ? (
                filteredDevices.map((entity) => (
                  <tr key={entity.id}>
                    <td className="entity-name">{entity.name}</td>
                    <td>{entity.type || '-'}</td>
                    <td>{getCountLabel(entity.ports)}</td>
                    <td>{getPropertiesLabel(entity.properties)}</td>
                    <td>{formatDate(entity.created_at)}</td>
                    <td>{formatDate(entity.updated_at)}</td>
                    <td className="entity-action-placeholder">待接入</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="entity-empty-state">
                    {emptyMessage}
                  </td>
                </tr>
              )
            ) : (
              filteredControlUnits.length > 0 ? (
                filteredControlUnits.map((entity) => (
                  <tr key={entity.id}>
                    <td className="entity-name">{entity.name}</td>
                    <td>{entity.model || '-'}</td>
                    <td>{entity.period ?? '-'}</td>
                    <td>{getCountLabel(entity.ports)}</td>
                    <td>{getCountLabel(entity.timers)}</td>
                    <td>{getPropertiesLabel(entity.properties)}</td>
                    <td>{formatDate(entity.created_at)}</td>
                    <td>{formatDate(entity.updated_at)}</td>
                    <td className="entity-action-placeholder">待接入</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="entity-empty-state">
                    {emptyMessage}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EntityManagement
