import { randomUUID } from 'node:crypto'
import { build } from 'esbuild'

const source = `
  export {
    buildWorkflowUserId,
    createWorkflowIdentity,
  } from './packages/webview/src/components/AgentWorkspace/workflowCore/workflowIdentity.ts'
  export {
    getBusinessAgentHealth,
    listBusinessAgents,
    validateBusinessAgentDefinition,
  } from './packages/webview/src/components/AgentWorkspace/workflowCore/registry.ts'
  export {
    workflowReducer,
  } from './packages/webview/src/components/AgentWorkspace/workflowCore/workflowReducer.ts'
  export {
    aggregateAgentTaskRuns,
  } from './packages/webview/src/components/AgentWorkspace/workflowCore/workflowRunIndex.ts'
  export {
    singleStepFixtureDefinition,
    twoStepFixtureDefinition,
  } from './packages/webview/src/components/AgentWorkspace/workflowCore/fixtures.ts'
  export {
    ontologyIngestionDefinition,
  } from './packages/webview/src/components/AgentWorkspace/workflows/ontologyIngestion/definition.ts'
`

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function readOption(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function createChat({
  id,
  agentId,
  userId,
  sessionId,
  createdAt,
  updatedAt = createdAt,
}) {
  return {
    agentId,
    chat: {
      id,
      name: '第一阶段聚合验证',
      session_id: sessionId,
      user_id: userId,
      channel: 'console',
      created_at: createdAt,
      updated_at: updatedAt,
      meta: {},
      status: 'idle',
      pinned: false,
      source: 'chat',
    },
  }
}

async function loadWorkflowCore() {
  const result = await build({
    stdin: {
      contents: source,
      resolveDir: process.cwd(),
      sourcefile: 'workflow-phase1-smoke-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    write: false,
    logLevel: 'silent',
  })
  const code = result.outputFiles[0].text
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}

function parseSse(raw) {
  const events = raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]')
    .map((line) => JSON.parse(line))
  return events.findLast((event) =>
    event?.object === 'response'
    && (event.status === 'completed' || event.status === 'failed'))
}

async function sendLiveChat(
  baseUrl,
  agentId,
  sessionId,
  userId,
  job,
) {
  const response = await fetch(`${baseUrl}/api/console/chat`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'X-Agent-Id': agentId,
    },
    body: JSON.stringify({
      input: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: '第一阶段隔离聚合冒烟：不要执行业务流水线，只回复身份已登记。',
          },
          {
            type: 'data',
            data: {
              business_agent_id: 'ontology-ingestion',
              run_id: job.runId,
              project_id: job.projectId,
              step_id: job.stepId,
              job_id: job.jobId,
            },
          },
        ],
      }],
      stream: true,
      session_id: sessionId,
      user_id: userId,
      channel: 'console',
    }),
    signal: AbortSignal.timeout(180000),
  })
  const raw = await response.text()
  assert(response.ok, `${agentId} live chat HTTP ${response.status}`)
  assert(
    response.headers.get('content-type')?.includes('text/event-stream'),
    `${agentId} live chat content type`,
  )
  const terminal = parseSse(raw)
  assert(
    terminal?.status === 'completed' || terminal?.status === 'failed',
    `${agentId} response terminal missing, ${Buffer.byteLength(raw)} bytes`,
  )
  return {
    agent_id: agentId,
    session_id: sessionId,
    terminal_status: terminal.status,
  }
}

async function loadRegisteredChats(baseUrl, agentId, userId) {
  const query = new URLSearchParams({ user_id: userId, channel: 'console' })
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(
      `${baseUrl}/api/agents/${agentId}/chats?${query}`,
      { signal: AbortSignal.timeout(20000) },
    )
    assert(response.ok, `${agentId} filtered chats HTTP ${response.status}`)
    const chats = await response.json()
    assert(Array.isArray(chats), `${agentId} filtered chats was not an array`)
    if (chats.length > 0) {
      return chats
    }
    await new Promise((resolve) => setTimeout(resolve, 750))
  }
  throw new Error(`${agentId} ChatSpec registration was not found`)
}

