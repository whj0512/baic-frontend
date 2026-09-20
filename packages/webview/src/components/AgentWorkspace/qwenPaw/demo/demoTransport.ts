import type { QwenPawChatFilters } from '../../../../config/api'
import snapshotUrl from './snapshot.json?url'
import type { QwenPawTransport } from '../transport'
import {
  QwenPawError,
  type QwenPawAgent,
  type QwenPawChatHistory,
  type QwenPawChatRequest,
  type QwenPawChatSpec,
  type QwenPawContent,
  type QwenPawSseEvent,
  type QwenPawUploadResponse,
} from '../types'

interface DemoFeatureSummary {
  mappedRequirementCount: number
  artifactCount: number
  testcaseMappingCount: number
}

interface DemoSnapshot {
  manifest: {
    sourceName: string
    statistics: {
      chunkCount: number
      functionalRequirementCount: number
      requirementCount: number
      sourceRequirementCount: number
      artifactCount: number
      artifactRelationshipCount: number
      declaredRelationCount: number
      inferredDependencyCount: number
      inferredConflictCount: number
      stateMachineIssueCount: number
    }
  }
  chunksEnvelope: Record<string, unknown>
  dslEnvelope: Record<string, unknown>
  qaEnvelope: Record<string, unknown>
  functionRelationsEnvelope: Record<string, unknown>
  ontologyPanelEnvelope: Record<string, unknown>
  sourceArtifacts: {
    features: Record<string, { summary: DemoFeatureSummary }>
  }
}

interface DemoSession {
  agentId: string
  chat: QwenPawChatSpec
  messages: unknown[]
  status: 'idle' | 'running'
}

interface DemoToolReply {
  script: string
  output: Record<string, unknown>
}

interface DemoReply {
  text: string
  tool?: DemoToolReply
}

interface DemoScriptStep {
  id: string
  index: number
}

const DEMO_AGENTS: QwenPawAgent[] = [
  {
    id: 'tqqRiu',
    name: '本体入库智能体',
    description: '负责需求条目化、DSL 建模、本体入库与关系管理。',
    enabled: true,
    active_model: { provider_id: 'qwenpaw', model: 'QwenPaw' },
  },
  {
    id: 'ontology_qa',
    name: '本体问答智能体',
    description: '负责本体推理、问题分析与功能关系查询。',
    enabled: true,
    active_model: { provider_id: 'qwenpaw', model: 'QwenPaw' },
  },
]
const FEATURE_SEQUENCE = [
  '4在线音乐',
  '5在线电台',
  '6收音机',
  '7蓝牙音乐',
  '8U盘音乐',
] as const
const INGESTION_SCRIPT: DemoScriptStep[] = [
  'itemization-summary',
  'chunks-result',
  'online-music-modeling',
  'online-radio-modeling',
  'radio-modeling',
  'bluetooth-music-modeling',
  'usb-music-modeling',
  'dsl-artifacts',
  'ttl-validation',
  'graphdb-upload-replay',
  'ontology-inference-replay',
  'ontology-instance-panel',
  'completed',
].map((id, index) => ({ id, index }))
const QA_SCRIPT: DemoScriptStep[] = [
  'ontology-inference-replay',
  'ontology-inference-results',
  'bluetooth-music-relations-replay',
  'bluetooth-music-relations-results',
  'completed',
].map((id, index) => ({ id, index }))
const sessionsByChatId = new Map<string, DemoSession>()
const chatIdBySessionKey = new Map<string, string>()
let snapshotPromise: Promise<DemoSnapshot> | null = null

function assertNotAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  throw new QwenPawError('abort', '请求已取消', { cause: signal.reason })
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  assertNotAborted(signal)
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, ms)
    const handleAbort = () => {
      globalThis.clearTimeout(timer)
      reject(new QwenPawError('abort', '请求已取消', {
        cause: signal.reason,
      }))
    }
    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

const STREAM_DELAY_MIN_MS = 5_000
const STREAM_DELAY_MAX_MS = 15_000

