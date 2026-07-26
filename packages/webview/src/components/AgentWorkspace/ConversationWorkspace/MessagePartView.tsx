import {
  FileOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ConversationPart } from '../qwenPaw/types'
import CodeDataView from './CodeDataView'
import {
  formatFileSize,
  stringifyData,
} from './conversationUtils'

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
      return (
        <details className="conversation-message__tool">
          <summary>
            <ToolOutlined />
            <span>{part.eventType}</span>
          </summary>
          <CodeDataView data={part.data} />
        </details>
      )
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
