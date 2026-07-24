import { CodeOutlined, PlusCircleOutlined, SnippetsOutlined } from '@ant-design/icons'
import { message, Tooltip } from 'antd'
import { type FC, useCallback, useMemo, useState } from 'react'
import { useAdvancedEditor } from '../../../../../../hooks/useAdvancedEditor'
import { getDatabaseDataForCase } from '../getDatabaseDataForCase'
import ActionItem from './components/ActionItem/ActionItem'
import { getListOfName } from './components/ActionEditor/utils'
import {
  createDefaultAction,
  duplicateAction,
  moveItem,
  normalizeActionList,
  normalizeActionType,
  parseActionListDraft,
  serializeActionListDraft,
  type ActionValue,
} from './utils'
import './Action.css'

interface ActionProps {
  value?: ActionValue[]
  onChange?: (value: ActionValue[]) => void
  name?: string
}

const Action: FC<ActionProps> = ({ value, onChange, name }) => {
  const actionType = normalizeActionType(name)
  const items = useMemo(() => normalizeActionList(value, actionType), [actionType, value])
  const advancedCompletionItems = useMemo(() => {
    return getListOfName(actionType, getDatabaseDataForCase()).map((candidate) => ({
      label: candidate.name,
      insertText: candidate.type === 'logic' ? candidate.name_as : candidate.name,
      detail: candidate.type === 'logic'
        ? candidate.name_as
        : candidate.value_string_mapping
          ?.map((option) => `${option.name}: ${option.value}`)
          .join(', ') || 'type',
      documentation: candidate.doc,
      kind: candidate.type === 'logic' ? 'function' as const : 'variable' as const,
    }))
  }, [actionType])
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [copiedAction, setCopiedAction] = useState<ActionValue | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const commit = useCallback((nextItems: ActionValue[]) => {
    onChange?.(nextItems)
  }, [onChange])

  const parseDraft = useCallback((draft: string) => {
    return parseActionListDraft(draft, actionType)
  }, [actionType])

  const advancedEditor = useAdvancedEditor<ActionValue[], string>({
    value: items,
    title: 'Test case action advanced edit',
    languageLabel: 'Python',
    editorLanguage: 'python',
    shortcutLabel: 'Save',
    cancelText: 'Cancel',
    saveText: 'Save',
    serialize: serializeActionListDraft,
    parse: parseDraft,
    completionLanguage: 'python',
    completionItems: advancedCompletionItems,
    onSave: commit,
    onError: (errorMessage) => message.error(errorMessage),
  })

  const handleAdd = () => {
    const nextAction = createDefaultAction({}, actionType)
    const nextItems = [...items, nextAction]
    commit(nextItems)
    setEditingActionId(nextAction.id)
  }

  const handleCopy = (action: ActionValue) => {
    setCopiedAction({ ...action })
  }

  const handlePaste = () => {
    if (!copiedAction) return
    commit([...items, duplicateAction(copiedAction)])
  }

  const handleUpdate = (index: number, nextValue: ActionValue) => {
    const nextItems = [...items]
    nextItems[index] = nextValue
    commit(nextItems)
  }

  const handleRemove = (index: number, itemId: string) => {
    commit(items.filter((_, itemIndex) => itemIndex !== index))
    setEditingActionId((currentId) => (currentId === itemId ? null : currentId))
  }

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null) return
    if (dragIndex !== targetIndex) {
      commit(moveItem(items, dragIndex, targetIndex))
    }
    setDragIndex(null)
  }

  return (
    <div className="testcase-action-control">
      <div className="testcase-action-toolbar">
        <Tooltip title="Add action">
          <PlusCircleOutlined className="testcase-action-toolbar__icon" onClick={handleAdd} />
        </Tooltip>
        <Tooltip title="Paste action">
          <button
            type="button"
            className="testcase-action-toolbar__button"
            disabled={!copiedAction}
            onClick={handlePaste}
          >
            <SnippetsOutlined />
          </button>
        </Tooltip>
        <Tooltip title="Advanced edit">
          <button
            type="button"
            className="testcase-action-toolbar__button"
            onClick={advancedEditor.openEditor}
          >
            <CodeOutlined />
          </button>
        </Tooltip>
      </div>
      <div className="testcase-action-list">
        {items.map((item, index) => (
          <ActionItem
            key={item.id}
            value={item}
            index={index}
            actionType={actionType}
            isEditing={item.id === editingActionId}
            onUpdate={(nextValue) => handleUpdate(index, nextValue)}
            onCopy={handleCopy}
            onRemove={() => handleRemove(index, item.id)}
            onStartEdit={() => setEditingActionId(item.id)}
            onFinishEdit={() =>
              setEditingActionId((currentId) => (currentId === item.id ? null : currentId))
            }
            onDragStart={setDragIndex}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  )
}

export default Action
