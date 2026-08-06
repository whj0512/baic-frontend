import * as monaco from 'monaco-editor'
import {
  toSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from 'vscode-ws-jsonrpc'
import {
  createMessageConnection,
  type MessageConnection,
} from 'vscode-jsonrpc'
import {
  DiagnosticSeverity,
  type CompletionItem as LspCompletionItem,
  CompletionItemKind as LspCompletionItemKind,
  type MarkupContent,
  InsertTextFormat,
  type CompletionList,
  type Diagnostic,
  type Hover,
  type InitializeResult,
} from 'vscode-languageserver-protocol'

const CHANGE_DEBOUNCE_MS = 150
const RECONNECT_DELAYS_MS = [1000, 2000, 5000]

export interface LspConnection {
  dispose: () => void
  isReady: () => boolean
  requestCompletions: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ) => Promise<monaco.languages.CompletionItem[]>
  requestHover: (position: monaco.Position) => Promise<monaco.languages.Hover | null>
}

function toMonacoSeverity(severity: number | undefined): monaco.MarkerSeverity {
  switch (severity) {
    case DiagnosticSeverity.Error: return monaco.MarkerSeverity.Error
    case DiagnosticSeverity.Warning: return monaco.MarkerSeverity.Warning
    case DiagnosticSeverity.Information: return monaco.MarkerSeverity.Info
    case DiagnosticSeverity.Hint: return monaco.MarkerSeverity.Hint
    default: return monaco.MarkerSeverity.Info
  }
}

function toMonacoRange(range: {
  start: { line: number; character: number }
  end: { line: number; character: number }
}): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  }
}

function toMonacoCompletionItemKind(kind: number | undefined): monaco.languages.CompletionItemKind {
  const map: Record<number, monaco.languages.CompletionItemKind> = {
    [LspCompletionItemKind.Text]: monaco.languages.CompletionItemKind.Text,
    [LspCompletionItemKind.Method]: monaco.languages.CompletionItemKind.Method,
    [LspCompletionItemKind.Function]: monaco.languages.CompletionItemKind.Function,
    [LspCompletionItemKind.Constructor]: monaco.languages.CompletionItemKind.Constructor,
    [LspCompletionItemKind.Field]: monaco.languages.CompletionItemKind.Field,
    [LspCompletionItemKind.Variable]: monaco.languages.CompletionItemKind.Variable,
    [LspCompletionItemKind.Class]: monaco.languages.CompletionItemKind.Class,
    [LspCompletionItemKind.Interface]: monaco.languages.CompletionItemKind.Interface,
    [LspCompletionItemKind.Module]: monaco.languages.CompletionItemKind.Module,
    [LspCompletionItemKind.Property]: monaco.languages.CompletionItemKind.Property,
    [LspCompletionItemKind.Keyword]: monaco.languages.CompletionItemKind.Keyword,
    [LspCompletionItemKind.Snippet]: monaco.languages.CompletionItemKind.Snippet,
    [LspCompletionItemKind.Value]: monaco.languages.CompletionItemKind.Value,
    [LspCompletionItemKind.Enum]: monaco.languages.CompletionItemKind.Enum,
    [LspCompletionItemKind.EnumMember]: monaco.languages.CompletionItemKind.EnumMember,
    [LspCompletionItemKind.Constant]: monaco.languages.CompletionItemKind.Constant,
    [LspCompletionItemKind.Struct]: monaco.languages.CompletionItemKind.Struct,
    [LspCompletionItemKind.Event]: monaco.languages.CompletionItemKind.Event,
    [LspCompletionItemKind.Operator]: monaco.languages.CompletionItemKind.Operator,
    [LspCompletionItemKind.TypeParameter]: monaco.languages.CompletionItemKind.TypeParameter,
  }
  return map[kind ?? LspCompletionItemKind.Text] ?? monaco.languages.CompletionItemKind.Text
}

function extractMarkdownString(content: string | MarkupContent | undefined): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content.value
}

