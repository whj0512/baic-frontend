import { languages, editor } from 'monaco-editor';
import type { DslEditorStrategy } from "./type";
import { getRuntimeConfig } from '../../../config/runtime';

// ─── Monarch Tokenizer ────────────────────────────────────────────────────────
const monarchTokensProviders: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    ignoreCase: false,

    // Node type keywords (top-level declarations)
    nodeKeywords: [
        'Statechart', 'State', 'Condition', 'Call', 'Start', 'Transition',
    ],

    // Property keywords (used inside node bodies)
    propertyKeywords: [
        'loop', 'condition', 'from', 'to',
        'during_actions', 'yes', 'no',
        'params', 'in', 'out', 'script', 'enable_inverse', 'inverse_script',
        'pre_think', 'post_think', 'express', 'type',
        'label', 'value',
    ],

    // Boolean values
    typeValues: ['true', 'false'],

    // Brackets & delimiters
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
            // Strings (single-quoted, just in case)
            [/'([^'\\]|\\.)*'/, 'string'],

            // Numbers (float before int)
            [/\d+\.\d+/, 'number.float'],
            [/\d+/, 'number'],

            // Delimiters
            [/[[\]{}]/, '@brackets'],
            [/[,:;]/, 'delimiter'],

            // Identifiers & keywords
            [/[a-zA-Z\u4e00-\u9fa50-9_][a-zA-Z\u4e00-\u9fa50-9_\-()\/%]*/, {
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
        ],
    },
};

// ─── Custom Dark Theme ────────────────────────────────────────────────────────
const themeId = 'internalConstraints-dark';

const theme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' }, // node types – purple/pink
        { token: 'attribute', foreground: '4EC9B0' },                    // property keywords – teal
        { token: 'type', foreground: 'CE9178' },                    // type values – orange/brown
        { token: 'string', foreground: '6A9955' },                    // strings – green
        { token: 'number', foreground: 'B5CEA8' },                    // numbers – light green
        { token: 'number.float', foreground: 'B5CEA8' },
        { token: 'identifier', foreground: '9CDCFE' },                    // identifiers – light blue
        { token: 'delimiter', foreground: '808080' },                    // delimiters – gray
        { token: 'delimiter.square', foreground: 'FFD700' },               // square brackets – gold
        { token: 'delimiter.curly', foreground: 'DA70D6' },               // curly brackets – orchid
        { token: 'white', foreground: 'D4D4D4' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    ],
    colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
    },
};

// ─── Completion Item Providers ────────────────────────────────────────────────

/**
 * Build a snippet CompletionItem.
 */
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

/** Top-level node/transition snippet provider */
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
            makeSnippet(
                'Statechart',
                'Statechart ${1:name} {\n  $0\n}',
                '创建 Statechart 声明',
                range,
            ),
            makeSnippet(
                'State',
                'State ${1:name} {\n  $0\n};',
                '创建 State 节点',
                range,
            ),
            makeSnippet(
                'Condition',
                'Condition ${1:name} {\n  condition : "${2:expression}"\n  $0\n};',
                '创建 Condition 节点',
                range,
            ),
            makeSnippet(
                'Call',
                'Call ${1:name} {\n  $0\n};',
                '创建 Call 节点',
                range,
            ),
            makeSnippet(
                'Start',
                'Start ${1:name};',
                '创建 Start 节点',
                range,
            ),
            makeSnippet(
                'Transition',
                'Transition ${1:name} {\n  $0\n  from : ${2:sourceNode}\n  to : ${3:targetNode}\n};',
                '创建 Transition 连接',
                range,
            ),
        ];

        return { suggestions };
    },
};

/** Property keyword provider (suggests property names) */
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

        // State-specific properties
        const stateProps: languages.CompletionItem[] = [
            makeKeyword('during_actions', 'State: 持续动作列表', range),
        ];

        // Condition-specific properties
        const conditionProps: languages.CompletionItem[] = [
            makeKeyword('condition', 'Condition: 条件表达式', range),
            makeKeyword('yes', 'Condition: "是" 分支迁移', range),
            makeKeyword('no', 'Condition: "否" 分支迁移', range),
        ];

        // Call-specific properties
        const callProps: languages.CompletionItem[] = [
            makeKeyword('params', 'Call: 参数列表', range),
            makeKeyword('in', 'Call: 输入列表', range),
            makeKeyword('out', 'Call: 输出列表', range),
            makeKeyword('script', 'Call: 脚本路径', range),
            makeKeyword('enable_inverse', 'Call: 启用逆向', range),
            makeKeyword('inverse_script', 'Call: 逆向脚本', range),
        ];

        // Transition-specific properties
        const transitionProps: languages.CompletionItem[] = [
            makeKeyword('from', 'Transition: 源节点', range),
            makeKeyword('to', 'Transition: 目标节点', range),
            makeKeyword('loop', 'Transition: 循环次数', range),
        ];

        // ActionItem properties
        const actionProps: languages.CompletionItem[] = [
            makeKeyword('pre_think', 'ActionItem: 前置思考', range),
            makeKeyword('post_think', 'ActionItem: 后置思考', range),
            makeKeyword('express', 'ActionItem: 表达式', range),
            makeKeyword('type', 'ActionItem: 类型', range),
        ];

        // Param properties
        const paramProps: languages.CompletionItem[] = [
            makeKeyword('label', 'Param: 标签', range),
            makeKeyword('value', 'Param: 值', range),
        ];

        // Boolean value completions
        const valueProps: languages.CompletionItem[] = [
            makeKeyword('true', '布尔值: 真', range),
            makeKeyword('false', '布尔值: 假', range),
        ];

        return {
            suggestions: [
                ...stateProps,
                ...conditionProps,
                ...callProps,
                ...transitionProps,
                ...actionProps,
                ...paramProps,
                ...valueProps,
            ],
        };
    },
};

// ─── Strategy Export ───────────────────────────────────────────────────────────
const internalConstraintsStrategy: DslEditorStrategy = {
    languageId: 'internalConstraints',
    monarchTokensProviders,
    themeId,
    theme,
    completionItemProviders: [nodeCompletionProvider, propertyCompletionProvider],
    lsp: {
        wsUrl: getRuntimeConfig().lspWs.internalConstraints,
    },
};

export default internalConstraintsStrategy;
