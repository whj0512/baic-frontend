import { languages, editor } from 'monaco-editor';
import type { DslEditorStrategy } from "./type";
import { getRuntimeConfig } from '../../../config/runtime';
import { getBraceDepth, makeSnippet } from './completion';

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

// ─── Context-aware local completion ──────────────────────────────────────────
const completion: DslEditorStrategy['completion'] = {
    triggerCharacters: [' '],
    provideItems(context) {
        if (getBraceDepth(context.sanitizedBeforeCursor) > 0) {
            return [makeSnippet(
                context,
                'FunctionalModule',
                'FunctionalModule ${1:name};',
                '创建 FunctionalModule 组件',
            )];
        }
        return [makeSnippet(
            context,
            'Composition',
            '${1:name} {\n  $0\n}',
            '创建内部组成模型',
        )];
    },
};

// ─── Strategy Export ───────────────────────────────────────────────────────────
const internalCompositionStrategy: DslEditorStrategy = {
    languageId: 'internalComposition',
    monarchTokensProviders,
    themeId,
    theme,
    completion,
    lsp: {
        wsUrl: getRuntimeConfig().lspWs.internalComposition,
    },
};

export default internalCompositionStrategy;