function getRandomStreamDelay(): number {
  return Math.floor(
    Math.random() * (STREAM_DELAY_MAX_MS - STREAM_DELAY_MIN_MS + 1),
  ) + STREAM_DELAY_MIN_MS
}

function prepareSnapshotForConversation(snapshot: DemoSnapshot): DemoSnapshot {
  const relationData = snapshot.functionRelationsEnvelope.data
  return {
    ...snapshot,
    chunksEnvelope: {
      ...snapshot.chunksEnvelope,
      warnings: [],
    },
    dslEnvelope: {
      ...snapshot.dslEnvelope,
      warnings: [],
    },
    qaEnvelope: {
      ...snapshot.qaEnvelope,
      warnings: [],
    },
    functionRelationsEnvelope: {
      ...snapshot.functionRelationsEnvelope,
      data: typeof relationData === 'object' && relationData !== null
        ? {
            ...relationData,
            generated_by: 'requirement-ontology-query',
          }
        : relationData,
      warnings: [],
    },
  }
}

function loadSnapshot(): Promise<DemoSnapshot> {
  snapshotPromise ??= fetch(snapshotUrl)
    .then((response) => {
      if (!response.ok) {
        throw new QwenPawError(
          'protocol',
          `建模数据加载失败（HTTP ${response.status}）`,
        )
      }
      return response.json() as Promise<DemoSnapshot>
    })
    .then(prepareSnapshotForConversation)
  return snapshotPromise
}

function getSessionKey(
  agentId: string,
  projectUserId: string,
  sessionId: string,
): string {
  return `${projectUserId}:${agentId}:${sessionId}`
}

function createSession(request: QwenPawChatRequest): DemoSession {
  const now = new Date().toISOString()
  const chatId = `demo-chat:${crypto.randomUUID()}`
  const session: DemoSession = {
    agentId: request.agentId,
    chat: {
      id: chatId,
      name: request.agentId === 'ontology_qa'
        ? '本体问答'
        : '需求建模',
      session_id: request.session_id,
      user_id: request.user_id,
      channel: request.channel,
      created_at: now,
      updated_at: now,
      meta: { demo: true },
      status: 'running',
      pinned: false,
      source: 'chat',
    },
    messages: [],
    status: 'running',
  }
  sessionsByChatId.set(chatId, session)
  chatIdBySessionKey.set(
    getSessionKey(request.agentId, request.user_id, request.session_id),
    chatId,
  )
  return session
}

function getOrCreateSession(request: QwenPawChatRequest): DemoSession {
  const chatId = chatIdBySessionKey.get(
    getSessionKey(request.agentId, request.user_id, request.session_id),
  )
  const current = chatId ? sessionsByChatId.get(chatId) : undefined
  if (current) {
    current.status = 'running'
    current.chat.status = 'running'
    return current
  }
  return createSession(request)
}

function countCompletedTurns(session: DemoSession): number {
  return session.messages.filter((message) => (
    typeof message === 'object'
    && message !== null
    && 'role' in message
    && message.role === 'user'
  )).length
}

function buildFeatureReply(
  snapshot: DemoSnapshot,
  featureName: typeof FEATURE_SEQUENCE[number],
): DemoReply {
  const summary = snapshot.sourceArtifacts.features[featureName]?.summary
  return {
    text: [
      `**${featureName}建模完成**`,
      '',
      `- 已映射需求：${summary?.mappedRequirementCount ?? 0} 条`,
      `- 已收录六维 DSL 模型：${summary?.artifactCount ?? 0} 个（含 DialogMap）`,
      `- 测试映射记录：${summary?.testcaseMappingCount ?? 0} 条`,
      '- requirements、DSL 映射、对齐结果与测试用例映射已完成一致性校验。',
    ].join('\n'),
  }
}

