import { readFile, stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { randomUUID } from 'node:crypto'

const MIME_TYPES = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function readOption(name, fallback) {
  const optionIndex = process.argv.indexOf(name)
  return optionIndex >= 0 ? process.argv[optionIndex + 1] : fallback
}

function readOptions(name) {
  return process.argv.flatMap((value, index) =>
    value === name && process.argv[index + 1]
      ? [process.argv[index + 1]]
      : [])
}

async function readJson(response, endpoint) {
  const rawText = await response.text()
  if (!response.ok) {
    throw new Error(`${endpoint} failed: HTTP ${response.status}, ${rawText}`)
  }

  try {
    return JSON.parse(rawText)
  } catch {
    throw new Error(`${endpoint} returned invalid JSON`)
  }
}

function parseSse(rawText) {
  const events = []

  rawText.split(/\r?\n/).forEach((line) => {
    if (!line.startsWith('data:')) {
      return
    }

    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') {
      return
    }

    try {
      events.push(JSON.parse(payload))
    } catch {
      throw new Error(`SSE returned invalid JSON: ${payload.slice(0, 120)}`)
    }
  })

  const terminalEvent = events.findLast((event) =>
    event?.object === 'response'
    && (event.status === 'completed' || event.status === 'failed'))
  if (!terminalEvent) {
    throw new Error('SSE ended without a completed or failed response event')
  }

  return {
    eventCount: events.length,
    objects: [...new Set(events.map((event) => event?.object).filter(Boolean))],
    terminalStatus: terminalEvent.status,
  }
}

async function uploadFile(baseUrl, agentId, filePath) {
  const extension = extname(filePath).toLowerCase()
  const mimeType = MIME_TYPES[extension]
  if (!mimeType) {
    throw new Error(`Unsupported verification file: ${filePath}`)
  }

  const [bytes, fileStats] = await Promise.all([
    readFile(filePath),
    stat(filePath),
  ])
  const filename = basename(filePath)
  const formData = new FormData()
  formData.append('file', new Blob([bytes], { type: mimeType }), filename)

  const response = await fetch(`${baseUrl}/api/console/upload`, {
    method: 'POST',
    headers: { 'X-Agent-Id': agentId },
    body: formData,
    signal: AbortSignal.timeout(120000),
  })
  const uploaded = await readJson(response, 'upload')

  if (
    typeof uploaded.url !== 'string'
    || uploaded.file_name !== filename
    || uploaded.size !== fileStats.size
  ) {
    throw new Error(`Upload response mismatch for ${filename}`)
  }

  return {
    filename,
    localSize: fileStats.size,
    uploaded,
  }
}

async function sendChat(baseUrl, agentId, contents, label) {
  const sessionId = `baic-phase6-${Date.now()}-${randomUUID().slice(0, 8)}`
  const response = await fetch(`${baseUrl}/api/console/chat`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'X-Agent-Id': agentId,
    },
    body: JSON.stringify({
      input: [{ role: 'user', content: contents }],
      stream: true,
      session_id: sessionId,
      user_id: 'baic-phase6-verification',
      channel: 'console',
    }),
    signal: AbortSignal.timeout(180000),
  })

  if (!response.ok) {
    throw new Error(`${label} chat failed: HTTP ${response.status}`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream')) {
    throw new Error(`${label} chat returned ${contentType || 'no content type'}`)
  }

  const sse = parseSse(await response.text())
  return { sessionId, ...sse }
}

async function main() {
  const baseUrl = readOption('--base-url', 'http://localhost:7706')
    .replace(/\/+$/, '')
  const agentId = readOption('--agent', 'default')
  const filePaths = readOptions('--file')

  const [version, agents] = await Promise.all([
    fetch(`${baseUrl}/api/version`, {
      signal: AbortSignal.timeout(10000),
    }).then((response) => readJson(response, 'version')),
    fetch(`${baseUrl}/api/agents`, {
      signal: AbortSignal.timeout(10000),
    }).then((response) => readJson(response, 'agents')),
  ])

  if (!agents.agents?.some((agent) => agent.id === agentId && agent.enabled)) {
    throw new Error(`Enabled agent not found: ${agentId}`)
  }

  const textChat = await sendChat(baseUrl, agentId, [{
    type: 'text',
    text: '阶段六自动验收：请简短回复“文本链路正常”。',
  }], 'text')
  if (textChat.terminalStatus !== 'completed') {
    throw new Error(`Text chat ended with ${textChat.terminalStatus}`)
  }

  const files = []
  for (const filePath of filePaths) {
    const uploadedFile = await uploadFile(baseUrl, agentId, filePath)
    const chat = await sendChat(baseUrl, agentId, [
      {
        type: 'text',
        text: `阶段六自动验收：请确认已收到文件 ${uploadedFile.filename}。`,
      },
      {
        type: 'file',
        filename: uploadedFile.uploaded.file_name,
        file_url: uploadedFile.uploaded.url,
      },
    ], uploadedFile.filename)

    files.push({
      filename: uploadedFile.filename,
      size: uploadedFile.localSize,
      terminalStatus: chat.terminalStatus,
      eventCount: chat.eventCount,
      objects: chat.objects,
      sessionId: chat.sessionId,
    })
  }

  console.log(JSON.stringify({
    version: version.version,
    agentId,
    agentCount: agents.agents.length,
    textChat,
    files,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
