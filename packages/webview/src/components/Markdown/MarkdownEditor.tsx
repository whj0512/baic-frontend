import MDEditor from '@uiw/react-md-editor'
import { getCommands, getExtraCommands } from '@uiw/react-md-editor/commands-cn'
import rehypeSanitize from 'rehype-sanitize'

import '@uiw/react-md-editor/markdown-editor.css'
import './Markdown.css'

const MARKDOWN_COMMANDS = getCommands()
const MARKDOWN_EXTRA_COMMANDS = getExtraCommands()
const MARKDOWN_PREVIEW_OPTIONS = {
  // @uiw/react-markdown-preview adds rehype-raw when skipHtml is false.
  skipHtml: false,
  rehypePlugins: [rehypeSanitize],
}

export interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

function MarkdownEditor({
  value,
  onChange,
  placeholder = '请输入 Markdown 内容',
  disabled = false,
}: MarkdownEditorProps) {
  return (
    <div className="markdown-editor">
      <MDEditor
        value={value}
        onChange={nextValue => onChange(nextValue ?? '')}
        commands={MARKDOWN_COMMANDS}
        extraCommands={MARKDOWN_EXTRA_COMMANDS}
        previewOptions={MARKDOWN_PREVIEW_OPTIONS}
        preview="live"
        visibleDragbar={false}
        height={320}
        textareaProps={{
          placeholder,
          'aria-label': 'Markdown 编辑区',
          disabled,
        }}
      />
    </div>
  )
}

export default MarkdownEditor
