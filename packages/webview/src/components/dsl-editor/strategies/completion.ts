import { languages, type editor, type Position } from 'monaco-editor'
import type {
  LocalCompletionContext,
  LocalCompletionItem,
  LocalCompletionSource,
} from './type'

const ID_PATTERN = '[\\u4e00-\\u9fa5a-zA-Z0-9_\\/][\\u4e00-\\u9fa5a-zA-Z0-9_\\-()\\/%]*'

export function createCompletionContext(
  model: editor.ITextModel,
  position: Position,
): LocalCompletionContext {
  const word = model.getWordUntilPosition(position)
  const source = model.getValue()
  const cursorOffset = model.getOffsetAt(position)
  const sourceBeforeCursor = source.slice(0, cursorOffset)
  const sanitizedSource = maskCommentsAndStrings(source)

  return {
    model,
    position,
    range: {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    },
    source,
    sourceBeforeCursor,
    sanitizedSource,
    sanitizedBeforeCursor: maskCommentsAndStrings(sourceBeforeCursor),
    lineBeforeCursor: sourceBeforeCursor.slice(sourceBeforeCursor.lastIndexOf('\n') + 1),
  }
}

export function makeSnippet(
  context: LocalCompletionContext,
  label: string,
  insertText: string,
  detail: string,
): LocalCompletionItem {
  return makeItem(context, 'snippet', label, insertText, detail, '0')
}

export function makeKeyword(
  context: LocalCompletionContext,
  label: string,
  detail: string,
): LocalCompletionItem {
  return makeItem(context, 'keyword', label, label, detail, '1')
}

export function makeReference(
  context: LocalCompletionContext,
  label: string,
  detail: string,
): LocalCompletionItem {
  return makeItem(context, 'reference', label, label, detail, '1')
}

function makeItem(
  context: LocalCompletionContext,
  source: LocalCompletionSource,
  label: string,
  insertText: string,
  detail: string,
  sortGroup: string,
): LocalCompletionItem {
  const kind = source === 'snippet'
    ? languages.CompletionItemKind.Snippet
    : source === 'reference'
      ? languages.CompletionItemKind.Variable
      : languages.CompletionItemKind.Keyword

  return {
    source,
    label,
    kind,
    insertText,
    insertTextRules: source === 'snippet'
      ? languages.CompletionItemInsertTextRule.InsertAsSnippet
      : languages.CompletionItemInsertTextRule.None,
    detail,
    range: context.range,
    sortText: `${sortGroup}-${label}`,
  }
}

export function maskCommentsAndStrings(source: string): string {
  let result = ''
  let index = 0
  let state: 'code' | 'lineComment' | 'blockComment' | 'singleString' | 'doubleString' = 'code'

  while (index < source.length) {
    const current = source[index]
    const next = source[index + 1]

    if (state === 'code') {
      if (current === '/' && next === '/') {
        result += '  '
        index += 2
        state = 'lineComment'
        continue
      }
      if (current === '/' && next === '*') {
        result += '  '
        index += 2
        state = 'blockComment'
        continue
      }
      if (current === "'") {
        result += ' '
        index += 1
        state = 'singleString'
        continue
      }
      if (current === '"') {
        result += ' '
        index += 1
        state = 'doubleString'
        continue
      }
      result += current
      index += 1
      continue
    }

    if (current === '\n') {
      result += '\n'
      index += 1
      if (state === 'lineComment') state = 'code'
      continue
    }

    if (state === 'blockComment' && current === '*' && next === '/') {
      result += '  '
      index += 2
      state = 'code'
      continue
    }

    if ((state === 'singleString' || state === 'doubleString') && current === '\\') {
      result += next === undefined ? ' ' : '  '
      index += next === undefined ? 1 : 2
      continue
    }

    if (state === 'singleString' && current === "'") state = 'code'
    if (state === 'doubleString' && current === '"') state = 'code'
    result += ' '
    index += 1
  }

  return result
}

export function getInnermostNamedBlock(
  sourceBeforeCursor: string,
  keywords: readonly string[],
): string | undefined {
  const keywordSet = new Set(keywords)
  const stack: Array<string | undefined> = []
  const tokenPattern = new RegExp(`\\b(${keywords.join('|')})\\b|[{}]`, 'g')
  let pendingKeyword: string | undefined
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(sourceBeforeCursor))) {
    const token = match[0]
    if (keywordSet.has(token)) {
      pendingKeyword = token
    } else if (token === '{') {
      stack.push(pendingKeyword)
      pendingKeyword = undefined
    } else {
      stack.pop()
      pendingKeyword = undefined
    }
  }

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]) return stack[index]
  }
  return undefined
}

export function getBraceDepth(sourceBeforeCursor: string): number {
  let depth = 0
  for (const character of sourceBeforeCursor) {
    if (character === '{') depth += 1
    if (character === '}') depth = Math.max(0, depth - 1)
  }
  return depth
}

export function extractNamedDeclarations(
  sanitizedSource: string,
  keywords: readonly string[],
): string[] {
  const pattern = new RegExp(`\\b(?:${keywords.join('|')})\\s+(${ID_PATTERN})`, 'g')
  const names = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = pattern.exec(sanitizedSource))) {
    names.add(match[1])
  }
  return [...names]
}

export function isCompletingPropertyReference(
  lineBeforeCursor: string,
  properties: readonly string[],
  separator = ':',
): boolean {
  const escapedSeparator = separator === ':' ? '\\s*:\\s*' : '\\s+'
  return new RegExp(`\\b(?:${properties.join('|')})${escapedSeparator}[\\u4e00-\\u9fa5a-zA-Z0-9_\\/\\-()\\%]*$`).test(lineBeforeCursor)
}

export function isInsideAnonymousListObject(
  sourceBeforeCursor: string,
  property: string,
): boolean {
  const propertyIndex = sourceBeforeCursor.lastIndexOf(property)
  if (propertyIndex < 0) return false
  const tail = sourceBeforeCursor.slice(propertyIndex + property.length)
  return /:\s*\[[\s\S]*\{[^}]*$/.test(tail)
}
