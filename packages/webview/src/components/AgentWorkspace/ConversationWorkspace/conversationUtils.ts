export function formatMessageTime(value?: string): string | null {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    return null
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

export function formatFileSize(size?: number): string | null {
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
    return null
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function stringifyData(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

export function expandSerializedJson(value: unknown, depth = 0): unknown {
  if (depth >= 4) {
    return value
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (
      !(
        (trimmedValue.startsWith('{') && trimmedValue.endsWith('}'))
        || (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))
      )
    ) {
      return value
    }

    try {
      return expandSerializedJson(JSON.parse(trimmedValue), depth + 1)
    } catch {
      return value
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => expandSerializedJson(item, depth + 1))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        expandSerializedJson(item, depth + 1),
      ]),
    )
  }

  return value
}
