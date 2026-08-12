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
    description: '按固定脚本回放多媒体中心需求条目化、DSL 建模与本体管理流程。',
    enabled: true,
    active_model: { provider_id: 'demo', model: 'snapshot-replay' },
  },
  {
    id: 'ontology_qa',
    name: '本体问答智能体',
    description: '按固定脚本回放多媒体中心本体推理和功能关系查询结果。',
    enabled: true,
    active_model: { provider_id: 'demo', model: 'snapshot-replay' },
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
  throw new QwenPawError('abort', 'Demo 请求已取消', { cause: signal.reason })
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
      reject(new QwenPawError('abort', 'Demo 请求已取消', {
        cause: signal.reason,
      }))
    }
    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

function loadSnapshot(): Promise<DemoSnapshot> {
  snapshotPromise ??= fetch(snapshotUrl)
    .then((response) => {
      if (!response.ok) {
        throw new QwenPawError(
          'protocol',
          `Demo 快照加载失败（HTTP ${response.status}）`,
        )
      }
      return response.json() as Promise<DemoSnapshot>
    })
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
        ? '多媒体中心本体问答 Demo'
        : '多媒体中心建模 Demo',
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
      `**Demo 回放 · ${featureName}建模完成**`,
      '',
      `- 已映射需求：${summary?.mappedRequirementCount ?? 0} 条`,
      `- 已收录六维 DSL 模型：${summary?.artifactCount ?? 0} 个（含 DialogMap）`,
      `- 测试映射记录：${summary?.testcaseMappingCount ?? 0} 条`,
      '- 已读取 requirements、DSL 映射、对齐结果与测试用例映射快照。',
      '- 本次仅回放既有产物，没有执行脚本或修改项目文件。',
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
        '**Demo 回放 · 文档条目化完成**',
        '',
        `已载入“${snapshot.manifest.sourceName}”真实产物快照：`,
        `- 分块总数：${statistics.chunkCount}`,
        `- 可建模功能：${statistics.functionalRequirementCount}`,
        '- 功能清单：在线音乐、在线电台、收音机、蓝牙音乐、U盘音乐',
        '- 项目级 includes 关系均保留原文证据。',
        '',
        '本次没有调用 QwenPaw，也没有重新解析或写入文件。请继续查询 chunks 产物。',
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
        '**Demo 回放 · DSL 产物查询完成**',
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
        '**Demo 回放 · TTL 转换与本地校验完成**',
        '',
        '- 快照产物：requirement_ontology.ttl',
        `- 项目显式关系：${statistics.declaredRelationCount} 条`,
        '- Turtle 与关系合并报告均来自已完成流程产物。',
        '- 未连接 GraphDB，未上传或修改仓库。',
      ].join('\n'),
    }
  }
  if (stepIndex === 9) {
    return {
      text: [
        '**Demo 回放 · GraphDB 上传步骤**',
        '',
        '已回放历史流程中的上传确认与校验摘要。Demo 模式不会执行真实上传、清库、覆盖 TBox/SHACL 或推理操作。',
        '如需查看关系图，下一个步骤仍会通过现有只读接口访问当前 GraphDB。',
      ].join('\n'),
    }
  }
  if (stepIndex === 10) {
    return {
      text: [
        '**Demo 回放 · 本体关系推理完成**',
        '',
        `- 数据依赖：${statistics.inferredDependencyCount} 条`,
        `- 候选写冲突：${statistics.inferredConflictCount} 条`,
        `- 状态机问题：${statistics.stateMachineIssueCount} 条`,
        '- 结论来自 inference_results.ttl 与 inference_report.md 快照。',
        '- Demo 模式没有执行 GraphDB 推理。',
      ].join('\n'),
    }
  }
  if (stepIndex === 11) {
    return {
      text: '已准备当前项目本体实例关系图。下方卡片仍使用现有只读接口实时加载 GraphDB。',
      tool: {
        script: 'emit_ontology_instance_panel.py',
        output: snapshot.ontologyPanelEnvelope,
      },
    }
  }
  return {
    text: '**Demo 流程已完成。** 请点击“新建对话”从文档条目化重新开始。',
  }
}

function buildQaReply(snapshot: DemoSnapshot, stepIndex: number): DemoReply {
  const statistics = snapshot.manifest.statistics
  if (stepIndex === 0) {
    return {
      text: [
        '**Demo 回放 · 场景 9 本体推理完成**',
        '',
        `已读取真实快照：${statistics.inferredDependencyCount} 条数据依赖、${statistics.inferredConflictCount} 条候选冲突、${statistics.stateMachineIssueCount} 条状态机问题。`,
        'Demo 模式不会连接 GraphDB 或执行推理；下一步可查看完整结构化结果。',
      ].join('\n'),
    }
  }
  if (stepIndex === 1) {
    return {
      text: '已读取场景 9 的完整真实推理结果快照。',
      tool: {
        script: 'query_ontology_qa_results.py',
        output: snapshot.qaEnvelope,
      },
    }
  }
  if (stepIndex === 2) {
    return {
      text: [
        '**Demo 回放 · 场景 10 蓝牙音乐关系查询完成**',
        '',
        '已从 requirement_relations.json 与 inference_results.ttl 快照中筛选所有与“蓝牙音乐”相关的显式及推理关系。',
        '本次没有查询或修改 GraphDB；下一步可查看完整关系结果卡。',
      ].join('\n'),
    }
  }
  if (stepIndex === 3) {
    return {
      text: '已读取“蓝牙音乐”完整关系结果快照。',
      tool: {
        script: 'query_function_relations.py',
        output: snapshot.functionRelationsEnvelope,
      },
    }
  }
  return {
    text: '**Demo 流程已完成。** 请点击“新建对话”重新开始场景 9/10 回放。',
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
    throw new QwenPawError('http', 'Demo 会话不存在', { status: 404 })
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
    throw new QwenPawError('protocol', 'Demo Agent 不存在')
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
  const emit = async (event: QwenPawSseEvent) => {
    await delay(90, signal)
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
