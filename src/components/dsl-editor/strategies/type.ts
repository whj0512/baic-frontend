import { languages, editor } from 'monaco-editor';

export interface DslEditorStrategy {
    languageId: string,
    monarchTokensProviders?: languages.IMonarchLanguage,
    themeId?: string,
    theme?: editor.IStandaloneThemeData,
    completionItemProviders?: languages.CompletionItemProvider[],
}