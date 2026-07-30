import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  fetchChatHistory,
  fetchChats,
} from '../qwenPaw/qwenPawClient'
import { normalizeMessages } from '../qwenPaw/normalizeMessages'
import type {
  ConversationMessageView,
} from '../qwenPaw/types'
import { extractFencedMessage } from '../ConversationWorkspace/fencedMessage/extractFencedMessage'
import { extractToolPanels } from '../ConversationWorkspace/toolMessage/extractToolPanels'
import { aggregateAgentTaskRuns } from './workflowRunIndex'
import type {
  AgentTaskRun,
  AgentTaskRunsState,
  ArtifactQueryBinding,
  BusinessAgentDefinition,
  EntryAgentChatsResult,
  WorkflowArtifact,
  WorkflowJob,
  WorkflowWarning,
} from './types'

const HISTORY_CONCURRENCY = 2
const RUN_INDEX_CACHE_MS = 30_000

interface CachedRunIndex {
  cachedAt: number
  results: EntryAgentChatsResult[]
}

const runIndexCache = new Map<string, CachedRunIndex>()

function bindingForFence(
  bindings: ArtifactQueryBinding[],
  handlerId: string,
): ArtifactQueryBinding | null {
  return bindings.find((binding) =>
    binding.delivery === 'assistant-fence'
    && binding.handlerId === handlerId) ?? null
}

function bindingForTool(
  bindings: ArtifactQueryBinding[],
  handlerId: string,
): ArtifactQueryBinding | null {
  return bindings.find((binding) =>
    binding.delivery !== 'assistant-fence'
    && binding.handlerId === handlerId) ?? null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isReadyToolPayload(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false
  }
  if (payload.state === undefined) {
    return true
  }
  return payload.state === 'success' || payload.state === 'ready'
}

function inferVariantId(
  binding: ArtifactQueryBinding,
  payload: unknown,
): string | undefined {
  if (!isRecord(payload) || typeof payload.detail !== 'string') {
    return undefined
  }
  return binding.variants?.find((variant) =>
    variant.detail === payload.detail)?.id
}

export function resolveWorkflowArtifacts(
  definition: BusinessAgentDefinition,
  job: WorkflowJob,
  messages: ConversationMessageView[],
): WorkflowArtifact[] {
  const bindings = definition.artifactQueries.filter((binding) =>
    binding.stepId === job.stepId
    && binding.entryAgentId === job.entryAgentId)
  const resolved = new Map<string, WorkflowArtifact>()
  const chatSpec = job.chatSpec
  if (!chatSpec) {
    return []
  }

  messages.forEach((message) => {
    const fenced = extractFencedMessage(message)
    fenced.blocks.forEach((block) => {
      const binding = bindingForFence(bindings, block.handler.keyword)
      if (
        !binding
        || (isRecord(block.payload) && block.payload.status === 'error')
      ) {
        return
      }

      const variantId = inferVariantId(binding, block.payload)
      const artifactId = variantId
        ? `${binding.id}:${variantId}`
        : binding.id
      resolved.set(artifactId, {
        id: artifactId,
        jobId: job.id,
        kind: binding.handlerId,
        name: binding.variants?.find((variant) => variant.id === variantId)
          ?.label ?? binding.id,
        status: 'ready',
        queryBindingId: binding.id,
        payloadKey: binding.handlerId,
        source: {
          chatSpecId: chatSpec.id,
          sessionId: chatSpec.session_id,
          messageId: message.id,
          partKey: `fence:${block.partIndex}:${block.blockIndex}`,
          handlerId: binding.handlerId,
          queryBindingId: binding.id,
          variantId,
        },
      })
    })

    extractToolPanels(message).forEach((panel) => {
      const binding = bindingForTool(bindings, panel.handler.id)
      if (!binding || !isReadyToolPayload(panel.payload)) {
        return
      }

      resolved.set(binding.id, {
        id: binding.id,
        jobId: job.id,
        kind: binding.handlerId,
        name: binding.id,
        status: 'ready',
        queryBindingId: binding.id,
        payloadKey: binding.handlerId,
        source: {
          chatSpecId: chatSpec.id,
          sessionId: chatSpec.session_id,
          messageId: message.id,
          partKey: `tool:${panel.partIndex}:${panel.callId}`,
          handlerId: binding.handlerId,
          queryBindingId: binding.id,
        },
      })
    })
  })

  return [...resolved.values()]
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0

  const runWorker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(values[index])
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, values.length) },
      () => runWorker(),
    ),
  )
  return results
}