function buildIngestionReply(
  snapshot: DemoSnapshot,
  stepIndex: number,
): DemoReply {
  const statistics = snapshot.manifest.statistics
  if (stepIndex === 0) {
    return {
      text: [
        '**文档条目化完成**',
        '',
        `已完成“${snapshot.manifest.sourceName}”文档解析与需求条目化：`,
        `- 已生成分块：${statistics.chunkCount} 个`,
        `- 已识别可建模功能：${statistics.functionalRequirementCount} 个`,
        '- 功能清单：在线音乐、在线电台、收音机、蓝牙音乐、U盘音乐',
        '- 项目级 includes 关系均保留原文证据。',
        '',
        '条目化结果已就绪，可以继续查看 chunks 结构化产物。',
      ].join('\n'),
    }
  }
  if (stepIndex === 1) {
    return {
      text: `\`\`\`chunks\n${JSON.stringify(snapshot.chunksEnvelope)}\n\`\`\``,
    }
  }
  if (stepIndex >= 2 && stepIndex < 2 + FEATURE_SEQUENCE.length) {
    return buildFeatureReply(snapshot, FEATURE_SEQUENCE[stepIndex - 2])
  }
  if (stepIndex === 7) {
    return {
      text: [
        '**DSL 产物查询完成**',
        '',
        `已装载 ${statistics.requirementCount} 个 requirement_id、${statistics.artifactCount} 个六维 DSL 模型（含 10 个 DialogMap）和 ${statistics.artifactRelationshipCount} 条需求到模型映射。`,
        '完整内容见下方结构化结果卡。',
      ].join('\n'),
      tool: {
        script: 'query_requirement_dsl_artifacts.py',
        output: snapshot.dslEnvelope,
      },
    }
  }
  if (stepIndex === 8) {
    return {
      text: [
        '**TTL 转换与一致性校验完成**',
        '',
        '- 已生成：requirement_ontology.ttl',
        `- 项目显式关系：${statistics.declaredRelationCount} 条`,
        '- Turtle 语法、命名空间和资源引用校验通过。',
        '- 需求、模型与关系数据已完成合并一致性检查。',
      ].join('\n'),
    }
  }
  if (stepIndex === 9) {
    return {
      text: [
        '**GraphDB 上传完成**',
        '',
        '- requirement_ontology.ttl 已导入目标仓库。',
        `- 已写入并校验 ${statistics.declaredRelationCount} 条项目显式关系。`,
        '- 仓库连接、命名空间及导入状态检查通过。',
        '本体数据已就绪，可以继续执行关系推理。',
      ].join('\n'),
    }
  }
  if (stepIndex === 10) {
    return {
      text: [
        '**本体关系推理完成**',
        '',
        `- 数据依赖：${statistics.inferredDependencyCount} 条`,
        `- 候选写冲突：${statistics.inferredConflictCount} 条`,
        `- 状态机问题：${statistics.stateMachineIssueCount} 条`,
        '- 推理结果及证据链已完成一致性校验。',
        '可以继续加载本体实例关系图查看完整关系。',
      ].join('\n'),
    }
  }
  if (stepIndex === 11) {
    return {
      text: '当前项目的本体实例关系图已生成，请在下方卡片中查看节点、关系及推理结果。',
      tool: {
        script: 'emit_ontology_instance_panel.py',
        output: snapshot.ontologyPanelEnvelope,
      },
    }
  }
  return {
    text: '**本轮需求建模与本体入库流程已完成。** 如需处理新的文档，请点击“新建对话”。',
  }
}

