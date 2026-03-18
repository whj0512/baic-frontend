import { languages, editor } from 'monaco-editor';
import type { DslEditorStrategy } from "./type";

// ─── Monarch Tokenizer ────────────────────────────────────────────────────────
const monarchTokensProviders: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    ignoreCase: false,

    // Node type keywords (top-level declarations)
    nodeKeywords: [
        'Graph', 'State', 'Condition', 'Call', 'GraphRef',
        'Comment', 'Start', 'Then', 'TruthTable', 'Goto', 'Transition',
    ],

    // Property keywords (used inside node bodies)
    propertyKeywords: [
        'type', 'desc',
        'forward_propagation', 'tolerance_type', 'tolerance_value',
        'pre_think_time', 'post_think_time',
        'during_actions', 'normal_test_actions', 'dynamic_test_actions',
        'condition', 'yes', 'no',
        'params', 'in', 'out', 'script', 'enable_inverse', 'inverse_script',
        'time_related_step', 'time_related_duration',
        'graph_id', 'return_value', 'has_return_value',
        'comment', 'friendNode',
        'header', 'body', 'targetNode', 'list',
        'from', 'to', 'loop',
        'pre_think', 'post_think', 'express',
        'label', 'value',
    ],

    // Type values & booleans
    typeValues: ['request', 'testcase', 'true', 'false'],

    // Brackets & delimiters
    brackets: [
        { open: '[', close: ']', token: 'delimiter.square' },
        { open: '{', close: '}', token: 'delimiter.curly' },
    ],

    tokenizer: {
        root: [
            // Whitespace
            [/\s+/, 'white'],

            // Strings (double-quoted)
            [/"([^"\\]|\\.)*"/, 'string'],
            // Strings (single-quoted, just in case)
            [/'([^'\\]|\\.)*'/, 'string'],

            // Numbers (float before int)
            [/\d+\.\d+/, 'number.float'],
            [/\d+/, 'number'],

            // Delimiters
            [/[[\]{}]/, '@brackets'],
            [/[,:]/, 'delimiter'],

            // Identifiers & keywords
            [/[a-zA-Z_][\w\-()]*/, {
                cases: {
                    '@nodeKeywords': 'keyword',
                    '@propertyKeywords': 'attribute',
                    '@typeValues': 'type',
                    '@default': 'identifier',
                },
            }],
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
                'Graph',
                'Graph ${1:name}\n  type ${2|request,testcase|}\n  desc "${3:description}"\n$0',
                '创建 Graph 声明',
                range,
            ),
            makeSnippet(
                'State',
                'State ${1:name}\n  desc "${2:description}"\n$0',
                '创建 State 节点',
                range,
            ),
            makeSnippet(
                'Condition',
                'Condition ${1:name}\n  desc "${2:description}"\n  condition : "${3:expression}"\n$0',
                '创建 Condition 节点',
                range,
            ),
            makeSnippet(
                'Call',
                'Call ${1:name}\n  desc "${2:description}"\n  script : "${3:script_path}"\n$0',
                '创建 Call 节点',
                range,
            ),
            makeSnippet(
                'GraphRef',
                'GraphRef ${1:name}\n  desc "${2:description}"\n  graph_id : "${3:ref_id}"\n$0',
                '创建 GraphRef 节点',
                range,
            ),
            makeSnippet(
                'Comment',
                'Comment ${1:name}\n  desc "${2:description}"\n  comment : "${3:text}"\n$0',
                '创建 Comment 节点',
                range,
            ),
            makeSnippet(
                'Start',
                'Start ${1:name}\n  desc "${2:description}"\n$0',
                '创建 Start 节点',
                range,
            ),
            makeSnippet(
                'Then',
                'Then ${1:name}\n  desc "${2:description}"\n$0',
                '创建 Then 节点',
                range,
            ),
            makeSnippet(
                'TruthTable',
                'TruthTable ${1:name}\n  desc "${2:description}"\n  header : [${3:"col1", "col2"}]\n$0',
                '创建 TruthTable 节点',
                range,
            ),
            makeSnippet(
                'Goto',
                'Goto ${1:name}\n  desc "${2:description}"\n  friendNode : ${3:targetNodeName}\n$0',
                '创建 Goto 节点',
                range,
            ),
            makeSnippet(
                'Transition',
                'Transition ${1:name}\n  desc "${2:description}"\n  from : ${3:sourceNode}\n  to : ${4:targetNode}\n$0',
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

        // Common properties available in most node types
        const commonProps: languages.CompletionItem[] = [
            makeKeyword('desc', '描述 (通用属性)', range),
            makeKeyword('tolerance_type', '时间偏差类型', range),
            makeKeyword('tolerance_value', '时间偏差值', range),
        ];

        // State-specific properties
        const stateProps: languages.CompletionItem[] = [
            makeKeyword('forward_propagation', 'State: 前向传播', range),
            makeKeyword('pre_think_time', 'State: 前置思考时间', range),
            makeKeyword('post_think_time', 'State: 后置思考时间', range),
            makeKeyword('during_actions', 'State: 持续动作列表', range),
            makeKeyword('normal_test_actions', 'State: 常规测试动作列表', range),
            makeKeyword('dynamic_test_actions', 'State: 动态测试动作列表', range),
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
            makeKeyword('time_related_step', 'Call: 时间相关步长', range),
            makeKeyword('time_related_duration', 'Call: 时间相关持续时间', range),
        ];

        // GraphRef-specific properties
        const graphRefProps: languages.CompletionItem[] = [
            makeKeyword('graph_id', 'GraphRef: 引用的图 ID', range),
            makeKeyword('return_value', 'GraphRef: 返回值', range),
            makeKeyword('has_return_value', 'GraphRef: 是否有返回值', range),
        ];

        // Transition-specific properties
        const transitionProps: languages.CompletionItem[] = [
            makeKeyword('from', 'Transition: 源节点', range),
            makeKeyword('to', 'Transition: 目标节点', range),
            makeKeyword('loop', 'Transition: 循环次数', range),
        ];

        // Goto-specific properties
        const gotoProps: languages.CompletionItem[] = [
            makeKeyword('friendNode', 'Goto: 目标友好节点', range),
        ];

        // Comment-specific properties
        const commentProps: languages.CompletionItem[] = [
            makeKeyword('comment', 'Comment: 注释文本', range),
        ];

        // TruthTable-specific properties
        const truthTableProps: languages.CompletionItem[] = [
            makeKeyword('header', 'TruthTable: 表头', range),
            makeKeyword('body', 'TruthTable: 表体', range),
            makeKeyword('targetNode', 'TruthTable 行: 目标节点', range),
            makeKeyword('list', 'TruthTable 行: 布尔值列表', range),
        ];

        // Graph-level properties
        const graphProps: languages.CompletionItem[] = [
            makeKeyword('type', 'Graph: 图类型 (request/testcase)', range),
        ];

        // ActionItem properties
        const actionProps: languages.CompletionItem[] = [
            makeKeyword('pre_think', 'ActionItem: 前置思考', range),
            makeKeyword('post_think', 'ActionItem: 后置思考', range),
            makeKeyword('express', 'ActionItem: 表达式', range),
        ];

        // Param properties
        const paramProps: languages.CompletionItem[] = [
            makeKeyword('label', 'Param: 标签', range),
            makeKeyword('value', 'Param: 值', range),
        ];

        // Boolean / type value completions
        const valueProps: languages.CompletionItem[] = [
            makeKeyword('true', '布尔值: 真', range),
            makeKeyword('false', '布尔值: 假', range),
            makeKeyword('request', 'GraphType: 请求', range),
            makeKeyword('testcase', 'GraphType: 测试用例', range),
        ];

        return {
            suggestions: [
                ...commonProps,
                ...stateProps,
                ...conditionProps,
                ...callProps,
                ...graphRefProps,
                ...transitionProps,
                ...gotoProps,
                ...commentProps,
                ...truthTableProps,
                ...graphProps,
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
        wsUrl: 'ws://127.0.0.1:3000',
    },
};

export default internalConstraintsStrategy;