import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { randomUUID } from 'node:crypto'

const ENTRY_AGENT_IDS = [
  'requirement_itemizer',
  'requirement_document_parse',
  'requirement_ontology_manager',
]

const TARGET_AGENT_IDS = [
  'requirement_itemizer',
  'requirement_index_parser',
  'requirement_document_extractor',
  'requirement_document_parse',
  'requirement_context_parse',
  'requirement_dsl_generator',
  'requirement_dsl_aligner',
  'requirement_testcase_generator',
  'requirement_ontology_manager',
  'requirement_ontology_parser',
  'requirement_ontology_uploader',
  'requirement_ontology_inferencer',
]

function readOption(name, fallback) {
  const optionIndex = process.argv.indexOf(name)
  return optionIndex >= 0 ? process.argv[optionIndex + 1] : fallback
}

async function readResponse(response) {
  const raw = await response.text()
  let body = raw
  try {
    body = JSON.parse(raw)
  } catch {
    // Error responses and SSE probes may legitimately be plain text.
  }
  return { status: response.status, body, raw }
}

async function fetchJson(url, init, label) {
  const response = await fetch(url, init)
  const result = await readResponse(response)
  if (!response.ok) {
    throw new Error(
      `${label} failed: HTTP ${response.status}, ${result.raw.slice(0, 500)}`,
    )
  }
  if (typeof result.body !== 'object' || result.body === null) {
    throw new Error(`${label} returned non-JSON content`)
  }
  return result.body
}

