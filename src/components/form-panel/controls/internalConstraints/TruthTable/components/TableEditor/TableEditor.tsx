import React, { Fragment } from 'react'
import type { Graph } from '@antv/x6'
import { Cell } from '../Cell'
import './TableEditor.css'

export interface TableProps {
  body: Array<{
    targetNode: string | null
    list: string[]
  }>
  header: string[]
}

interface TableEditorProps {
  onUpdate: () => void
  defaultValue: TableProps
  tableType?: string
  graph?: Graph
  currentNodeId?: string
}

const contextMenuItems = [
  { key: 'row', label: '删除该行' },
  { key: 'col', label: '删除该列' },
]

const TableEditor: React.FC<TableEditorProps> = ({
  onUpdate,
  defaultValue,
  tableType = 'truthTable',
  graph,
  currentNodeId,
}) => {
  const { header, body } = defaultValue

  const handleUpdateHeader = (rowNumber: number, value: string) => {
    header[rowNumber] = value
    onUpdate()
  }

  const handleUpdateBody = (rowNumber: number, colNumber: number, value: string) => {
    body[colNumber].list[rowNumber] = value
    onUpdate()
  }

  const handleUpdateFooter = (colNumber: number, value: string) => {
    body[colNumber].targetNode = value
    onUpdate()
  }

  const handleClickContextMenu = (rowNumber: number, colNumber: number, args: any) => {
    const { key } = args
    if (key === 'row') {
      if (tableType === 'atomicTable') {
        return
      }
      header.splice(rowNumber, 1)
      body.forEach(({ list }) => {
        if (list && list.length) {
          list.splice(rowNumber, 1)
        }
      })
    } else {
      body.splice(colNumber, 1)
    }
    onUpdate()
  }

  return (
    <div className="table">
      {/* 表头行 */}
      <div className="row">
        <div className="th">
          <Cell type="header" value="原子条件" readonly={true} graph={graph} currentNodeId={currentNodeId} />
        </div>
        {body?.length > 0 &&
          body.map((col, colNumber) => (
            <div className="td" key={`header-${colNumber}`}>
              <Cell
                type="body"
                value="真值组合"
                readonly={true}
                graph={graph}
                currentNodeId={currentNodeId}
                contextMenu={{
                  items: contextMenuItems,
                  onClick: (args) => handleClickContextMenu(-1, colNumber, args),
                }}
              />
            </div>
          ))}
      </div>

      {/* 数据行 */}
      {header.map((headerTitle, rowNumber) => (
        <div key={`row-${rowNumber}`} className="row">
          <div className="th">
            <Cell
              type="header"
              value={headerTitle}
              readonly={tableType !== 'truthTable'}
              onUpdate={(value) => handleUpdateHeader(rowNumber, value)}
              graph={graph}
              currentNodeId={currentNodeId}
            />
          </div>
          {body.length > 0 && (
            <Fragment>
              {body.map((col, colNumber) => (
                <div className="td" key={`cell-${rowNumber}-${colNumber}`}>
                  <Cell
                    type="body"
                    contextMenu={{
                      items: contextMenuItems,
                      onClick: (args) => handleClickContextMenu(rowNumber, colNumber, args),
                    }}
                    readonly={false}
                    value={col.list[rowNumber]}
                    onUpdate={(value) => handleUpdateBody(rowNumber, colNumber, value)}
                    graph={graph}
                    currentNodeId={currentNodeId}
                  />
                </div>
              ))}
            </Fragment>
          )}
        </div>
      ))}

      {/* 底部行（目标节点） */}
      {body.length > 0 && tableType === 'truthTable' && (
        <div className="row">
          <div className="th" style={{ border: 'none' }}>
            <span>状态 → </span>
          </div>
          {body.map((col, colNumber) => (
            <div className="td" key={`footer-${colNumber}`}>
              <Cell
                type="footer"
                readonly={false}
                value={col.targetNode}
                onUpdate={(value) => handleUpdateFooter(colNumber, value)}
                graph={graph}
                currentNodeId={currentNodeId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TableEditor
