import { languages, editor } from 'monaco-editor';
import type { DslEditorStrategy } from "./type";
import { getRuntimeConfig } from '../../../config/runtime';
import {
    extractNamedDeclarations,
    getInnermostNamedBlock,
    isCompletingPropertyReference,
    makeReference,
    makeSnippet,
} from './completion';

// ─── Monarch Tokenizer ────────────────────────────────────────────────────────
const monarchTokensProviders: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    ignoreCase: false,

    // Node type keywords
    nodeKeywords: [
        'Machine', 'Human', 'Device', 'Controller', 'ControlUnit', 'FunctionalModule',
        'Environment', 'Connect', 'Interaction', 'Signal', 'Event'
    ],

    // Property / relation keywords
    propertyKeywords: [
        'from', 'to'
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

            // Strings (double-quoted)
            [/"([^"\\]|\\.)*"/, 'string'],
            // Strings (single-quoted)
            [/'([^'\\]|\\.)*'/, 'string'],

            // Delimiters
            [/[{}]/, '@brackets'],
            [/;/, 'delimiter'],

            // Identifiers & keywords
            [/[a-zA-Z\u4e00-\u9fa50-9_\/][a-zA-Z\u4e00-\u9fa50-9_\-()\/]*/, {
                cases: {
                    '@nodeKeywords': 'keyword',
                    '@propertyKeywords': 'attribute',
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
        { token: 'string', foreground: '6A9955' },                     // strings
        { token: 'identifier', foreground: '9CDCFE' },                 // identifiers
        { token: 'delimiter', foreground: '808080' },                  // delimiters
        { token: 'delimiter.curly', foreground: 'DA70D6' },            // curly brackets
        { token: 'white', foreground: 'D4D4D4' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },// comments
    ],
    colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
    },
};

// ─── Context-aware local completion ──────────────────────────────────────────
const environmentBlocks = ['Environment', 'Connect', 'Interaction'] as const;
const componentTypes = ['Machine', 'Human', 'Device', 'Controller', 'ControlUnit', 'FunctionalModule'] as const;

const completion: DslEditorStrategy['completion'] = {
    triggerCharacters: [' ', ':'],
    provideItems(context) {
        if (isCompletingPropertyReference(context.lineBeforeCursor, ['from', 'to'], ' ')) {
            return extractNamedDeclarations(context.sanitizedSource, componentTypes)
                .map(name => makeReference(context, name, 'Environment 组件引用'));
        }

        const block = getInnermostNamedBlock(context.sanitizedBeforeCursor, environmentBlocks);
        if (!block) {
            return [makeSnippet(context, 'Environment', 'Environment {\n  $0\n}', '创建 Environment 视图')];
        }
        if (block === 'Environment') {
            return [
                ...componentTypes.map(type => makeSnippet(context, type, `${type} \${1:name};`, `创建 ${type} 组件`)),
                makeSnippet(
                    context,
                    'Connect',
                    'Connect from ${1:source} to ${2:target} {\n  Interaction ${3:name} { ${4|Signal,Event|} ${5:data} };\n};',
                    '创建 Connector 连接',
                ),
            ];
        }
        if (block === 'Connect') {
            return [makeSnippet(
                context,
                'Interaction',
                'Interaction ${1:name} { ${2|Signal,Event|} ${3:data} };',
                '创建 Interaction 交互',
            )];
        }
        return [
            makeSnippet(context, 'Signal', 'Signal ${1:data}', '创建 Signal 交互项'),
            makeSnippet(context, 'Event', 'Event ${1:data}', '创建 Event 交互项'),
        ];
    },
};

// ─── Strategy Export ───────────────────────────────────────────────────────────
const environmentStrategy: DslEditorStrategy = {
    languageId: 'environment',
    monarchTokensProviders,
    themeId,
    theme,
    completion,
    lsp: {
        wsUrl: getRuntimeConfig().lspWs.environment,
    },
};

export default environmentStrategy;
