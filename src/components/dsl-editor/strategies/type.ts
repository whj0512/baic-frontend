import { languages, editor } from 'monaco-editor';

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
    completionItemProviders?: languages.CompletionItemProvider[],
    /** Language Server Protocol configuration via WebSocket */
    lsp?: LspConfig,
}