function buildQaReply(snapshot: DemoSnapshot, stepIndex: number): DemoReply {
  const statistics = snapshot.manifest.statistics
  if (stepIndex === 0) {
    return {
      text: [
        '**场景 9 本体推理完成**',
        '',
        `共识别 ${statistics.inferredDependencyCount} 条数据依赖、${statistics.inferredConflictCount} 条候选冲突和 ${statistics.stateMachineIssueCount} 条状态机问题。`,
        '推理结果已完成规则校验，下一步可查看完整证据和问题明细。',
      ].join('\n'),
    }
  }
  if (stepIndex === 1) {
    return {
      text: '场景 9 的完整推理结果如下，包含关系来源、推理规则、证据链和问题明细。',
      tool: {
        script: 'query_ontology_qa_results.py',
        output: snapshot.qaEnvelope,
      },
    }
  }
  if (stepIndex === 2) {
    return {
      text: [
        '**场景 10 蓝牙音乐关系查询完成**',
        '',
        '已汇总所有与“蓝牙音乐”相关的显式关系、推理依赖及候选冲突。',
        '查询结果已按关系类型和证据来源整理，下一步可查看完整关系明细。',
      ].join('\n'),
    }
  }
  if (stepIndex === 3) {
    return {
      text: '“蓝牙音乐”的完整功能关系如下，可查看关联功能、关系类型和推理证据。',
      tool: {
        script: 'query_function_relations.py',
        output: snapshot.functionRelationsEnvelope,
      },
    }
  }
  return {
    text: '**本轮本体推理与功能关系查询已完成。** 如需发起新的分析，请点击“新建对话”。',
  }
}

function createHistoryMessage(
  role: 'user' | 'assistant' | 'system',
  type: string,
  content: unknown[],
  originalId: string,
  createdAt: string,
): Record<string, unknown> {
  return {
    role,
    type,
    content,
    created_at: createdAt,
    status: 'completed',
    metadata: { original_id: originalId, timestamp: createdAt, demo: true },
  }
}

function createToolEvent(
  type: 'plugin_call' | 'plugin_call_output',
  callId: string,
  script: string,
  output?: Record<string, unknown>,
): QwenPawSseEvent {
  const data = type === 'plugin_call'
    ? {
        call_id: callId,
        name: 'execute_shell_command',
        arguments: { command: `python ${script}` },
      }
    : {
        call_id: callId,
        name: 'execute_shell_command',
        output: JSON.stringify(output),
      }
  return {
    object: 'message',
    type,
    id: `demo-tool:${callId}:${type}`,
    content: [{ type: 'data', data }],
  }
}

function buildHistoryRecords(
  request: QwenPawChatRequest,
  reply: DemoReply,
  callId: string,
  createdAt: string,
): unknown[] {
  const userContent: QwenPawContent[] = request.input[0]?.content ?? []
  const records: unknown[] = [createHistoryMessage(
    'user',
    'message',
    userContent,
    `demo-user:${crypto.randomUUID()}`,
    createdAt,
  )]
  if (reply.tool) {
    records.push(createHistoryMessage(
      'assistant',
      'plugin_call',
      [{
        type: 'data',
        data: {
          call_id: callId,
          name: 'execute_shell_command',
          arguments: { command: `python ${reply.tool.script}` },
        },
      }],
      `demo-call:${callId}`,
      createdAt,
    ))
    records.push(createHistoryMessage(
      'system',
      'plugin_call_output',
      [{
        type: 'data',
        data: {
          call_id: callId,
          name: 'execute_shell_command',
          output: JSON.stringify(reply.tool.output),
        },
      }],
      `demo-output:${callId}`,
      createdAt,
    ))
  }
  records.push(createHistoryMessage(
    'assistant',
    'message',
    [{ type: 'text', text: reply.text }],
    `demo-assistant:${crypto.randomUUID()}`,
    createdAt,
  ))
  return records
}

async function fetchDemoAgents(signal?: AbortSignal): Promise<QwenPawAgent[]> {
  assertNotAborted(signal)
  return DEMO_AGENTS
}

async function fetchDemoChats(
  agentId: string,
  filters?: QwenPawChatFilters,
  signal?: AbortSignal,
): Promise<QwenPawChatSpec[]> {
  assertNotAborted(signal)
  return [...sessionsByChatId.values()]
    .filter((session) => (
      session.agentId === agentId
      && (!filters?.userId || session.chat.user_id === filters.userId)
      && (!filters?.channel || session.chat.channel === filters.channel)
    ))
    .map((session) => ({ ...session.chat }))
}

