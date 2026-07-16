export const formatPlatformDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const truncatePlatformText = (value: string | undefined, maxLength: number) => {
  if (!value) return '—'
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}
