import {
  expandSerializedJson,
  stringifyData,
} from './conversationUtils'

interface CodeDataViewProps {
  data: unknown
}

function CodeDataView({ data }: CodeDataViewProps) {
  const content = stringifyData(expandSerializedJson(data))
  const lines = content.split('\n')

  return (
    <div className="conversation-code-editor">
      <div className="conversation-code-editor__toolbar">
        <span className="conversation-code-editor__controls" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="conversation-code-editor__language">JSON</span>
      </div>
      <ol
        className="conversation-code-editor__content"
        aria-label="格式化的工具数据"
      >
        {lines.map((line, index) => (
          <li key={index}>
            <code>{line || '\u00a0'}</code>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default CodeDataView
