import { languages, editor } from 'monaco-editor';
import type { DslEditorStrategy } from "./type";

// ─── Monarch Tokenizer ────────────────────────────────────────────────────────
const monarchTokensProviders: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    ignoreCase: false,

    // Node type keywords
    nodeKeywords: [
        'Machine', 'Human', 'Device', 'Controller', 'ControlUnit', 'FunctionalModule',
        'Connect', 'Interaction'
    ],

    // Property / relation keywords
    propertyKeywords: [
        'from', 'to'
    ],

    typeValues: ['In', 'Out'],

    brackets: [
        { open: '[', close: ']', token: 'delimiter.square' },
        { open: '{', close: '}', token: 'delimiter.curly' },
    ],

    tokenizer: {
        root: [
            // Whitespace
            [/\s+/, 'white'],

            // Comments
            [/\/\/.*/, 'comment'],
            [/\/\*/, 'comment', '@comment'],

            // Strings (double-quoted)
            [/"([^"\\]|\\.)*"/, 'string'],
            // Strings (single-quoted)
            [/'([^'\\]|\\.)*'/, 'string'],

            // Numbers
            [/\d+\.\d+/, 'number.float'],
            [/\d+/, 'number'],

            // Delimiters
            [/[[\]{}]/, '@brackets'],
            [/[;,]/, 'delimiter'],

            // Identifiers & keywords
            [/[a-zA-Z\u4e00-\u9fa50-9_\/][a-zA-Z\u4e00-\u9fa50-9_\-()\/]*/, {
                cases: {
                    '@nodeKeywords': 'keyword',
                    '@propertyKeywords': 'attribute',
                    '@typeValues': 'type',
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
const themeId = 'environment-dark';

const theme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' }, // node types
        { token: 'attribute', foreground: '4EC9B0' },                  // property keywords
        { token: 'type', foreground: 'CE9178' },                       // type values
        { token: 'string', foreground: '6A9955' },                     // strings
        { token: 'number', foreground: 'B5CEA8' },                     // numbers
        { token: 'number.float', foreground: 'B5CEA8' },
        { token: 'identifier', foreground: '9CDCFE' },                 // identifiers
        { token: 'delimiter', foreground: '808080' },                  // delimiters
        { token: 'delimiter.square', foreground: 'FFD700' },           // square brackets
        { token: 'delimiter.curly', foreground: 'DA70D6' },            // curly brackets
        { token: 'white', foreground: 'D4D4D4' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },// comments
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

function makeKeyword(
    label: string,
    detail: string,
    range: any,
): languages.CompletionItem {
    return {
        label,
        kind: languages.CompletionItemKind.Keyword,
        insertText: label,
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
            makeSnippet('Machine', 'Machine ${1:name};', '创建 Machine 组件', range),
            makeSnippet('Human', 'Human ${1:name};', '创建 Human 组件', range),
            makeSnippet('Device', 'Device ${1:name};', '创建 Device 组件', range),
            makeSnippet('Controller', 'Controller ${1:name};', '创建 Controller 组件', range),
            makeSnippet('ControlUnit', 'ControlUnit ${1:name};', '创建 ControlUnit 组件', range),
            makeSnippet('FunctionalModule', 'FunctionalModule ${1:name};', '创建 FunctionalModule 组件', range),
            makeSnippet('Connect', 'Connect from ${1:source} to ${2:target} {\n  $0\n};', '创建 Connector 连接', range),
            makeSnippet('Interaction', 'Interaction ${1:name} { ${2:data} };', '创建 Interaction 交互', range),
        ];

        return { suggestions };
    },
};

const propertyCompletionProvider: languages.CompletionItemProvider = {
    triggerCharacters: [' ', '\n'],

    provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
        };

        const suggestions: languages.CompletionItem[] = [
            makeKeyword('from', 'Connector: 源节点', range),
            makeKeyword('to', 'Connector: 目标节点', range),
            makeKeyword('In', 'PortDirection: 输入', range),
            makeKeyword('Out', 'PortDirection: 输出', range),
        ];

        return { suggestions };
    },
};

// ─── Strategy Export ───────────────────────────────────────────────────────────
const environmentStrategy: DslEditorStrategy = {
    languageId: 'environment',
    monarchTokensProviders,
    themeId,
    theme,
    completionItemProviders: [nodeCompletionProvider, propertyCompletionProvider],
    lsp: {
        wsUrl: import.meta.env.VITE_LSP_WS_ENVIRONMENT ?? 'ws://127.0.0.1:3001',
    },
};

export default environmentStrategy;