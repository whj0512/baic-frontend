import { CodeOutlined, PlusCircleOutlined, SnippetsOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { type FC, useCallback, useMemo, useState } from 'react'
import { Button, message, Modal, Tooltip } from 'antd'
import {
  type AdvancedEditorCompletionItem,
  useAdvancedEditor,
} from '../../../../../../hooks/useAdvancedEditor'
import { getDatabaseDataForCase } from '../../testcaseView/getDatabaseDataForCase'
import ActionItem from './components/ActionItem'
import { getLegacyActionDatabaseData } from './data/legacyLogics'
import {
  createDefaultAction,
  duplicateAction,
  getListOfName,
  moveItem,
  normalizeActionList,
  parseActionListDraft,
  serializeActionListDraft,
  type ActionValue,
} from './utils'
import './Action.css'

export type { ActionValue } from './utils'

interface ActionProps {
  value?: ActionValue[]
  onChange?: (value: ActionValue[]) => void
  controlSchema?: { groupId?: string }
}

const createActionCompletionItems = (groupId?: string): AdvancedEditorCompletionItem[] => {
  const legacyData = getLegacyActionDatabaseData()
  const caseData = getDatabaseDataForCase()
  const candidates = getListOfName(groupId, {
    logics: legacyData.logics,
    types: legacyData.types.concat(caseData.types),
  })
  const items = new Map<string, AdvancedEditorCompletionItem>()

  candidates.forEach((candidate) => {
    if (candidate.type === 'logic') {
      items.set(`logic:${candidate.name}`, {
        label: candidate.name,
        insertText: candidate.name_as || candidate.name,
        detail: candidate.name_as,
        documentation: candidate.doc,
        kind: 'function',
      })
      return
    }

    items.set(`type:${candidate.name}`, {
      label: candidate.name,
      insertText: candidate.name,
      detail: candidate.value_string_mapping
        ?.map((option) => `${option.name}: ${option.value}`)
        .join(', ') || 'type',
      documentation: candidate.doc,
      kind: 'variable',
    })
  })

  return Array.from(items.values())
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
              Language: <span className="action-advanced-lang-badge">Python</span>
            </span>
            <span className="action-advanced-shortcut">
              <kbd>Ctrl</kbd>+<kbd>S</kbd> Save
            </span>
          </div>
          <Editor
            height="320px"
            defaultLanguage="python"
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
