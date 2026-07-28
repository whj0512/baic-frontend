import {
  BulbOutlined,
  FileOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import type { ConversationPart } from '../qwenPaw/types'
import CodeDataView from './CodeDataView'
import {
  formatFileSize,
  stringifyData,
} from './conversationUtils'
import { isRequirementDslArtifactsToolPart } from './toolMessage/requirementDslArtifacts/parseRequirementDslArtifacts'

interface MessagePartViewProps {
  part: ConversationPart
  renderMarkdown: boolean
}

const MARKDOWN_PLUGINS = [remarkGfm]

const MARKDOWN_COMPONENTS: Components = {
  a({ node, ...props }) {
    void node
    return <a {...props} target="_blank" rel="noreferrer noopener" />
  },
}

function getToolDetails(
  part: Extract<ConversationPart, { type: 'tool' }>,
): unknown {
  if (part.input === undefined && part.output === undefined) {
    return part.data
  }

  return {
    callId: part.callId,
    input: part.input,
    output: part.output,
  }
}

function getToolLabel(
  part: Extract<ConversationPart, { type: 'tool' }>,
): string {
  if (isRequirementDslArtifactsToolPart(part)) {
    return 'query-requirement-dsl-artifacts'
  }
  if (part.name) {
    return part.name
  }
  if (part.eventType === 'plugin_call_and_output') {
    return '工具活动'
  }
  if (part.eventType === 'plugin_call_output') {
    return '工具结果'
  }
  return '工具调用'
}

function ToolPartView({
  part,
}: {
  part: Extract<ConversationPart, { type: 'tool' }>
}) {
  const [open, setOpen] = useState(false)

  return (
    <details
      className="conversation-message__tool"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <ToolOutlined />
        <span>{getToolLabel(part)}</span>
      </summary>
      {open ? <CodeDataView data={getToolDetails(part)} /> : null}
    </details>
  )
}

function MessagePartView({
  part,
  renderMarkdown,
}: MessagePartViewProps) {
  switch (part.type) {
    case 'text':
      if (!part.text) {
        return null
      }

      return renderMarkdown ? (
        <div className="conversation-message__text conversation-markdown">
          <ReactMarkdown
            components={MARKDOWN_COMPONENTS}
            remarkPlugins={MARKDOWN_PLUGINS}
          >
            {part.text}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="conversation-message__text">{part.text}</div>
      )
    case 'reasoning':
      if (!part.text) {
        return null
      }

      return (
        <details className="conversation-message__reasoning">
          <summary>
            <BulbOutlined />
            <span>智能体思考</span>
          </summary>
          <div className="conversation-message__reasoning-content conversation-markdown">
            <ReactMarkdown
              components={MARKDOWN_COMPONENTS}
              remarkPlugins={MARKDOWN_PLUGINS}
            >
              {part.text}
            </ReactMarkdown>
          </div>
        </details>
      )
    case 'file': {
      const fileSize = formatFileSize(part.size)
      return (
        <div className="conversation-attachment">
          <FileOutlined aria-hidden="true" />
          <span className="conversation-attachment__name">{part.filename}</span>
          {fileSize ? (
            <span className="conversation-attachment__size">{fileSize}</span>
          ) : null}
        </div>
      )
    }
    case 'image':
      return (
        <div className="conversation-message__part-card">
          <PictureOutlined />
          <span>图片内容</span>
        </div>
      )
    case 'data':
      return (
        <pre className="conversation-message__data">
          {stringifyData(part.data)}
        </pre>
      )
    case 'tool':
      return <ToolPartView part={part} />
    case 'unknown':
      return (
        <div className="conversation-message__part-card">
          <InfoCircleOutlined />
          <span>{part.summary}</span>
        </div>
      )
  }
}

export default MessagePartView
