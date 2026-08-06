import type * as monaco from 'monaco-editor'
import type { LspConnection } from './lspClient'
import { createCompletionContext } from './strategies/completion'
import type { DslEditorStrategy, LocalCompletionItem } from './strategies/type'

const REMOTE_COMPLETION_TIMEOUT_MS = 500
const sessions = new WeakMap<monaco.editor.ITextModel, LspConnection>()

export function bindLspSession(model: monaco.editor.ITextModel, session: LspConnection): void {
  sessions.set(model, session)
}

export function unbindLspSession(model: monaco.editor.ITextModel, session: LspConnection): void {
  if (sessions.get(model) === session) sessions.delete(model)
}

export function createCompositeCompletionProvider(
  strategy: DslEditorStrategy,
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: strategy.completion?.triggerCharacters,
    async provideCompletionItems(model, position, _context, token) {
      const localPromise = Promise.resolve().then(() => {
        if (token.isCancellationRequested) return []
        const context = createCompletionContext(model, position)
        return strategy.completion?.provideItems(context) ?? []
      }).catch(error => {
        console.warn('[DSL] Local completion error:', error)
        return [] as LocalCompletionItem[]
      })

      const session = sessions.get(model)
      const remotePromise = session?.isReady()
        ? withTimeout(session.requestCompletions(model, position), REMOTE_COMPLETION_TIMEOUT_MS)
        : Promise.resolve([])

      const [localItems, remoteItems] = await Promise.all([localPromise, remotePromise])
      return {
        suggestions: mergeCompletionItems(localItems, remoteItems),
      }
    },
  }
}

export function createLspHoverProvider(): monaco.languages.HoverProvider {
  return {
    provideHover(model, position) {
      return sessions.get(model)?.requestHover(position) ?? null
    },
  }
}

function mergeCompletionItems(
  localItems: LocalCompletionItem[],
  remoteItems: monaco.languages.CompletionItem[],
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = []
  const localLabels = new Set<string>()
  const seen = new Set<string>()

  for (const localItem of localItems) {
    const { source: _source, ...item } = localItem
    const label = completionLabel(item.label)
    const key = `${label}\u0000${String(item.insertText)}`
    if (seen.has(key)) continue
    seen.add(key)
    localLabels.add(label)
    suggestions.push(item)
  }

  for (const item of remoteItems) {
    const label = completionLabel(item.label)
    if (localLabels.has(label)) continue
    const key = `${label}\u0000${String(item.insertText)}`
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push({ ...item, sortText: item.sortText ?? `2-${label}` })
  }

  return suggestions
}

function completionLabel(label: monaco.languages.CompletionItemLabel): string {
  return typeof label === 'string' ? label : label.label
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | []> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve([]), timeoutMs)
    promise.then(value => {
      clearTimeout(timer)
      resolve(value)
    }).catch(() => {
      clearTimeout(timer)
      resolve([])
    })
  })
}