async function runLiveSmoke(core, definition, baseUrl) {
  const projectId = 'ontology-ingestion-phase1-live-smoke'
  const runId = randomUUID()
  const userId = core.buildWorkflowUserId(projectId, definition.id, runId)
  const jobs = [
    {
      agentId: 'requirement_itemizer',
      jobId: 'itemize',
      stepId: 'itemization',
      order: 0,
    },
    {
      agentId: 'requirement_document_parse',
      jobId: 'model:feature-a',
      stepId: 'function-modeling',
      functionKey: 'feature-a',
      order: 1,
    },
    {
      agentId: 'requirement_document_parse',
      jobId: 'model:feature-b',
      stepId: 'function-modeling',
      functionKey: 'feature-b',
      order: 2,
    },
    {
      agentId: 'requirement_ontology_manager',
      jobId: 'ontology',
      stepId: 'ontology',
      order: 3,
    },
  ]

  const requestTerminals = []
  for (const job of jobs) {
    requestTerminals.push(await sendLiveChat(
      baseUrl,
      job.agentId,
      definition.identity.buildSessionId(runId, job),
      userId,
      { ...job, projectId, runId },
    ))
  }

  const results = []
  for (const agentId of definition.entryAgentIds) {
    results.push({
      agentId,
      chats: await loadRegisteredChats(baseUrl, agentId, userId),
    })
  }
  const runs = core.aggregateAgentTaskRuns(definition, projectId, results)
  assert(runs.length === 1, 'live Run aggregation failed')
  assert(runs[0].jobs.length === 4, 'live Job aggregation failed')

  const histories = []
  for (let offset = 0; offset < runs[0].jobs.length; offset += 2) {
    const batch = runs[0].jobs.slice(offset, offset + 2)
    histories.push(...await Promise.all(batch.map(async (job) => {
      assert(
        job.chatSpec.id !== job.chatSpec.session_id,
        `${job.id} ChatSpec id was confused with session_id`,
      )
      const response = await fetch(
        `${baseUrl}/api/agents/${job.entryAgentId}/chats/${job.chatSpec.id}`,
        { signal: AbortSignal.timeout(30000) },
      )
      assert(response.ok, `${job.id} history HTTP ${response.status}`)
      const history = await response.json()
      assert(Array.isArray(history.messages), `${job.id} history messages`)
      return {
        job_id: job.id,
        chat_spec_id: job.chatSpec.id,
        session_id: job.chatSpec.session_id,
        message_count: history.messages.length,
      }
    })))
  }

  return {
    base_url: baseUrl,
    project_id: projectId,
    run_id: runId,
    user_id: userId,
    job_count: runs[0].jobs.length,
    request_terminals: requestTerminals,
    histories,
  }
}

