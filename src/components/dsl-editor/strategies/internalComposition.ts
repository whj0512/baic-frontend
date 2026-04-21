import { languages, editor } from 'monaco-editor';
import type { DslEditorStrategy } from "./type";

// ─── Monarch Tokenizer ────────────────────────────────────────────────────────
const monarchTokensProviders: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    ignoreCase: false,

    // Node type keywords
    nodeKeywords: [
        'FunctionalModule'
    ],

    brackets: [
        { open: '{', close: '}', token: 'delimiter.curly' },
    ],

    tokenizer: {
        root: [
            // Whitespace
            [/\s+/, 'white'],

            // Comments
            [/\/\/.*/, 'comment'],
            [/\/\*/, 'comment', '@comment'],

            // Delimiters
            [/[{}]/, '@brackets'],
            [/[;,]/, 'delimiter'],

            // Identifiers & keywords
            [/[a-zA-Z\u4e00-\u9fa5_\/][a-zA-Z\u4e00-\u9fa50-9_\-\/]*/, {
                cases: {
                    '@nodeKeywords': 'keyword',
                    '@default': 'identifier',
                },
            }],
        ],
        comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment']
        ]
    },
};

// ─── Custom Dark Theme ────────────────────────────────────────────────────────
const themeId = 'internalComposition-dark';

const theme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },     // node types
        { token: 'identifier', foreground: '9CDCFE' },                       // identifiers
        { token: 'delimiter', foreground: '808080' },                        // delimiters
        { token: 'delimiter.curly', foreground: 'DA70D6' },                  // curly brackets
        { token: 'white', foreground: 'D4D4D4' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },     // comments
    ],
    colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
    },
};

// ─── Completion Item Providers ────────────────────────────────────────────────

function makeSnippet(
    label: string,
    insertText: string,
    detail: string,
    range: any,
): languages.CompletionItem {
    return {
        label,
        kind: languages.CompletionItemKind.Snippet,
        insertText,
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail,
        range,
    };
}

const nodeCompletionProvider: languages.CompletionItemProvider = {
    provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
        };

        const suggestions: languages.CompletionItem[] = [
            makeSnippet('FunctionalModule', 'FunctionalModule ${1:name};', '创建 FunctionalModule 组件', range),
        ];

        return { suggestions };
    },
};

// ─── Strategy Export ───────────────────────────────────────────────────────────
const internalCompositionStrategy: DslEditorStrategy = {
    languageId: 'internalComposition',
    monarchTokensProviders,
    themeId,
    theme,
    completionItemProviders: [nodeCompletionProvider],
    lsp: {
        wsUrl: 'ws://127.0.0.1:3003',
    },
};

export default internalCompositionStrategy;