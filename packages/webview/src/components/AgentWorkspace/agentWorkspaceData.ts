export type AgentAccent = 'indigo' | 'slate'

export interface AgentDefinition {
  id: string
  name: string
  description: string
  accent: AgentAccent
}

export interface MessageAttachment {
  name: string
  size: string
}

export interface ConversationMessage {
  id: string
  role: 'assistant' | 'user'
  paragraphs: string[]
  time: string
  sender: string
  attachment?: MessageAttachment
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'requirements-modeling',
    name: '需求建模智能体',
    description: '需求建模 · 系统建模 · 追溯分析',
    accent: 'indigo',
  },
  {
    id: 'consistency-review',
    name: '一致性审查智能体',
    description: '一致性检查 · 冲突识别 · 合规审查',
    accent: 'slate',
  },
  {
    id: 'test-case-generation',
    name: '测试用例生成智能体',
    description: '用例生成 · 覆盖分析 · 场景设计',
    accent: 'slate',
  },
]

export const DEFAULT_AGENT_ID = AGENTS[0].id

export const CONVERSATION_MESSAGES: ConversationMessage[] = [
  {
    id: 'assistant-welcome',
    role: 'assistant',
    paragraphs: [
      '你好！我是需求建模智能体，专注于帮助你梳理与构建结构化的需求模型。',
      '我可以协助你进行需求分类、层级建模、实体关系抽取以及模型校验与追溯。',
      '请告诉我你的目标，或上传相关需求文档，我将为你提供建模建议。',
    ],
    time: '20:57',
    sender: '需求建模智能体',
  },
  {
    id: 'user-request',
    role: 'user',
    paragraphs: [
      '请帮我基于下方文档构建一个智能驾驶需求模型，包括功能需求、性能需求与约束条件，并梳理关键实体与关系。',
    ],
    time: '20:58',
    sender: '我',
    attachment: {
      name: '智能驾驶需求规格说明书_V1.0.docx',
      size: '256 KB',
    },
  },
]
