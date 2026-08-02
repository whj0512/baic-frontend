export function resolveWorkflowMarkdownPath(
  projectRootValue: string,
  sourceRelativePathValue: string | null | undefined,
): string | null {
  const projectRoot = projectRootValue.trim()
  const sourceRelativePath = sourceRelativePathValue?.trim() ?? ''
  if (!projectRoot || !sourceRelativePath) {
    return null
  }
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(sourceRelativePath)
    || sourceRelativePath.startsWith('/')
    || sourceRelativePath.startsWith('\\')
  ) {
    return null
  }

  const segments = sourceRelativePath
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0 && segment !== '.')
  if (segments.length === 0 || segments.some((segment) => segment === '..')) {
    return null
  }

  const backslashCount = [...projectRoot].filter((item) => item === '\\').length
  const slashCount = [...projectRoot].filter((item) => item === '/').length
  const separator = backslashCount >= slashCount && projectRoot.includes('\\')
    ? '\\'
    : '/'
  const root = projectRoot.replace(/[\\/]+$/, '')
  return `${root}${separator}${segments.join(separator)}`
}
