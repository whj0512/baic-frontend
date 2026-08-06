import { languages, editor } from 'monaco-editor';
import type { DslEditorStrategy } from "./type";
import { getRuntimeConfig } from '../../../config/runtime';
import {
    extractNamedDeclarations,
    getInnermostNamedBlock,
    isCompletingPropertyReference,
    isInsideAnonymousListObject,
    makeKeyword,
    makeReference,
    makeSnippet,
} from './completion';

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

// ─── Context-aware local completion ──────────────────────────────────────────
const statechartBlocks = ['Statechart', 'State', 'Condition', 'Call', 'Transition'] as const;
const nodeTypes = ['State', 'Condition', 'Call', 'Start'] as const;

const completion: DslEditorStrategy['completion'] = {
    triggerCharacters: [' ', ':'],
    provideItems(context) {
        if (isCompletingPropertyReference(context.lineBeforeCursor, ['from', 'to'])) {
            return extractNamedDeclarations(context.sanitizedSource, nodeTypes)
                .map(name => makeReference(context, name, 'Statechart 节点引用'));
        }
        if (isCompletingPropertyReference(context.lineBeforeCursor, ['yes', 'no'])) {
            return extractNamedDeclarations(context.sanitizedSource, ['Transition'])
                .map(name => makeReference(context, name, 'Statechart 迁移引用'));
        }

        if (isInsideAnonymousListObject(context.sanitizedBeforeCursor, 'during_actions')) {
            return [
                makeKeyword(context, 'pre_think', 'ActionItem: 前置思考'),
                makeKeyword(context, 'post_think', 'ActionItem: 后置思考'),
                makeKeyword(context, 'express', 'ActionItem: 表达式'),
                makeKeyword(context, 'type', 'ActionItem: 类型'),
            ];
        }
        if (isInsideAnonymousListObject(context.sanitizedBeforeCursor, 'params')) {
            return [
                makeKeyword(context, 'label', 'Param: 标签'),
                makeKeyword(context, 'value', 'Param: 值'),
            ];
        }

        const block = getInnermostNamedBlock(context.sanitizedBeforeCursor, statechartBlocks);
        if (!block) {
            return [makeSnippet(
                context,
                'Statechart',
                'Statechart ${1:name} {\n  $0\n}',
                '创建 Statechart 声明',
            )];
        }
        if (block === 'Statechart') {
            return [
                makeSnippet(context, 'State', 'State ${1:name} {\n  $0\n};', '创建 State 节点'),
                makeSnippet(
                    context,
                    'Condition',
                    'Condition ${1:name} {\n  condition : "${2:expression}"\n  $0\n};',
                    '创建 Condition 节点',
                ),
                makeSnippet(context, 'Call', 'Call ${1:name} {\n  $0\n};', '创建 Call 节点'),
                makeSnippet(context, 'Start', 'Start ${1:name};', '创建 Start 节点'),
                makeSnippet(
                    context,
                    'Transition',
                    'Transition ${1:name} {\n  from : ${2:sourceNode}\n  to : ${3:targetNode}\n  $0\n};',
                    '创建 Transition 连接',
                ),
            ];
        }
        if (block === 'State') {
            return [makeKeyword(context, 'during_actions', 'State: 持续动作列表')];
        }
        if (block === 'Condition') {
            return [
                makeKeyword(context, 'condition', 'Condition: 条件表达式'),
                makeKeyword(context, 'yes', 'Condition: 是分支迁移'),
                makeKeyword(context, 'no', 'Condition: 否分支迁移'),
            ];
        }
        if (block === 'Call') {
            return [
                makeKeyword(context, 'params', 'Call: 参数列表'),
                makeKeyword(context, 'in', 'Call: 输入列表'),
                makeKeyword(context, 'out', 'Call: 输出列表'),
                makeKeyword(context, 'script', 'Call: 脚本路径'),
                makeKeyword(context, 'enable_inverse', 'Call: 启用逆向'),
                makeKeyword(context, 'inverse_script', 'Call: 逆向脚本'),
                makeKeyword(context, 'true', '布尔值: 真'),
                makeKeyword(context, 'false', '布尔值: 假'),
            ];
        }
        return [
            makeKeyword(context, 'loop', 'Transition: 循环次数'),
            makeKeyword(context, 'condition', 'Transition: 条件表达式'),
            makeKeyword(context, 'from', 'Transition: 源节点'),
            makeKeyword(context, 'to', 'Transition: 目标节点'),
        ];
    },
};

// ─── Strategy Export ───────────────────────────────────────────────────────────
const internalConstraintsStrategy: DslEditorStrategy = {
    languageId: 'internalConstraints',
    monarchTokensProviders,
    themeId,
    theme,
    completion,
    lsp: {
        wsUrl: getRuntimeConfig().lspWs.internalConstraints,
    },
};

export default internalConstraintsStrategy;
