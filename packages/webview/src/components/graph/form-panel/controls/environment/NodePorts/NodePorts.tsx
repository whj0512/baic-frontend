import React, { useState } from 'react'
import { Button, Input, Select } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import './NodePorts.css'

// ProtocolTable 数据结构
interface ProtocolTable {
  procTableName: string
  procTableItems: Record<string, string>  // { procTableItem: ItemMeaning }
}

// Port 数据结构
interface Port {
  direction: string
  portName: string
  baseAttr: string
  procTables: Record<string, ProtocolTable>  // { dataName: ProtocolTable }
}

interface Props {
  value?: Port[]
  onChange?: (value: Port[]) => void
}

const NodePorts: React.FC<Props> = ({ value = [], onChange }) => {
  const [expandedPort, setExpandedPort] = useState<number | null>(null)

  const ports: Port[] = Array.isArray(value) ? value : []

  // 触发整体数据更新
  const update = (newPorts: Port[]) => {
    onChange?.([...newPorts])
  }

  // === Port 级操作 ===
  const addPort = () => {
    update([...ports, { direction: 'in', portName: '', baseAttr: '', procTables: {} }])
  }

  const removePort = (index: number) => {
    const newPorts = [...ports]
    newPorts.splice(index, 1)
    update(newPorts)
  }

  const updatePortField = (index: number, field: keyof Port, val: string) => {
    const newPorts = [...ports]
    newPorts[index] = { ...newPorts[index], [field]: val }
    update(newPorts)
  }

  // === ProcTable 级操作 ===
  const addProcTable = (portIndex: number) => {
    const newPorts = [...ports]
    const port = { ...newPorts[portIndex] }
    const tables = { ...port.procTables }
    const key = `data_${Object.keys(tables).length}`
    tables[key] = { procTableName: '', procTableItems: {} }
    port.procTables = tables
    newPorts[portIndex] = port
    update(newPorts)
  }

  const removeProcTable = (portIndex: number, dataName: string) => {
    const newPorts = [...ports]
    const port = { ...newPorts[portIndex] }
    const tables = { ...port.procTables }
    delete tables[dataName]
    port.procTables = tables
    newPorts[portIndex] = port
    update(newPorts)
  }

  const updateProcTableName = (portIndex: number, dataName: string, newName: string) => {
    const newPorts = [...ports]
    const port = { ...newPorts[portIndex] }
    const tables = { ...port.procTables }
    tables[dataName] = { ...tables[dataName], procTableName: newName }
    port.procTables = tables
    newPorts[portIndex] = port
    update(newPorts)
  }

  const updateDataName = (portIndex: number, oldKey: string, newKey: string) => {
    if (oldKey === newKey || !newKey) return
    const newPorts = [...ports]
    const port = { ...newPorts[portIndex] }
    const tables = { ...port.procTables }
    tables[newKey] = tables[oldKey]
    delete tables[oldKey]
    port.procTables = tables
    newPorts[portIndex] = port
    update(newPorts)
  }

  // === ProcTableItem 级操作 ===
  const addProcTableItem = (portIndex: number, dataName: string) => {
    const newPorts = [...ports]
    const port = { ...newPorts[portIndex] }
    const tables = { ...port.procTables }
    const table = { ...tables[dataName] }
    const items = { ...table.procTableItems }
    const itemKey = `item_${Object.keys(items).length}`
    items[itemKey] = ''
    table.procTableItems = items
    tables[dataName] = table
    port.procTables = tables
    newPorts[portIndex] = port
    update(newPorts)
  }

  const removeProcTableItem = (portIndex: number, dataName: string, itemKey: string) => {
    const newPorts = [...ports]
    const port = { ...newPorts[portIndex] }
    const tables = { ...port.procTables }
    const table = { ...tables[dataName] }
    const items = { ...table.procTableItems }
    delete items[itemKey]
    table.procTableItems = items
    tables[dataName] = table
    port.procTables = tables
    newPorts[portIndex] = port
    update(newPorts)
  }

  const updateProcTableItem = (
    portIndex: number,
    dataName: string,
    oldItemKey: string,
    newItemKey: string,
    meaning: string
  ) => {
    const newPorts = [...ports]
    const port = { ...newPorts[portIndex] }
    const tables = { ...port.procTables }
    const table = { ...tables[dataName] }
    const items = { ...table.procTableItems }

    if (oldItemKey !== newItemKey && newItemKey) {
      items[newItemKey] = meaning
      delete items[oldItemKey]
    } else {
      items[oldItemKey] = meaning
    }

    table.procTableItems = items
    tables[dataName] = table
    port.procTables = tables
    newPorts[portIndex] = port
    update(newPorts)
  }

  // === 渲染 ===
  return (
    <div className="node-ports-container">
      {ports.map((port, pIdx) => (
        <div key={pIdx} className="node-port-card">
          {/* Port 头部 */}
          <div className="node-port-header">
            <span
              className="node-port-title"
              onClick={() => setExpandedPort(expandedPort === pIdx ? null : pIdx)}
            >
              {port.portName || `端口 ${pIdx + 1}`}
              <span className={`node-port-direction ${port.direction}`}>
                {port.direction === 'in' ? '入' : port.direction === 'out' ? '出' : port.direction}
              </span>
            </span>
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => removePort(pIdx)}
            />
          </div>

          {/* Port 展开内容 */}
          {expandedPort === pIdx && (
            <div className="node-port-body">
              <div className="node-port-fields">
                <label>端口名称</label>
                <Input
                  size="small"
                  value={port.portName}
                  onChange={(e) => updatePortField(pIdx, 'portName', e.target.value)}
                  placeholder="端口名称"
                />
                <label>方向</label>
                <Select
                  size="small"
                  value={port.direction}
                  onChange={(val) => updatePortField(pIdx, 'direction', val)}
                  options={[
                    { value: 'in', label: '输入 (In)' },
                    { value: 'out', label: '输出 (Out)' },
                    { value: 'inout', label: '双向 (InOut)' },
                  ]}
                  style={{ width: '100%' }}
                />
                <label>基础属性</label>
                <Input
                  size="small"
                  value={port.baseAttr}
                  onChange={(e) => updatePortField(pIdx, 'baseAttr', e.target.value)}
                  placeholder="基础属性"
                />
              </div>

              {/* PortTables */}
              <div className="node-port-tables">
                <div className="node-port-tables-header">
                  <span className="node-port-tables-title">协议表</span>
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => addProcTable(pIdx)}
                  >
                    添加
                  </Button>
                </div>

                {Object.entries(port.procTables || {}).map(([dataName, table]) => (
                  <div key={dataName} className="node-port-table-card">
                    <div className="node-port-table-header">
                      <Input
                        size="small"
                        value={dataName}
                        addonBefore="数据名"
                        onBlur={(e) => updateDataName(pIdx, dataName, e.target.value)}
                        onPressEnter={(e) => updateDataName(pIdx, dataName, (e.target as HTMLInputElement).value)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeProcTable(pIdx, dataName)}
                      />
                    </div>
                    <div className="node-port-table-name">
                      <Input
                        size="small"
                        value={table.procTableName}
                        addonBefore="表名"
                        onChange={(e) => updateProcTableName(pIdx, dataName, e.target.value)}
                      />
                    </div>

                    {/* PortTableItems */}
                    <div className="node-port-table-items">
                      {Object.entries(table.procTableItems || {}).map(([itemKey, meaning]) => (
                        <div key={itemKey} className="node-port-table-item-row">
                          <Input
                            size="small"
                            defaultValue={itemKey}
                            placeholder="字段名"
                            onBlur={(e) =>
                              updateProcTableItem(pIdx, dataName, itemKey, e.target.value, meaning)
                            }
                            style={{ flex: 1 }}
                          />
                          <Input
                            size="small"
                            value={meaning}
                            placeholder="含义"
                            onChange={(e) =>
                              updateProcTableItem(pIdx, dataName, itemKey, itemKey, e.target.value)
                            }
                            style={{ flex: 1 }}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeProcTableItem(pIdx, dataName, itemKey)}
                          />
                        </div>
                      ))}
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => addProcTableItem(pIdx, dataName)}
                        block
                      >
                        添加字段
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        onClick={addPort}
        block
      >
        添加端口
      </Button>
    </div>
  )
}

export default NodePorts
