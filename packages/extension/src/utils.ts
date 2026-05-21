export async function readJsonObject(
  response: Response,
): Promise<Record<string, unknown>> {
  try {
    const data = await response.json()
    return typeof data === 'object' && data !== null
      ? data as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

export function getString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}