export function connectLsp(
  wsUrl: string,
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco,
  languageId: string,
  documentUri: string,
): LspConnection {
  const model = editor.getModel()
  if (!model) {
    return {
      dispose() {},
      isReady: () => false,
      requestCompletions: async () => [],
      requestHover: async () => null,
    }
  }

  let connection: MessageConnection | null = null
  let socket: WebSocket | null = null
  let ready = false
  let disposed = false
  let version = 1
  let pendingChange = false
  let changeTimer: ReturnType<typeof setTimeout> | undefined
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let reconnectAttempt = 0

  function clearMarkers() {
    monacoInstance.editor.setModelMarkers(model, 'lsp', [])
  }

  function flushPendingChange() {
    if (!pendingChange || !ready || !connection) return
    if (changeTimer) clearTimeout(changeTimer)
    changeTimer = undefined
    pendingChange = false
    connection.sendNotification('textDocument/didChange', {
      textDocument: { uri: documentUri, version: ++version },
      contentChanges: [{ text: model.getValue() }],
    })
  }

  function scheduleChange() {
    pendingChange = true
    if (!ready) return
    if (changeTimer) clearTimeout(changeTimer)
    changeTimer = setTimeout(flushPendingChange, CHANGE_DEBOUNCE_MS)
  }

  const changeDisposable = model.onDidChangeContent(scheduleChange)

  function scheduleReconnect() {
    if (disposed || reconnectTimer) return
    const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      start()
    }, delay)
  }

  function start() {
    if (disposed) return

    const nextSocket = new WebSocket(wsUrl)
    socket = nextSocket

    nextSocket.onopen = () => {
      if (disposed || socket !== nextSocket) return

      const transportSocket = toSocket(nextSocket)
      const nextConnection = createMessageConnection(
        new WebSocketMessageReader(transportSocket),
        new WebSocketMessageWriter(transportSocket),
      )
      connection = nextConnection

      nextConnection.onNotification(
        'textDocument/publishDiagnostics',
        (params: { uri: string; diagnostics: Diagnostic[] }) => {
          if (params.uri !== documentUri || editor.getModel() !== model) return
          monacoInstance.editor.setModelMarkers(
            model,
            'lsp',
            params.diagnostics.map(diagnostic => ({
              severity: toMonacoSeverity(diagnostic.severity),
              message: diagnostic.message,
              source: diagnostic.source,
              ...toMonacoRange(diagnostic.range),
            })),
          )
        },
      )
      nextConnection.listen()

      void nextConnection.sendRequest('initialize', {
        processId: null,
        capabilities: {
          textDocument: {
            completion: { completionItem: { snippetSupport: true } },
            hover: { contentFormat: ['markdown', 'plaintext'] },
            publishDiagnostics: { relatedInformation: true },
            synchronization: { didSave: false, willSave: false },
          },
        },
        rootUri: 'file:///workspace',
      }).then(result => {
        if (disposed || connection !== nextConnection || socket !== nextSocket) return
        const initResult = result as InitializeResult
        console.log('[LSP] Initialized:', initResult.capabilities)
        nextConnection.sendNotification('initialized', {})
        version = 1
        nextConnection.sendNotification('textDocument/didOpen', {
          textDocument: {
            uri: documentUri,
            languageId,
            version,
            text: model.getValue(),
          },
        })
        pendingChange = false
        ready = true
        reconnectAttempt = 0
      }).catch(error => {
        console.warn('[LSP] Initialization failed:', error)
        if (socket === nextSocket) nextSocket.close()
      })
    }

    nextSocket.onerror = error => {
      console.debug(`[LSP] WebSocket unavailable for ${wsUrl}:`, error)
    }

    nextSocket.onclose = () => {
      if (socket !== nextSocket) return
      ready = false
      connection?.dispose()
      connection = null
      socket = null
      clearMarkers()
      scheduleReconnect()
    }
  }

  start()

  return {
    isReady: () => ready,

    async requestCompletions(requestModel, position) {
      if (requestModel !== model || !ready || !connection) return []
      flushPendingChange()
      const requestConnection = connection
      try {
        const result = await requestConnection.sendRequest('textDocument/completion', {
          textDocument: { uri: documentUri },
          position: {
            line: position.lineNumber - 1,
            character: position.column - 1,
          },
        }) as LspCompletionItem[] | CompletionList | null
        if (!result || requestConnection !== connection) return []

        const items = Array.isArray(result) ? result : result.items
        const word = model.getWordUntilPosition(position)
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }
        return items.map(item => {
          const label = typeof item.label === 'string' ? item.label : String(item.label)
          return {
            label,
            kind: toMonacoCompletionItemKind(item.kind),
            insertText: item.insertText ?? label,
            insertTextRules: item.insertTextFormat === InsertTextFormat.Snippet
              ? monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : monacoInstance.languages.CompletionItemInsertTextRule.None,
            detail: item.detail,
            documentation: item.documentation
              ? extractMarkdownString(item.documentation as string | MarkupContent)
              : undefined,
            range,
            sortText: item.sortText ?? `2-${label}`,
          }
        })
      } catch (error) {
        if (!isClosedConnectionError(error)) {
          console.warn('[LSP] Completion error:', error)
        }
        return []
      }
    },

    async requestHover(position) {
      if (!ready || !connection) return null
      flushPendingChange()
      try {
        const result = await connection.sendRequest('textDocument/hover', {
          textDocument: { uri: documentUri },
          position: {
            line: position.lineNumber - 1,
            character: position.column - 1,
          },
        }) as Hover | null
        if (!result?.contents) return null
        const rawContents = Array.isArray(result.contents) ? result.contents : [result.contents]
        return {
          range: result.range ? toMonacoRange(result.range) : undefined,
          contents: rawContents.map(content => ({
            value: typeof content === 'string' ? content : content.value ?? '',
          })),
        }
      } catch (error) {
        if (!isClosedConnectionError(error)) {
          console.warn('[LSP] Hover error:', error)
        }
        return null
      }
    },

    dispose() {
      if (disposed) return
      disposed = true
      changeDisposable.dispose()
      if (changeTimer) clearTimeout(changeTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ready && connection) {
        connection.sendNotification('textDocument/didClose', {
          textDocument: { uri: documentUri },
        })
      }
      ready = false
      connection?.dispose()
      connection = null
      const activeSocket = socket
      socket = null
      activeSocket?.close()
      clearMarkers()
    },
  }
}

function isClosedConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('Connection is closed') || message.includes('Connection is disposed')
}
