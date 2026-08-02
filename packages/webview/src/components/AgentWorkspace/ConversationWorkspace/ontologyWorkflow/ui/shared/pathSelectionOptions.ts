export const SOURCE_DOCUMENT_SELECTION = {
  kind: 'file' as const,
  title: '选择原始需求文档',
  filters: {
    '需求文档': ['docx', 'pdf'],
  },
}

export const MARKDOWN_SELECTION = {
  kind: 'file' as const,
  title: '选择 MinerU Markdown',
  filters: {
    Markdown: ['md', 'markdown'],
  },
}

export const PROJECT_ROOT_SELECTION = {
  kind: 'folder' as const,
  title: '选择项目根目录',
}

export const TTL_SELECTION = {
  kind: 'file' as const,
  title: '选择 Turtle 文件',
  filters: {
    Turtle: ['ttl'],
  },
}
