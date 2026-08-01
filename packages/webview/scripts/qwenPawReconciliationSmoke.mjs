import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
})
const {
  INITIAL_QWENPAW_CONVERSATION_STATE,
  qwenPawConversationReducer,
} = await server.ssrLoadModule(
  '/src/components/AgentWorkspace/qwenPaw/conversationReducer.ts',
)
const { readQwenPawSse } = await server.ssrLoadModule(
  '/src/components/AgentWorkspace/qwenPaw/qwenPawSse.ts',
)
const { shouldReconcileConversationHistory } = await server.ssrLoadModule(
  '/src/components/AgentWorkspace/qwenPaw/conversationReconciliation.ts',
)

const encoder = new TextEncoder()
const responseCompleted = {
  sequence_number: 3,
  object: 'response',
  status: 'completed',
}
const turnUsage = {
  type: 'turn_usage',
  session_id: 'reconciliation-smoke',
  usage: { total_tokens: 42 },
}
const body = new ReadableStream({
  start(controller) {
    controller.enqueue(encoder.encode(
      `data: ${JSON.stringify(responseCompleted)}\n\n`,
    ))
    controller.enqueue(encoder.encode(
      `data: ${JSON.stringify(turnUsage)}\n\n`,
    ))
    controller.close()
  },
})
const events = []
for await (const event of readQwenPawSse(body, new AbortController().signal)) {
  events.push(event)
}
assert.deepEqual(events, [responseCompleted, turnUsage])

const activeConversation = {
  kind: 'persisted',
  agentId: 'smoke-agent',
  chatId: 'smoke-chat',
  sessionId: 'smoke-session',
  userId: 'smoke-user',
  channel: 'console',
}
const userMessage = {
  id: 'local-user',
  role: 'user',
  parts: [{ type: 'text', text: 'spawn a child agent' }],
  transient: true,
  status: 'sending',
}
const assistantMessage = {
  id: 'local-assistant',
  role: 'assistant',
  parts: [{ type: 'text', text: '' }],
  transient: true,
  status: 'generating',
}
let state = qwenPawConversationReducer(INITIAL_QWENPAW_CONVERSATION_STATE, {
  type: 'activate',
  conversation: activeConversation,
})
state = qwenPawConversationReducer(state, {
  type: 'send_started',
  userMessage,
  assistantMessage,
})
assert.equal(state.status, 'generating')
state = qwenPawConversationReducer(state, {
  type: 'send_finalizing',
  userMessageId: userMessage.id,
  assistantMessageId: assistantMessage.id,
})
assert.equal(state.status, 'finalizing')
assert.equal(state.messages.at(-1)?.status, 'syncing')
state = qwenPawConversationReducer(state, {
  type: 'history_loaded',
  conversationKey: 'smoke-agent:chat:smoke-chat',
  messages: [],
})
assert.equal(state.status, 'finalizing')
state = qwenPawConversationReducer(state, {
  type: 'history_reconciled',
  messages: [{
    id: 'remote-assistant',
    role: 'assistant',
    parts: [{ type: 'text', text: 'done' }],
    status: 'completed',
  }],
})
assert.equal(state.status, 'completed')
assert.equal(state.messages.at(-1)?.id, 'remote-assistant')

assert.equal(shouldReconcileConversationHistory({
  historyStatus: 'running',
  historyMessageCount: 3,
  baselineHistoryCount: 2,
  observedRunning: true,
  terminalStatus: null,
}), false)
assert.equal(shouldReconcileConversationHistory({
  historyStatus: 'idle',
  historyMessageCount: 2,
  baselineHistoryCount: 2,
  observedRunning: false,
  terminalStatus: null,
}), false)
assert.equal(shouldReconcileConversationHistory({
  historyStatus: 'idle',
  historyMessageCount: 2,
  baselineHistoryCount: 2,
  observedRunning: true,
  terminalStatus: null,
}), true)
assert.equal(shouldReconcileConversationHistory({
  historyStatus: 'idle',
  historyMessageCount: 3,
  baselineHistoryCount: 2,
  observedRunning: false,
  terminalStatus: null,
}), true)
assert.equal(shouldReconcileConversationHistory({
  historyStatus: 'idle',
  historyMessageCount: 2,
  baselineHistoryCount: 2,
  observedRunning: false,
  terminalStatus: 'completed',
}), true)
assert.equal(shouldReconcileConversationHistory({
  historyStatus: 'idle',
  historyMessageCount: 3,
  baselineHistoryCount: 2,
  observedRunning: true,
  terminalStatus: 'failed',
}), false)

await server.close()
console.log('QwenPaw reconciliation smoke passed')