async function main() {
  const core = await loadWorkflowCore()
  const definition = core.ontologyIngestionDefinition
  const projectId = 'phase-1-project'
  const runId = '11111111-2222-4333-8444-555555555555'
  const userId = core.buildWorkflowUserId(projectId, definition.id, runId)

  assert(
    core.listBusinessAgents().some((item) => item.id === definition.id),
    'ontology definition was not registered',
  )
  core.validateBusinessAgentDefinition(definition)
  core.validateBusinessAgentDefinition(core.singleStepFixtureDefinition)
  core.validateBusinessAgentDefinition(core.twoStepFixtureDefinition)
  assert(core.singleStepFixtureDefinition.steps.length === 1, 'single fixture')
  assert(core.twoStepFixtureDefinition.steps.length === 2, 'two-step fixture')

  for (const fixture of [
    core.singleStepFixtureDefinition,
    core.twoStepFixtureDefinition,
  ]) {
    for (const [order, step] of fixture.steps.entries()) {
      const job = { jobId: step.id, stepId: step.id, order }
      const sessionId = fixture.identity.buildSessionId(runId, job)
      const parsed = fixture.identity.parseSessionId(sessionId, runId)
      assert(parsed?.jobId === job.jobId, `${fixture.id} identity roundtrip`)
    }
  }

  const indexedChats = [
    createChat({
      id: 'itemize-old',
      agentId: 'requirement_itemizer',
      userId,
      sessionId: definition.identity.buildSessionId(runId, {
        jobId: 'itemize',
        stepId: 'itemization',
        order: 0,
      }),
      createdAt: '2026-07-30T01:00:00.000Z',
      updatedAt: '2026-07-30T01:01:00.000Z',
    }),
    createChat({
      id: 'itemize-new',
      agentId: 'requirement_itemizer',
      userId,
      sessionId: definition.identity.buildSessionId(runId, {
        jobId: 'itemize',
        stepId: 'itemization',
        order: 0,
      }),
      createdAt: '2026-07-30T01:00:00.000Z',
      updatedAt: '2026-07-30T01:02:00.000Z',
    }),
    createChat({
      id: 'model-a',
      agentId: 'requirement_document_parse',
      userId,
      sessionId: definition.identity.buildSessionId(runId, {
        jobId: 'model:feature-a',
        stepId: 'function-modeling',
        functionKey: 'feature-a',
        order: 1,
      }),
      createdAt: '2026-07-30T01:03:00.000Z',
    }),
    createChat({
      id: 'model-b',
      agentId: 'requirement_document_parse',
      userId,
      sessionId: definition.identity.buildSessionId(runId, {
        jobId: 'model:feature-b',
        stepId: 'function-modeling',
        functionKey: 'feature-b',
        order: 2,
      }),
      createdAt: '2026-07-30T01:04:00.000Z',
    }),
    createChat({
      id: 'ontology',
      agentId: 'requirement_ontology_manager',
      userId,
      sessionId: definition.identity.buildSessionId(runId, {
        jobId: 'ontology',
        stepId: 'ontology',
        order: 3,
      }),
      createdAt: '2026-07-30T01:05:00.000Z',
    }),
    createChat({
      id: 'other-business-agent',
      agentId: 'requirement_itemizer',
      userId: `baic-project:${projectId}:agent:other-agent:run:${runId}`,
      sessionId: 'baic-agent:other-agent:run:execute',
      createdAt: '2026-07-30T01:06:00.000Z',
    }),
  ]

  const byAgent = definition.entryAgentIds.map((agentId) => ({
    agentId,
    chats: indexedChats
      .filter((item) => item.agentId === agentId)
      .map((item) => item.chat),
  }))
  const runs = core.aggregateAgentTaskRuns(definition, projectId, byAgent)
  assert(runs.length === 1, 'business-agent isolation failed')
  assert(runs[0].jobs.length === 4, 'duplicate session was not removed')
  assert(
    runs[0].jobs.map((job) => job.id).join(',') ===
      'itemize,model:feature-a,model:feature-b,ontology',
    'job order or identity parsing failed',
  )
  assert(
    runs[0].jobs.every((job) => job.status === 'registered'),
    'ChatSpec status was incorrectly used as business status',
  )
  assert(
    runs[0].warnings.some((warning) => warning.code === 'duplicate-session'),
    'duplicate session warning missing',
  )

  const partialRuns = core.aggregateAgentTaskRuns(
    definition,
    projectId,
    byAgent.map((result) =>
      result.agentId === 'requirement_ontology_manager'
        ? { ...result, chats: [], error: 'controlled failure' }
        : result),
  )
  assert(partialRuns[0].historyIncomplete, 'partial history was not preserved')
  assert(partialRuns[0].jobs.length === 3, 'successful entry data was discarded')

  const agents = definition.requiredAgentIds.map((id) => ({
    id,
    name: id,
    description: id,
    enabled: true,
    active_model: { provider_id: 'fixture', model: 'fixture' },
  }))
  const healthy = core.getBusinessAgentHealth(definition, agents, 'online')
  const blocked = core.getBusinessAgentHealth(
    definition,
    agents.filter((agent) => agent.id !== 'requirement_ontology_parser'),
    'online',
  )
  assert(healthy.available, 'healthy definition was blocked')
  assert(!blocked.available, 'missing dependency did not block definition')
  assert(
    blocked.dependencies.filter((item) => !item.available).length === 1,
    'health check was not scoped to the current definition',
  )

  const reducerRun = {
    ...runs[0],
    jobs: runs[0].jobs.map((job, index) =>
      index === 0 ? { ...job, requestId: 'request-1' } : job),
  }
  const targetJob = reducerRun.jobs[0]
  const accepted = core.workflowReducer(reducerRun, {
    type: 'retry_job',
    identity: {
      businessAgentId: definition.id,
      runId,
      jobId: targetJob.id,
      requestId: 'request-1',
    },
  })
  const ignored = core.workflowReducer(reducerRun, {
    type: 'retry_job',
    identity: {
      businessAgentId: definition.id,
      runId,
      jobId: targetJob.id,
      requestId: 'stale-request',
    },
  })
  assert(accepted.jobs[0].status === 'queued', 'valid reducer event rejected')
  assert(ignored === reducerRun, 'stale reducer event was not ignored')

  const liveBaseUrl = readOption('--live-base-url')?.replace(/\/+$/, '')
  const live = liveBaseUrl
    ? await runLiveSmoke(core, definition, liveBaseUrl)
    : null

  console.log(JSON.stringify({
    registered_business_agents: core.listBusinessAgents().map((item) => item.id),
    fixture_step_counts: [
      core.singleStepFixtureDefinition.steps.length,
      core.twoStepFixtureDefinition.steps.length,
    ],
    aggregated_run_count: runs.length,
    aggregated_job_ids: runs[0].jobs.map((job) => job.id),
    duplicate_warning: true,
    partial_history_preserved: true,
    healthy_dependency_count: healthy.dependencies.length,
    missing_dependency_blocked: true,
    stale_request_ignored: true,
    live,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
