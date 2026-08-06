import { languages, editor } from 'monaco-editor';

export type LocalCompletionSource = 'snippet' | 'keyword' | 'reference'

export interface LocalCompletionItem extends languages.CompletionItem {
    source: LocalCompletionSource
}

export interface LocalCompletionContext {
    model: import('monaco-editor').editor.ITextModel
    position: import('monaco-editor').Position
    range: import('monaco-editor').IRange
    source: string
    sourceBeforeCursor: string
    sanitizedSource: string
    sanitizedBeforeCursor: string
    lineBeforeCursor: string
}

export interface LocalCompletionContribution {
    triggerCharacters?: string[]
    provideItems: (context: LocalCompletionContext) => LocalCompletionItem[]
}

export interface LspConfig {
    /** WebSocket URL, e.g. 'ws://localhost:12345/lsp' */
    wsUrl: string;
    /** Virtual document URI sent to the LS (optional, defaults to 'file:///workspace/{languageId}.dsl') */
    documentUri?: string;
}

export interface DslEditorStrategy {
    languageId: string,
    monarchTokensProviders?: languages.IMonarchLanguage,
    themeId?: string,
    theme?: editor.IStandaloneThemeData,
    completion?: LocalCompletionContribution,
    /** Language Server Protocol configuration via WebSocket */
    lsp?: LspConfig,
}
