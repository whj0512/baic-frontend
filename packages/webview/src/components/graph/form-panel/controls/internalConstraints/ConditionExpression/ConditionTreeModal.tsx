import React, { useMemo, useState } from 'react'
import { Button, Modal } from 'antd'
import ConditionTreeNode from './ConditionTreeNode'
import {
  createConditionGroup,
  parseConditionExpression,
  serializeConditionTree,
  type ConditionGroup,
} from './conditionTree'

interface ConditionTreeModalProps {
  open: boolean
  value: string
  onCancel: () => void
  onConfirm: (value: string) => void
}

interface ConditionTreeModalContentProps {
  value: string
  onCancel: () => void
  onConfirm: (value: string) => void
}

const ConditionTreeModalContent: React.FC<ConditionTreeModalContentProps> = ({
  value,
  onCancel,
  onConfirm,
}) => {
  const [draftTree, setDraftTree] = useState<ConditionGroup>(() => parseConditionExpression(value))
  const preview = useMemo(() => serializeConditionTree(draftTree), [draftTree])

  const handleClear = () => {
    setDraftTree(createConditionGroup())
  }

  return (
    <>
      <div className="condition-expression-preview">
        <span className="condition-expression-preview__label">条件:</span>
        <span className="condition-expression-preview__text" title={preview}>{preview || '空'}</span>
        <Button type="link" size="small" onClick={handleClear}>清空</Button>
      </div>
      <div className="condition-tree-editor">
        <ConditionTreeNode
          root={draftTree}
          node={draftTree}
          depth={0}
          onChange={setDraftTree}
        />
      </div>
      <div className="condition-expression-modal-footer">
        <Button onClick={onCancel}>取消</Button>
        <Button type="primary" onClick={() => onConfirm(preview)}>确定</Button>
      </div>
    </>
  )
}

const ConditionTreeModal: React.FC<ConditionTreeModalProps> = ({
  open,
  value,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      title="条件表达式"
      open={open}
      onCancel={onCancel}
      width={760}
      centered
      className="condition-expression-modal"
      footer={null}
    >
      {open && (
        <ConditionTreeModalContent
          key={value}
          value={value}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
    </Modal>
  )
}

export default ConditionTreeModal