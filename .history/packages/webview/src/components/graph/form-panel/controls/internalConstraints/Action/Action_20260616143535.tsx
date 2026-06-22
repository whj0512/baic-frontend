import { CodeOutlined, PlusCircleOutlined, SnippetsOutlined } from '@ant-design/icons'
import { type FC, useCallback, useMemo, useState } from 'react'
import { message, Tooltip } from 'antd'
import { useAdvancedEditor } from '../../../../../../hooks/useAdvancedEditor'
import ActionItem from './components/ActionItem'
import {
  createDefaultAction,
  duplicateAction,
  moveItem,
  normalizeActionList,
  parseActionListDraft,
  serializeActionListDraft,
  type ActionValue,
} from './utils'
import { createActionCompletionItems } from '../../../../../../data/advancedEditorCompletions'
import './Action.css'

export type { ActionValue } from './utils'

interface ActionProps {
  value?: ActionValue[]
  onChange?: (value: ActionValue[]) => void
  controlSchema?: { groupId?: string }
}

const Action: FC<ActionProps> = ({ value, onChange, controlSchema }) => {
  const items = useMemo(() => normalizeActionList(value), [value])
  const groupId = controlSchema?.groupId
  const advancedCompletionItems = useMemo(() => createActionCompletionItems(groupId), [groupId])
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [copiedAction, setCopiedAction] = useState<ActionValue | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const commit = useCallback((nextItems: ActionValue[]) => {
    onChange?.(nextItems)
  }, [onChange])

  const advancedEditor = useAdvancedEditor<ActionValue[], string>({
    value: items,
    title: 'Action advanced edit',
    languageLabel: 'Python',
    editorLanguage: 'python',
    shortcutLabel: 'Save',
    cancelText: 'Cancel',
    saveText: 'Save',
    serialize: serializeActionListDraft,
    parse: parseActionListDraft,
    completionLanguage: 'python',
    completionItems: advancedCompletionItems,
    onSave: commit,
    onError: (errorMessage) => message.error(errorMessage),
  })

  const handleAdd = () => {
    const nextAction = createDefaultAction()
    const nextItems = [...items, nextAction]
    commit(nextItems)
    setEditingActionId(nextAction.id)
  }

  const handleCopy = (action: ActionValue) => {
    setCopiedAction({ ...action })
  }

  const handlePaste = () => {
    if (!copiedAction) return

    const nextAction = duplicateAction(copiedAction)
    commit([...items, nextAction])
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
    <div className="action-control">
      <div className="action-toolbar">
        <Tooltip title="Add action">
          <PlusCircleOutlined className="action-toolbar__icon" onClick={handleAdd} />
        </Tooltip>
        <Tooltip title="Paste action">
          <button
            type="button"
            className="action-toolbar__button"
            disabled={!copiedAction}
            onClick={handlePaste}
          >
            <SnippetsOutlined />
          </button>
        </Tooltip>
        <Tooltip title="Advanced edit">
          <button
            type="button"
            className="action-toolbar__button"
            onClick={advancedEditor.openEditor}
          >
            <CodeOutlined />
          </button>
        </Tooltip>
      </div>
      <div className="action-list">
        {items.map((item, index) => (
          <ActionItem
            key={item.id}
            value={item}
            index={index}
            isEditing={item.id === editingActionId}
            controlSchema={controlSchema}
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