async function fetchDemoChatHistory(
  agentId: string,
  chatId: string,
  signal?: AbortSignal,
): Promise<QwenPawChatHistory> {
  assertNotAborted(signal)
  const session = sessionsByChatId.get(chatId)
  if (!session || session.agentId !== agentId) {
    throw new QwenPawError('http', '会话不存在', { status: 404 })
  }
  return { messages: [...session.messages], status: session.status }
}

async function uploadDemoFile(
  agentId: string,
  file: File,
  signal?: AbortSignal,
): Promise<QwenPawUploadResponse> {
  assertNotAborted(signal)
  if (!DEMO_AGENTS.some((agent) => agent.id === agentId)) {
    throw new QwenPawError('protocol', 'Agent 不存在')
  }
  return {
    url: `demo-upload://${crypto.randomUUID()}/${encodeURIComponent(file.name)}`,
    file_name: file.name,
    size: file.size,
  }
}

async function* streamDemoChat(
  request: QwenPawChatRequest,
  signal: AbortSignal,
  onActivity?: () => void,
): AsyncGenerator<QwenPawSseEvent> {
  assertNotAborted(signal)
  const snapshot = await loadSnapshot()
  assertNotAborted(signal)
  const session = getOrCreateSession(request)
  const handleAbort = () => {
    session.status = 'idle'
    session.chat.status = 'idle'
  }
  signal.addEventListener('abort', handleAbort, { once: true })
  const stepIndex = countCompletedTurns(session)
  const script = request.agentId === 'ontology_qa'
    ? QA_SCRIPT
    : INGESTION_SCRIPT
  const step = script[Math.min(stepIndex, script.length - 1)]
  const reply = request.agentId === 'ontology_qa'
    ? buildQaReply(snapshot, step.index)
    : buildIngestionReply(snapshot, step.index)
  const messageId = `demo-message:${crypto.randomUUID()}`
  const callId = `demo-call:${request.session_id}:${step.id}`
  const streamDelayMs = getRandomStreamDelay()
  const emit = async (event: QwenPawSseEvent) => {
    await delay(streamDelayMs, signal)
    onActivity?.()
    return event
  }

  yield await emit({
    object: 'message',
    type: 'message',
    id: messageId,
    status: 'in_progress',
  })
  if (reply.tool) {
    yield await emit(createToolEvent(
      'plugin_call',
      callId,
      reply.tool.script,
    ))
    yield await emit(createToolEvent(
      'plugin_call_output',
      callId,
      reply.tool.script,
      reply.tool.output,
    ))
  }
  const previewLength = Math.min(48, Math.max(1, reply.text.length - 1))
  yield await emit({
    object: 'content',
    type: 'text',
    msg_id: messageId,
    index: 0,
    text: reply.text.slice(0, previewLength),
    delta: true,
    status: 'in_progress',
  })
  if (reply.text.length > previewLength) {
    yield await emit({
      object: 'content',
      type: 'text',
      msg_id: messageId,
      index: 0,
      text: reply.text.slice(previewLength, previewLength + 64),
      delta: true,
      status: 'in_progress',
    })
  }
  yield await emit({
    object: 'content',
    type: 'text',
    msg_id: messageId,
    index: 0,
    text: reply.text,
    delta: false,
    status: 'completed',
  })

  assertNotAborted(signal)
  const terminalEvent = await emit({
    object: 'response',
    status: 'completed',
    error: null,
  })
  assertNotAborted(signal)
  const now = new Date().toISOString()
  session.messages.push(...buildHistoryRecords(
    request,
    reply,
    callId,
    now,
  ))
  session.status = 'idle'
  session.chat.status = 'idle'
  session.chat.updated_at = now
  signal.removeEventListener('abort', handleAbort)
  yield terminalEvent
}

export const demoQwenPawTransport: QwenPawTransport = {
  fetchAgents: fetchDemoAgents,
  fetchChats: fetchDemoChats,
  fetchChatHistory: fetchDemoChatHistory,
  uploadFile: uploadDemoFile,
  streamChat: streamDemoChat,
}
