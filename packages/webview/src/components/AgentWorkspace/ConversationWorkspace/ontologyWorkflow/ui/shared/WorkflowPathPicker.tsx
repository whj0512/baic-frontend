import { FolderOpenOutlined, LoadingOutlined } from '@ant-design/icons'
import { useRef, useState } from 'react'
import {
  isExtensionAuthMode,
  selectExtensionPath,
} from '../../../../../../config/authClient'
import type { ExtensionPathSelectionOptions } from '../../../../../../config/authClient'

interface WorkflowPathPickerProps {
  value: string
  placeholder: string
  selection: Omit<ExtensionPathSelectionOptions, 'openLabel'>
  onChange: (value: string) => void
}

function WorkflowPathPicker({
  value,
  placeholder,
  selection,
  onChange,
}: WorkflowPathPickerProps) {
  const [selecting, setSelecting] = useState(false)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const browserInputRef = useRef<HTMLInputElement | null>(null)
  const nativePickerAvailable = isExtensionAuthMode()
  const accept = selection.filters
    ? Object.values(selection.filters)
        .flat()
        .map((extension) => `.${extension.replace(/^\./, '')}`)
        .join(',')
    : undefined

  const selectPath = async () => {
    if (selecting) {
      return
    }

    setSelectionError(null)
    if (!nativePickerAvailable) {
      if (browserInputRef.current) {
        browserInputRef.current.value = ''
        browserInputRef.current.click()
      }
      return
    }

    setSelecting(true)
    try {
      const path = await selectExtensionPath({
        ...selection,
        openLabel: selection.kind === 'folder' ? '选择目录' : '选择文件',
      })
      if (path) {
        onChange(path)
      }
    } catch (error) {
      setSelectionError(error instanceof Error && error.message
        ? error.message
        : '无法选择路径')
    } finally {
      setSelecting(false)
    }
  }

  const handleBrowserSelection = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) {
      return
    }

    const fileWithPath = file as File & { path?: string }
    if (selection.kind === 'file') {
      onChange(fileWithPath.path || file.name)
      return
    }

    const relativePath = file.webkitRelativePath
    onChange(relativePath.split('/').filter(Boolean)[0] || file.name)
  }

  return (
    <div className="ontology-workflow__path-picker">
      <div>
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          disabled={selecting}
          aria-label={`${selection.title}，打开路径选择器`}
          title={selection.title}
          onClick={() => void selectPath()}
        >
          {selecting ? <LoadingOutlined spin /> : <FolderOpenOutlined />}
          <span>{selection.kind === 'folder' ? '选择目录' : '选择文件'}</span>
        </button>
        <input
          ref={browserInputRef}
          className="ontology-workflow__path-picker-native"
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          accept={accept}
          multiple={selection.kind === 'folder'}
          {...(selection.kind === 'folder'
            ? { webkitdirectory: '', directory: '' }
            : {})}
          onChange={(event) => handleBrowserSelection(event.target.files)}
        />
      </div>
      {selectionError ? <small role="alert">{selectionError}</small> : null}
    </div>
  )
}

export default WorkflowPathPicker
