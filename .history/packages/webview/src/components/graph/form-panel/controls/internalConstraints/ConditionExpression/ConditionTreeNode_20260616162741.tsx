import React from 'react'
import { Button, Input, Select, Tooltip } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { getSymbols } from '../ActionEditor/utils'
import {
  addConditionChild,
  convertRawLeafToCondition,
  createConditionGroup,
  createConditionLeaf,
  removeConditionNode,
  updateConditionNode,
  type ConditionGroup,
  type ConditionLeaf,
  type ConditionOperator,
  type ConditionTreeNode as ConditionTreeNodeType,
} from './conditionTree'

interface ConditionTreeNodeProps {
  root: ConditionGroup
  node: ConditionTreeNodeType
  depth: number
  onChange: (nextTree: ConditionGroup) => void
}

const operatorOptions = [
  { value: 'and', label: 'and' },
  { value: 'or', label: 'or' },
]

const symbolOptions = getSymbols('normal_testcase').map((symbol) => ({
  value: symbol,
  label: symbol,
}))

const ConditionTreeNode: React.FC<ConditionTreeNodeProps> = ({ root, node, depth, onChange }) => {
  if (node.type === 'condition') {
    return (
      <ConditionLeafNode
        root={root}
        node={node}
        removable={node.id !== root.id}
        onChange={onChange}
      />
    )
  }

  const handleOperatorChange = (operator: ConditionOperator) => {
    onChange(updateConditionNode(root, node.id, { operator }))
  }

  const handleAddCondition = () => {
    onChange(addConditionChild(root, node.id, createConditionLeaf()))
  }

  const handleAddGroup = () => {
    onChange(addConditionChild(root, node.id, createConditionGroup({
      children: [createConditionLeaf()],
    })))
  }

  const handleRemoveGroup = () => {
    onChange(removeConditionNode(root, node.id))
  }

  return (
    <div className={`condition-tree-group condition-tree-group--depth-${Math.min(depth, 4)}`}>
      <div className="condition-tree-group__operator">
        <Select
          size="small"
          value={node.operator}
          options={operatorOptions}
          onChange={handleOperatorChange}
        />
        {node.id !== root.id && (
          <Tooltip title="删除条件组">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemoveGroup}
            />
          </Tooltip>
        )}
      </div>
      <div className="condition-tree-group__content">
        {node.children.length === 0 ? (
          <div className="condition-tree-empty">暂无条件</div>
        ) : (
          node.children.map((child) => (
            <ConditionTreeNode
              key={child.id}
              root={root}
              node={child}
              depth={depth + 1}
              onChange={onChange}
            />
          ))
        )}
        <div className="condition-tree-actions">
          <Button size="small" icon={<PlusOutlined />} onClick={handleAddCondition}>加条件</Button>
          <Button size="small" icon={<PlusOutlined />} onClick={handleAddGroup}>加条件组</Button>
        </div>
      </div>
    </div>
  )
}

interface ConditionLeafNodeProps {
  root: ConditionGroup
  node: ConditionLeaf
  removable: boolean
  onChange: (nextTree: ConditionGroup) => void
}

const ConditionLeafNode: React.FC<ConditionLeafNodeProps> = ({ root, node, removable, onChange }) => {
  const updateLeaf = (patch: Partial<ConditionLeaf>) => {
    onChange(updateConditionNode(root, node.id, patch))
  }

  const handleRemove = () => {
    onChange(removeConditionNode(root, node.id))
  }

  const handleConvertRaw = () => {
    onChange(convertRawLeafToCondition(root, node.id))
  }

  return (
    <div className="condition-tree-leaf">
      {node.raw !== undefined ? (
        <>
          <Input
            className="condition-tree-raw-input"
            size="small"
            value={node.raw}
            placeholder="输入条件表达式"
            onChange={(event) => updateLeaf({ raw: event.target.value })}
          />
          <Button size="small" onClick={handleConvertRaw}>拆分</Button>
        </>
      ) : (
        <>
          <Input
            size="small"
            value={node.name}
            placeholder="请输入..."
            onChange={(event) => updateLeaf({ name: event.target.value })}
          />
          <Select
            size="small"
            value={node.symbol || '='}
            options={symbolOptions}
            placeholder="请选择关系符"
            onChange={(symbol) => updateLeaf({ symbol })}
          />
          <Input
            size="small"
            value={node.value}
            placeholder="请输入..."
            onChange={(event) => updateLeaf({ value: event.target.value })}
          />
        </>
      )}
      {removable && (
        <Button size="small" danger onClick={handleRemove}>删除</Button>
      )}
    </div>
  )
}

export default ConditionTreeNode
