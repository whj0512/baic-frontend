import { useId, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

import './Markdown.css'

const MARKDOWN_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS = [rehypeRaw, rehypeSanitize]

const MARKDOWN_COMPONENTS: Components = {
  a({ node, ...props }) {
    void node
    return <a {...props} target="_blank" rel="noreferrer noopener" />
  },
}

export interface MarkdownRendererProps {
  value: string
  className?: string
  collapsible?: boolean
}

function MarkdownRenderer({
  value,
  className,
  collapsible = true,
}: MarkdownRendererProps) {
  const [collapsed, setCollapsed] = useState(false)
  const contentId = useId()
  const classes = ['markdown-renderer', className].filter(Boolean).join(' ')
  const contentClasses = [
    'markdown-renderer__content',
    collapsible && collapsed ? 'markdown-renderer__content--collapsed' : null,
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {collapsible && (
        <button
          type="button"
          className="markdown-renderer__toggle"
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => setCollapsed(previous => !previous)}
        >
          <span
            className={`markdown-renderer__toggle-icon${collapsed ? ' markdown-renderer__toggle-icon--collapsed' : ''}`}
            aria-hidden="true"
          >
            ▾
          </span>
          {collapsed ? '展开' : '收起'}
        </button>
      )}
      <div id={contentId} className={contentClasses}>
        <ReactMarkdown
          components={MARKDOWN_COMPONENTS}
          rehypePlugins={REHYPE_PLUGINS}
          remarkPlugins={MARKDOWN_PLUGINS}
        >
          {value}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default MarkdownRenderer
