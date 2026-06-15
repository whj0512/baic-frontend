import { CodeOutlined, PlusCircleOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { type FC, useCallback, useMemo, useState } from 'react'
import { Button, message, Modal, Tooltip } from 'antd'
import { useAdvancedEditor } from '../../../../../../hooks/useAdvancedEditor'
import ActionItem from './components/ActionItem'
import {
  createDefaultAction,
  moveItem,
  normalizeActionList,
  parseActionListDraft,
  type ActionValue,
} from './utils'
import './Action.css'

export type { ActionValue } from './utils'

interface ActionProps {
  value?: ActionValue[]
  onChange?: (value: ActionValue[]) => void
  controlSchema?: { groupId?: string }
}

const serializeActionList = (items: ActionValue[]) => JSON.stringify(items, null, 2)

const validateActionListDraft = (draftValue: string) => {
  try {
    parseActionListDraft(draftValue)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid action JSON'
  }
}

const Action: FC<ActionProps> = ({ value, onChange, controlSchema }) => {
  const items = useMemo(() => normalizeActionList(value), [value])
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const commit = useCallback((nextItems: ActionValue[]) => {
    onChange?.(nextItems)
  }, [onChange])

  const advancedEditor = useAdvancedEditor<ActionValue[], string>({
    value: items,
    serialize: serializeActionList,
    validate: validateActionListDraft,
    parse: parseActionListDraft,
    onSave: commit,
    onError: (errorMessage) => message.error(errorMessage),
  })

  const handleAdd = () => {
    const nextAction = createDefaultAction()
    const nextItems = [...items, nextAction]
    commit(nextItems)
    setEditingActionId(nextAction.id)
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

      <Modal
        title="Action advanced edit"
        open={advancedEditor.open}
        width={760}
        centered
        destroyOnHidden
        onCancel={advancedEditor.closeEditor}
        footer={[
          <Button key="cancel" onClick={advancedEditor.closeEditor}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={advancedEditor.saveEditor}>
            Save
          </Button>,
        ]}
      >
        <div className="action-advanced-editor">
          <div className="action-advanced-toolbar">
            <span className="action-advanced-lang">
              Language: <span className="action-advanced-lang-badge">JSON</span>
            </span>
            <span className="action-advanced-shortcut">
              <kbd>Ctrl</kbd>+<kbd>S</kbd> Save
            </span>
          </div>
          <Editor
            height="320px"
            defaultLanguage="json"
            value={advancedEditor.draftValue}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              automaticLayout: true,
            }}
            onChange={(nextValue) => advancedEditor.setDraftValue(nextValue ?? '')}
            onMount={advancedEditor.handleEditorMount}
          />
        </div>
      </Modal>
    </div>
  )
}

export default Action
