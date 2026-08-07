import { editor, languages } from 'monaco-editor'
import type { DslEditorStrategy } from './type'
import {
  extractNamedDeclarations,
  getInnermostNamedBlock,
  isCompletingPropertyReference,
  makeReference,
  makeSnippet,
} from './completion'

const monarchTokensProviders: languages.IMonarchLanguage = {
  defaultToken: 'invalid',
  ignoreCase: false,
  declarationKeywords: ['DialogMap', 'Entry', 'Page', 'Transition'],
  propertyKeywords: [
    'widgets', 'widget_id', 'type', 'name', 'action', 'action_type', 'target',
    'condition', 'display_variants', 'variant_id', 'display_text', 'trigger',
    'trigger_type', 'from', 'to', 'data_carried',
  ],
  valueKeywords: ['null'],
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' },
  ],
  tokenizer: {
    root: [
      [/\s+/, 'white'],
      [/\/\/.*/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
      [/"([^"\\]|\\.)*"/, 'string'],
      [/[{}\[\]]/, '@brackets'],
      [/[,:;]/, 'delimiter'],
      [/[\u4e00-\u9fa5a-zA-Z0-9_][\u4e00-\u9fa5a-zA-Z0-9_\-()\/%]*/, {
        cases: {
          '@declarationKeywords': 'keyword',
          '@propertyKeywords': 'attribute',
          '@valueKeywords': 'type',
          '@default': 'identifier',
        },
      }],
    ],
    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],
  },
}

const themeId = 'dialogMap-dark'
const theme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
    { token: 'attribute', foreground: '4EC9B0' },
    { token: 'type', foreground: 'CE9178' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'identifier', foreground: '9CDCFE' },
    { token: 'delimiter', foreground: '808080' },
    { token: 'delimiter.square', foreground: 'FFD700' },
    { token: 'delimiter.curly', foreground: 'DA70D6' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#1E1E1E',
    'editor.foreground': '#D4D4D4',
  },
}

const extractWidgetIds = (source: string) => (
  Array.from(source.matchAll(/\bwidget_id\s*:\s*"([^"]+)"/g), match => match[1])
)

const completion: DslEditorStrategy['completion'] = {
  triggerCharacters: [' ', ':', '"'],
  provideItems(context) {
    if (isCompletingPropertyReference(context.lineBeforeCursor, ['from', 'to'])) {
      return extractNamedDeclarations(context.sanitizedSource, ['Entry', 'Page'])
        .map(name => makeReference(context, name, 'DialogMap 节点引用'))
    }
    if (/\btarget\s*:\s*"[^"\n]*$/.test(context.lineBeforeCursor)) {
      return extractNamedDeclarations(context.sanitizedSource, ['Page'])
        .map(name => makeSnippet(context, name, name, '目标 Page 名称'))
    }
    if (/\btrigger\s*:\s*"[^"\n]*$/.test(context.lineBeforeCursor)) {
      return extractWidgetIds(context.source)
        .map(widgetId => makeSnippet(context, widgetId, widgetId, '源 Page widget_id'))
    }
    if (/\btrigger_type\s*:\s*"[^"\n]*$/.test(context.lineBeforeCursor)) {
      return [
        makeSnippet(context, 'click', 'click', '点击触发'),
        makeSnippet(context, 'auto', 'auto', '自动触发'),
      ]
    }

    const block = getInnermostNamedBlock(
      context.sanitizedBeforeCursor,
      ['DialogMap', 'Page', 'Transition'],
    )
    if (!block) {
      return [makeSnippet(
        context,
        'DialogMap',
        'DialogMap ${1:name} {\n  Entry Start;\n  $0\n}',
        '创建 DialogMap',
      )]
    }
    if (block === 'DialogMap') {
      return [
        makeSnippet(context, 'Entry', 'Entry ${1:Start};', '创建唯一入口'),
        makeSnippet(context, 'Page', 'Page ${1:name} {\n  widgets: []\n};', '创建 Page'),
        makeSnippet(
          context,
          'Transition',
          'Transition ${1:name} {\n  trigger: "${2}"\n  trigger_type: "${3|click,auto|}"\n  from: ${4:source}\n  to: ${5:target}\n  condition: "${6}"\n  data_carried: []\n};',
          '创建 Transition',
        ),
      ]
    }
    if (block === 'Page') {
      return [makeSnippet(
        context,
        'widgets',
        'widgets: [\n  { widget_id: "${1:WDG_001}" type: "${2:button}" name: "${3}" action: "${4}" action_type: "${5|execute,navigate,dismiss,popup|}" target: ${6:null} condition: "${7}" display_variants: [] }\n]',
        '创建 Widget 列表',
      )]
    }
    return [
      makeSnippet(context, 'trigger', 'trigger: "${1}"', '触发组件'),
      makeSnippet(context, 'trigger_type', 'trigger_type: "${1|click,auto|}"', '触发类型'),
      makeSnippet(context, 'from', 'from: ${1:source}', '源节点'),
      makeSnippet(context, 'to', 'to: ${1:target}', '目标节点'),
      makeSnippet(context, 'condition', 'condition: "${1}"', '迁移条件'),
      makeSnippet(context, 'data_carried', 'data_carried: ["${1}"]', '携带数据'),
    ]
  },
}

const dialogMapStrategy: DslEditorStrategy = {
  languageId: 'dialogMap',
  monarchTokensProviders,
  themeId,
  theme,
  completion,
}

export default dialogMapStrategy