interface HydratedJobResult {
  job: WorkflowJob
  artifacts: WorkflowArtifact[]
  warnings: WorkflowWarning[]
}

async function hydrateJob(
  definition: BusinessAgentDefinition,
  job: WorkflowJob,
  signal: AbortSignal,
): Promise<HydratedJobResult> {
  const chat = job.chatSpec
  if (!chat) {
    return {
      job: {
        ...job,
        status: 'unrecoverable',
        historyState: 'error',
        error: 'Job 没有已登记 ChatSpec',
      },
      artifacts: [],
      warnings: [{
        code: 'chat-spec-missing',
        message: `Job ${job.id} 没有已登记 ChatSpec。`,
        jobId: job.id,
      }],
    }
  }

  try {
    const history = await fetchChatHistory(
      job.entryAgentId,
      chat.id,
      signal,
    )
    if (history.messages.length === 0) {
      return {
        job: {
          ...job,
          history,
          messages: [],
          status: 'unrecoverable',
          historyState: 'empty',
          error: 'ChatSpec 已登记，但历史为空或尚未落盘',
        },
        artifacts: [],
        warnings: [{
          code: 'empty-chat-history',
          message: `Job ${job.id} 的 ChatSpec 已登记，但历史为空。`,
          jobId: job.id,
          chatSpecId: chat.id,
        }],
      }
    }

    const messages = normalizeMessages(history.messages, chat.id)
    return {
      job: {
        ...job,
        history,
        messages,
        historyState: 'ready',
      },
      artifacts: resolveWorkflowArtifacts(definition, job, messages),
      warnings: [],
    }
  } catch (error) {
    if (signal.aborted) {
      throw error
    }
    const message = error instanceof Error ? error.message : '历史加载失败'
    return {
      job: {
        ...job,
        historyState: 'error',
        error: message,
      },
      artifacts: [],
      warnings: [{
        code: 'chat-history-load-failed',
        message: `Job ${job.id} 历史加载失败：${message}`,
        jobId: job.id,
        chatSpecId: chat.id,
      }],
    }
  }
}

async function loadRunIndex(
  definition: BusinessAgentDefinition,
  projectId: string,
  signal: AbortSignal,
  force: boolean,
): Promise<EntryAgentChatsResult[]> {
  const cacheKey = `${projectId}:${definition.id}`
  const cached = runIndexCache.get(cacheKey)
  if (
    !force
    && cached
    && Date.now() - cached.cachedAt < RUN_INDEX_CACHE_MS
  ) {
    return cached.results
  }

  const settled = await Promise.allSettled(
    definition.entryAgentIds.map(async (agentId) => ({
      agentId,
      chats: await fetchChats(agentId, undefined, signal),
    })),
  )
  const results = settled.map((result, index): EntryAgentChatsResult => {
    const agentId = definition.entryAgentIds[index]
    if (result.status === 'fulfilled') {
      return result.value
    }
    return {
      agentId,
      chats: [],
      error:
        result.reason instanceof Error
          ? result.reason.message
          : '会话索引加载失败',
    }
  })
  if (!signal.aborted) {
    runIndexCache.set(cacheKey, {
      cachedAt: Date.now(),
      results,
    })
  }
  return results
}

const EMPTY_STATE: AgentTaskRunsState = {
  runs: [],
  selectedRun: null,
  loading: false,
  detailLoading: false,
  error: null,
  historyIncomplete: false,
}

