import { languages, editor } from 'monaco-editor';
import type { DslEditorStrategy } from "./type";
import { getRuntimeConfig } from '../../../config/runtime';
import { getInnermostNamedBlock, makeKeyword, makeSnippet } from './completion';

// ─── Monarch Tokenizer ────────────────────────────────────────────────────────
const monarchTokensProviders: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    ignoreCase: false,

    // Node type keywords
    nodeKeywords: [
        'Scenario', 'Interaction'
    ],

    // Control flow keywords
    controlKeywords: [
        'if', 'elif', 'else', 'while'
    ],

    // Logical keywords
    logicalKeywords: [
        'and', 'or', 'not', 'in'
    ],

    typeValues: ['true', 'false'],

    brackets: [
        { open: '(', close: ')', token: 'delimiter.parenthesis' },
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

            // Delimiters and parenthesis
            [/[[\]{}()]/, '@brackets'],
            [/[;,]/, 'delimiter'],

            // Operators (symbols)
            [/[=><!+\-*\/|]+/, 'operator'],

            // Identifiers & keywords
            [/[a-zA-Z\u4e00-\u9fa50-9_][a-zA-Z\u4e00-\u9fa50-9_\-()\/%]*/, {
                cases: {
                    '@nodeKeywords': 'keyword',
                    '@controlKeywords': 'keyword.control',
                    '@logicalKeywords': 'operator',
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
const themeId = 'interaction-dark';

const theme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },     // node types
        { token: 'keyword.control', foreground: 'C586C0' },                  // control keywords
        { token: 'type', foreground: 'CE9178' },                            // boolean values
        { token: 'string', foreground: '6A9955' },                           // strings
        { token: 'number', foreground: 'B5CEA8' },                           // numbers
        { token: 'number.float', foreground: 'B5CEA8' },
        { token: 'identifier', foreground: '9CDCFE' },                       // identifiers
        { token: 'delimiter', foreground: '808080' },                        // delimiters
        { token: 'delimiter.parenthesis', foreground: 'FFD700' },            // parenthesis
        { token: 'delimiter.square', foreground: 'FFD700' },                 // square brackets
        { token: 'delimiter.curly', foreground: 'DA70D6' },                  // curly brackets
        { token: 'operator', foreground: 'D4D4D4' },                         // operators
        { token: 'white', foreground: 'D4D4D4' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },     // comments
    ],
    colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
    },
};

// ─── Context-aware local completion ──────────────────────────────────────────
const interactionBlocks = ['Scenario', 'if', 'elif', 'else', 'while'] as const;

const completion: DslEditorStrategy['completion'] = {
    triggerCharacters: [' ', '('],
    provideItems(context) {
        const expressionTail = context.sanitizedBeforeCursor.slice(-500);
        if (/\b(?:if|elif|while)\s*\([^)]*$/.test(expressionTail)) {
            return [
                makeKeyword(context, 'and', '逻辑操作符: 与'),
                makeKeyword(context, 'or', '逻辑操作符: 或'),
                makeKeyword(context, 'not', '逻辑操作符: 非'),
                makeKeyword(context, 'in', '比较操作符: 包含'),
                makeKeyword(context, 'true', '布尔值: 真'),
                makeKeyword(context, 'false', '布尔值: 假'),
            ];
        }

        const block = getInnermostNamedBlock(context.sanitizedBeforeCursor, interactionBlocks);
        if (!block) {
            return [makeSnippet(context, 'Scenario', 'Scenario ${1:name} {\n  $0\n}', '创建 Scenario 视图')];
        }

        return [
            makeSnippet(context, 'Interaction', 'Interaction ${1:content};', '创建原子 Interaction'),
            makeSnippet(context, 'if', 'if (${1:condition}) {\n  $0\n}', '创建 if 选择分支'),
            makeSnippet(context, 'elif', 'elif (${1:condition}) {\n  $0\n}', '创建 elif 选择分支'),
            makeSnippet(context, 'else', 'else {\n  $0\n}', '创建 else 默认分支'),
            makeSnippet(context, 'while', 'while (${1:condition}) {\n  $0\n}', '创建 while 循环'),
            makeSnippet(context, 'parallel', '{\n  $1\n} || {\n  $2\n}', '创建并行分支 (Parallel Interaction)'),
        ];
    },
};

// ─── Strategy Export ───────────────────────────────────────────────────────────
export function createInteractionStrategy(languageId: 'interaction' | 'moduleResponses'): DslEditorStrategy {
    return {
        languageId,
        monarchTokensProviders,
        themeId,
        theme,
        completion,
        lsp: {
            wsUrl: getRuntimeConfig().lspWs.interaction,
        },
    };
}

const interactionStrategy = createInteractionStrategy('interaction');

export default interactionStrategy;
