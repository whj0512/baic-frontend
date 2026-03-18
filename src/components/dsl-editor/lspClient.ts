import * as monaco from 'monaco-editor';
import {
    toSocket,
    WebSocketMessageReader,
    WebSocketMessageWriter,
} from 'vscode-ws-jsonrpc';
import {
    createMessageConnection,
    type MessageConnection,
} from 'vscode-jsonrpc';
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
} from 'vscode-languageserver-protocol';

// ─── Type helpers ─────────────────────────────────────────────────────────────

interface LspConnection {
    dispose: () => void;
}

// ─── Converters ───────────────────────────────────────────────────────────────

function toMonacoSeverity(severity: number | undefined): monaco.MarkerSeverity {
    switch (severity) {
        case DiagnosticSeverity.Error: return monaco.MarkerSeverity.Error;
        case DiagnosticSeverity.Warning: return monaco.MarkerSeverity.Warning;
        case DiagnosticSeverity.Information: return monaco.MarkerSeverity.Info;
        case DiagnosticSeverity.Hint: return monaco.MarkerSeverity.Hint;
        default: return monaco.MarkerSeverity.Info;
    }
}

function toMonacoRange(range: { start: { line: number; character: number }; end: { line: number; character: number } }): monaco.IRange {
    return {
        startLineNumber: range.start.line + 1,
        startColumn: range.start.character + 1,
        endLineNumber: range.end.line + 1,
        endColumn: range.end.character + 1,
    };
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
    };
    return map[kind ?? LspCompletionItemKind.Text] ?? monaco.languages.CompletionItemKind.Text;
}

function extractMarkdownString(content: string | MarkupContent | undefined): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return content.value;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

/**
 * Connect a Monaco editor to a Language Server over WebSocket.
 *
 * Returns a disposable that tears down the connection + all registered providers.
 */
export function connectLsp(
    wsUrl: string,
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    languageId: string,
    documentUri?: string,
): LspConnection {
    const disposables: monaco.IDisposable[] = [];
    let connection: MessageConnection | null = null;
    let ws: WebSocket | null = null;
    let version = 0;

    const uri = documentUri ?? `file:///workspace/${languageId}.dsl`;

    function start() {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log(`[LSP] WebSocket connected to ${wsUrl}`);

            const socket = toSocket(ws!);
            const reader = new WebSocketMessageReader(socket);
            const writer = new WebSocketMessageWriter(socket);

            connection = createMessageConnection(reader, writer);

            // ── Listen for server-pushed diagnostics ───────────────────────
            connection.onNotification('textDocument/publishDiagnostics', (params: { uri: string; diagnostics: Diagnostic[] }) => {
                const model = editor.getModel();
                if (!model) return;

                const markers = params.diagnostics.map((d: Diagnostic) => ({
                    severity: toMonacoSeverity(d.severity),
                    message: d.message,
                    source: d.source,
                    ...toMonacoRange(d.range),
                }));

                monacoInstance.editor.setModelMarkers(model, 'lsp', markers);
            });

            connection.listen();

            // ── Initialize ─────────────────────────────────────────────────
            connection.sendRequest('initialize', {
                processId: null,
                capabilities: {
                    textDocument: {
                        completion: {
                            completionItem: {
                                snippetSupport: true,
                            },
                        },
                        hover: {
                            contentFormat: ['markdown', 'plaintext'],
                        },
                        publishDiagnostics: {
                            relatedInformation: true,
                        },
                    },
                },
                rootUri: 'file:///workspace',
            }).then((result: unknown) => {
                const initResult = result as InitializeResult;
                console.log('[LSP] Initialized. Server capabilities:', initResult.capabilities);

                // Send initialized notification
                connection!.sendNotification('initialized', {});

                // ── Send didOpen ────────────────────────────────────────
                const text = editor.getModel()?.getValue() ?? '';
                connection!.sendNotification('textDocument/didOpen', {
                    textDocument: {
                        uri,
                        languageId,
                        version: version++,
                        text,
                    },
                });
            });

            // ── Sync editor changes → didChange ────────────────────────────
            const changeDisposable = editor.onDidChangeModelContent(() => {
                const model = editor.getModel();
                if (!model || !connection) return;

                connection.sendNotification('textDocument/didChange', {
                    textDocument: {
                        uri,
                        version: version++,
                    },
                    contentChanges: [
                        { text: model.getValue() },
                    ],
                });
            });
            disposables.push(changeDisposable);

            // ── Completion provider ────────────────────────────────────────
            const completionDisposable = monacoInstance.languages.registerCompletionItemProvider(languageId, {
                triggerCharacters: ['.', ':', '"', ' '],

                provideCompletionItems: async (model, position) => {
                    if (!connection) return { suggestions: [] };

                    try {
                        const result = await connection.sendRequest('textDocument/completion', {
                            textDocument: { uri },
                            position: {
                                line: position.lineNumber - 1,
                                character: position.column - 1,
                            },
                        }) as LspCompletionItem[] | CompletionList | null;

                        if (!result) return { suggestions: [] };

                        const items: LspCompletionItem[] = Array.isArray(result)
                            ? result
                            : (result as CompletionList).items;

                        const word = model.getWordUntilPosition(position);
                        const range: monaco.IRange = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endColumn: word.endColumn,
                        };

                        const suggestions: monaco.languages.CompletionItem[] = items.map((item) => {
                            const label = typeof item.label === 'string' ? item.label : (item.label as any).label;
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
                            };
                        });

                        return { suggestions };
                    } catch (err) {
                        console.warn('[LSP] Completion error:', err);
                        return { suggestions: [] };
                    }
                },
            });
            disposables.push(completionDisposable);

            // ── Hover provider ─────────────────────────────────────────────
            const hoverDisposable = monacoInstance.languages.registerHoverProvider(languageId, {
                provideHover: async (_model, position) => {
                    if (!connection) return null;

                    try {
                        const result = await connection.sendRequest('textDocument/hover', {
                            textDocument: { uri },
                            position: {
                                line: position.lineNumber - 1,
                                character: position.column - 1,
                            },
                        }) as Hover | null;

                        if (!result || !result.contents) return null;

                        const contents = Array.isArray(result.contents)
                            ? result.contents.map((c) => ({
                                value: typeof c === 'string' ? c : (c as any).value ?? '',
                            }))
                            : [{
                                value: typeof result.contents === 'string'
                                    ? result.contents
                                    : (result.contents as any).value ?? '',
                            }];

                        return {
                            range: result.range ? toMonacoRange(result.range) : undefined,
                            contents,
                        };
                    } catch (err) {
                        console.warn('[LSP] Hover error:', err);
                        return null;
                    }
                },
            });
            disposables.push(hoverDisposable);
        };

        ws.onerror = (err) => {
            console.error('[LSP] WebSocket error:', err);
        };

        ws.onclose = () => {
            console.log('[LSP] WebSocket closed');
        };
    }

    start();

    return {
        dispose() {
            disposables.forEach((d) => d.dispose());
            disposables.length = 0;
            if (connection) {
                connection.dispose();
                connection = null;
            }
            if (ws) {
                ws.close();
                ws = null;
            }
        },
    };
}