export function useAgentTaskRuns(
  projectId: string | null,
  definition: BusinessAgentDefinition,
) {
  const [state, setState] = useState<AgentTaskRunsState>(EMPTY_STATE)
  const [reloadVersion, setReloadVersion] = useState(0)
  const indexRequestIdRef = useRef(0)
  const detailRequestIdRef = useRef(0)
  const detailControllerRef = useRef<AbortController | null>(null)
  const forceReloadRef = useRef(false)

  const reload = useCallback(() => {
    forceReloadRef.current = true
    setReloadVersion((version) => version + 1)
  }, [])

  const clearSelection = useCallback(() => {
    detailControllerRef.current?.abort()
    detailRequestIdRef.current += 1
    setState((current) => ({
      ...current,
      selectedRun: null,
      detailLoading: false,
    }))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const requestId = indexRequestIdRef.current + 1
    indexRequestIdRef.current = requestId
    detailControllerRef.current?.abort()
    detailRequestIdRef.current += 1

    if (!projectId) {
      setState(EMPTY_STATE)
      return () => controller.abort()
    }

    setState({
      ...EMPTY_STATE,
      loading: true,
    })
    const force = forceReloadRef.current
    forceReloadRef.current = false

    void loadRunIndex(definition, projectId, controller.signal, force)
      .then((results) => {
        if (
          controller.signal.aborted
          || indexRequestIdRef.current !== requestId
        ) {
          return
        }
        const runs = aggregateAgentTaskRuns(definition, projectId, results)
        setState({
          runs,
          selectedRun: null,
          loading: false,
          detailLoading: false,
          error: null,
          historyIncomplete: results.some((result) => Boolean(result.error)),
        })
      })
      .catch((error: unknown) => {
        if (
          controller.signal.aborted
          || indexRequestIdRef.current !== requestId
        ) {
          return
        }
        setState({
          ...EMPTY_STATE,
          error: error instanceof Error ? error.message : '任务索引加载失败',
        })
      })

    return () => controller.abort()
  }, [definition, projectId, reloadVersion])

  const selectRun = useCallback((runId: string | null) => {
    detailControllerRef.current?.abort()
    const requestId = detailRequestIdRef.current + 1
    detailRequestIdRef.current = requestId

    if (!runId) {
      setState((current) => ({
        ...current,
        selectedRun: null,
        detailLoading: false,
      }))
      return
    }

    const run = state.runs.find((candidate) => candidate.runId === runId)
    if (!run) {
      return
    }

    const controller = new AbortController()
    detailControllerRef.current = controller
    setState((current) => ({
      ...current,
      selectedRun: {
        ...run,
        jobs: run.jobs.map((job) => ({
          ...job,
          historyState: 'loading',
        })),
      },
      detailLoading: true,
    }))

    void mapWithConcurrency(
      run.jobs,
      HISTORY_CONCURRENCY,
      (job) => hydrateJob(definition, job, controller.signal),
    ).then((hydratedJobs) => {
      if (
        controller.signal.aborted
        || detailRequestIdRef.current !== requestId
      ) {
        return
      }

      const hydratedRun: AgentTaskRun = {
        ...run,
        jobs: hydratedJobs.map((result) => result.job),
        artifacts: hydratedJobs.flatMap((result) => result.artifacts),
        warnings: [
          ...run.warnings,
          ...hydratedJobs.flatMap((result) => result.warnings),
        ],
        historyIncomplete:
          run.historyIncomplete
          || hydratedJobs.some((result) =>
            result.job.historyState === 'error'
            || result.job.historyState === 'empty'),
      }
      setState((current) => ({
        ...current,
        runs: current.runs.map((candidate) =>
          candidate.runId === hydratedRun.runId ? hydratedRun : candidate),
        selectedRun: hydratedRun,
        detailLoading: false,
      }))
    }).catch((error: unknown) => {
      if (
        controller.signal.aborted
        || detailRequestIdRef.current !== requestId
      ) {
        return
      }
      setState((current) => ({
        ...current,
        detailLoading: false,
        error: error instanceof Error ? error.message : '任务详情加载失败',
      }))
    })
  }, [definition, state.runs])

  return {
    ...state,
    reload,
    selectRun,
    clearSelection,
  }
}