function parseSse(raw) {
  const events = []
  let dataLines = []

  const flush = () => {
    if (dataLines.length === 0) {
      return
    }
    const payload = dataLines.join('\n').trim()
    dataLines = []
    if (!payload || payload === '[DONE]') {
      return
    }
    events.push(JSON.parse(payload))
  }

  for (const line of raw.split(/\r?\n/)) {
    if (line === '') {
      flush()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }
  flush()

  const terminal = events.findLast(
    (event) =>
      event?.object === 'response'
      && (event.status === 'completed' || event.status === 'failed'),
  )
  return { events, terminal }
}

function collectEventSummary(events) {
  const eventKinds = new Set()
  const pluginCalls = new Map()
  const pluginOutputs = new Set()

  const findCallData = (value, seen = new WeakSet()) => {
    if (!value || typeof value !== 'object' || seen.has(value)) {
      return null
    }
    seen.add(value)
    if (
      typeof value.call_id === 'string'
      && typeof value.name === 'string'
    ) {
      return value
    }
    for (const child of Object.values(value)) {
      const found = findCallData(child, seen)
      if (found) {
        return found
      }
    }
    return null
  }

  for (const event of events) {
    const kind = [event?.object, event?.type, event?.status]
      .filter((value) => typeof value === 'string' && value)
      .join(':')
    if (kind) {
      eventKinds.add(kind)
    }

    const callData = findCallData(event)
    const callId = callData?.call_id
    const objectName = `${event?.object ?? ''} ${event?.type ?? ''}`.toLowerCase()
    if (typeof callId === 'string' && objectName.includes('plugin')) {
      if (objectName.includes('output')) {
        pluginOutputs.add(callId)
      } else if (objectName.includes('call')) {
        pluginCalls.set(callId, callData.name)
      }
    }
  }

  return {
    event_count: events.length,
    event_kinds: [...eventKinds],
    terminal_status: events.findLast(
      (event) =>
        event?.object === 'response'
        && (event.status === 'completed' || event.status === 'failed'),
    )?.status ?? null,
    plugin_call_ids: [...pluginCalls.keys()],
    plugin_output_ids: [...pluginOutputs],
    paired_plugin_call_ids: [...pluginCalls.keys()].filter((id) =>
      pluginOutputs.has(id)),
  }
}

async function sendChat({
  baseUrl,
  agentId,
  sessionId,
  userId,
  content,
  timeoutMs = 300000,
}) {
  const response = await fetch(`${baseUrl}/api/console/chat`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'X-Agent-Id': agentId,
    },
    body: JSON.stringify({
      input: [{ role: 'user', content }],
      stream: true,
      session_id: sessionId,
      user_id: userId,
      channel: 'console',
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const contentType = response.headers.get('content-type') ?? ''
  const raw = await response.text()
  if (!response.ok) {
    throw new Error(
      `chat ${agentId} failed: HTTP ${response.status}, ${raw.slice(0, 500)}`,
    )
  }
  const parsed = parseSse(raw)
  return {
    http_status: response.status,
    content_type: contentType,
    raw_bytes: Buffer.byteLength(raw),
    ...collectEventSummary(parsed.events),
  }
}

async function findRegisteredChat(baseUrl, agentId, userId, sessionId) {
  const query = new URLSearchParams({ user_id: userId, channel: 'console' })
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const chats = await fetchJson(
      `${baseUrl}/api/agents/${agentId}/chats?${query}`,
      { signal: AbortSignal.timeout(20000) },
      `filtered chats for ${agentId}`,
    )
    if (!Array.isArray(chats)) {
      throw new Error(`filtered chats for ${agentId} was not an array`)
    }
    const chat = chats.find((item) => item.session_id === sessionId)
    if (chat) {
      return { chat, attempts: attempt, filteredCount: chats.length }
    }
    await new Promise((resolve) => setTimeout(resolve, 750))
  }
  throw new Error(`ChatSpec registration not found for ${agentId}/${sessionId}`)
}

function inspectHistory(history) {
  const raw = JSON.stringify(history)
  const markers = {
    chunks: raw.includes('```chunks'),
    dsl_script: raw.includes('query_requirement_dsl_artifacts.py'),
    ontology_script: raw.includes('emit_ontology_instance_panel.py'),
    local_file_link: /(?:file:\/\/\/|href\\?":\\?"[A-Za-z]:\\\\)/iu.test(raw),
  }

  const interestingStrings = []
  const visit = (value) => {
    if (typeof value === 'string') {
      if (
        value.includes('```chunks')
        || value.includes('"protocol_version":"1.0"')
        || value.includes('"protocol_version": "1.0"')
      ) {
        interestingStrings.push(Buffer.byteLength(value))
      }
      return
    }
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(visit)
    }
  }
  visit(history)

  return {
    status: history.status ?? null,
    message_count: Array.isArray(history.messages)
      ? history.messages.length
      : null,
    history_bytes: Buffer.byteLength(raw),
    protocol_payload_bytes: interestingStrings.sort((a, b) => b - a),
    markers,
  }
}

async function uploadMarkdown(baseUrl, agentId, filePath) {
  const [bytes, fileStats] = await Promise.all([
    readFile(filePath),
    stat(filePath),
  ])
  const formData = new FormData()
  formData.append(
    'file',
    new Blob([bytes], { type: 'text/markdown' }),
    basename(filePath),
  )
  const uploaded = await fetchJson(
    `${baseUrl}/api/console/upload`,
    {
      method: 'POST',
      headers: { 'X-Agent-Id': agentId },
      body: formData,
      signal: AbortSignal.timeout(120000),
    },
    'Markdown upload',
  )
  return {
    response: uploaded,
    contract_matches:
      typeof uploaded.url === 'string'
      && uploaded.file_name === basename(filePath)
      && uploaded.size === fileStats.size,
  }
}

async function runSkillProbe({
  baseUrl,
  agentId,
  userId,
  sessionId,
  text,
}) {
  const sse = await sendChat({
    baseUrl,
    agentId,
    sessionId,
    userId,
    content: [{ type: 'text', text }],
  })
  const registration = await findRegisteredChat(
    baseUrl,
    agentId,
    userId,
    sessionId,
  )
  const history = await fetchJson(
    `${baseUrl}/api/agents/${agentId}/chats/${registration.chat.id}`,
    { signal: AbortSignal.timeout(30000) },
    `history for ${agentId}`,
  )
  return {
    session_id: sessionId,
    chat_spec_id: registration.chat.id,
    id_differs_from_session_id: registration.chat.id !== sessionId,
    registration_attempts: registration.attempts,
    sse,
    history: inspectHistory(history),
  }
}

async function main() {
  const baseUrl = readOption('--base-url', 'http://localhost:42112')
    .replace(/\/+$/, '')
  const projectRoot = readOption('--project-root')
  const uploadPath = readOption('--upload-file')
  if (!projectRoot || !uploadPath) {
    throw new Error('--project-root and --upload-file are required')
  }

  const runToken = `${Date.now()}-${randomUUID().slice(0, 8)}`
  const userId = `ontology-ingestion-smoke-${runToken}`
  const session = (suffix) => `ontology-ingestion-smoke-${runToken}-${suffix}`

  const [version, agentsResponse] = await Promise.all([
    fetchJson(
      `${baseUrl}/api/version`,
      { signal: AbortSignal.timeout(15000) },
      'version',
    ),
    fetchJson(
      `${baseUrl}/api/agents`,
      { signal: AbortSignal.timeout(15000) },
      'agents',
    ),
  ])
  const agents = Array.isArray(agentsResponse.agents)
    ? agentsResponse.agents
    : []
  const agentHealth = TARGET_AGENT_IDS.map((id) => {
    const agent = agents.find((item) => item.id === id)
    return {
      id,
      exists: Boolean(agent),
      enabled: agent?.enabled ?? null,
      active_model: agent?.active_model ?? null,
    }
  })

  const entryChats = {}
  for (const agentId of ENTRY_AGENT_IDS) {
    const chats = await fetchJson(
      `${baseUrl}/api/agents/${agentId}/chats`,
      { signal: AbortSignal.timeout(20000) },
      `chats for ${agentId}`,
    )
    entryChats[agentId] = {
      is_array: Array.isArray(chats),
      count: Array.isArray(chats) ? chats.length : null,
    }
  }

  const errorBodies = {}
  for (const [key, url] of Object.entries({
    missing_agent: `${baseUrl}/api/agents/ontology-ingestion-missing/chats`,
    missing_chat:
      `${baseUrl}/api/agents/requirement_itemizer/chats/ontology-ingestion-missing`,
  })) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const result = await readResponse(response)
    errorBodies[key] = {
      status: result.status,
      body: result.body,
    }
  }

  const textDataSession = session('text-data')
  const textData = await sendChat({
    baseUrl,
    agentId: 'requirement_itemizer',
    sessionId: textDataSession,
    userId,
    content: [
      {
        type: 'text',
        text: '第零阶段隔离契约冒烟：不要执行业务流水线，只简短回复“Text + Data 正常”。',
      },
      {
        type: 'data',
        data: {
          business_agent_id: 'ontology-ingestion',
          run_id: runToken,
          project_id: 'phase-zero-smoke',
          step_id: 'contract-smoke',
          job_id: 'text-data',
        },
      },
    ],
  })
  const textDataRegistration = await findRegisteredChat(
    baseUrl,
    'requirement_itemizer',
    userId,
    textDataSession,
  )
  const textDataHistory = await fetchJson(
    `${baseUrl}/api/agents/requirement_itemizer/chats/${textDataRegistration.chat.id}`,
    { signal: AbortSignal.timeout(30000) },
    'Text + Data history',
  )

  const upload = await uploadMarkdown(
    baseUrl,
    'requirement_itemizer',
    uploadPath,
  )
  const fileSession = session('text-file')
  const textFile = await sendChat({
    baseUrl,
    agentId: 'requirement_itemizer',
    sessionId: fileSession,
    userId,
    content: [
      {
        type: 'text',
        text: '第零阶段隔离契约冒烟：只确认已收到 Markdown，不执行业务流水线。',
      },
      {
        type: 'file',
        filename: upload.response.file_name,
        file_url: upload.response.url,
      },
    ],
  })

  const skillProbes = {
    chunks_summary: await runSkillProbe({
      baseUrl,
      agentId: 'requirement_itemizer',
      userId,
      sessionId: session('chunks-summary'),
      text:
        `请使用 $query-project-chunks 只读查询项目 ${projectRoot}，`
        + 'detail=summary。严格按 Skill 契约输出，不执行生成流水线。',
    }),
    chunks_full: await runSkillProbe({
      baseUrl,
      agentId: 'requirement_itemizer',
      userId,
      sessionId: session('chunks-full'),
      text:
        `请使用 $query-project-chunks 只读查询项目 ${projectRoot}，`
        + 'detail=full。严格按 Skill 契约输出，不执行生成流水线。',
    }),
    dsl_v1: await runSkillProbe({
      baseUrl,
      agentId: 'requirement_document_parse',
      userId,
      sessionId: session('dsl-v1'),
      text:
        `请使用 $query-requirement-dsl-artifacts 只读查询项目 ${projectRoot}。`
        + '严格按 Skill v1 契约输出，不执行任何生成或修复。',
    }),
    ontology_marker: await runSkillProbe({
      baseUrl,
      agentId: 'requirement_ontology_manager',
      userId,
      sessionId: session('ontology-marker'),
      text:
        '请使用 $query-project-ontology-instances 加载当前项目本体实例关系图。'
        + '只执行固定只读 marker，不查询或修改 GraphDB。',
    }),
  }

  const dataOnlySession = session('data-only')
  let dataOnlyProbe
  try {
    dataOnlyProbe = await sendChat({
      baseUrl,
      agentId: 'requirement_itemizer',
      sessionId: dataOnlySession,
      userId,
      content: [{
        type: 'data',
        data: { probe: 'missing-text-terminal-behavior' },
      }],
      timeoutMs: 30000,
    })
  } catch (error) {
    dataOnlyProbe = {
      error: error instanceof Error ? error.message : String(error),
    }
  }

  console.log(JSON.stringify({
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    version: version.version,
    user_id: userId,
    agent_count: agents.length,
    agent_health: agentHealth,
    entry_chats: entryChats,
    text_data: {
      session_id: textDataSession,
      chat_spec_id: textDataRegistration.chat.id,
      id_differs_from_session_id:
        textDataRegistration.chat.id !== textDataSession,
      sse: textData,
      history: inspectHistory(textDataHistory),
    },
    upload,
    text_file: textFile,
    skill_probes: skillProbes,
    error_bodies: {
      ...errorBodies,
      disabled_agent_403:
        'not induced because all target agents are enabled and phase zero must not mutate configuration',
      empty_registered_history:
        'not induced because it requires a registered ChatSpec whose backing session is absent',
    },
    data_only_missing_terminal_probe: dataOnlyProbe,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
