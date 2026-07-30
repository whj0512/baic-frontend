import type { QwenPawChatSpec } from '../qwenPaw/types'
import { parseWorkflowUserId } from './workflowIdentity'
import type {
  AgentTaskRun,
  BusinessAgentDefinition,
  EntryAgentChatsResult,
  WorkflowJob,
  WorkflowWarning,
} from './types'

function getTimestamp(value: string): number {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

function maxDate(values: string[]): string {
  return values.reduce((latest, value) =>
    getTimestamp(value) > getTimestamp(latest) ? value : latest, '')
}

function minDate(values: string[]): string {
  return values.reduce((earliest, value) => {
    if (!earliest) {
      return value
    }
    return getTimestamp(value) < getTimestamp(earliest) ? value : earliest
  }, '')
}

interface IndexedChat {
  agentId: string
  chat: QwenPawChatSpec
}

function deduplicateSessions(
  indexedChats: IndexedChat[],
): {
  chats: IndexedChat[]
  warnings: WorkflowWarning[]
} {
  const bySessionId = new Map<string, IndexedChat>()
  const warnings: WorkflowWarning[] = []

  indexedChats.forEach((candidate) => {
    const current = bySessionId.get(candidate.chat.session_id)
    if (!current) {
      bySessionId.set(candidate.chat.session_id, candidate)
      return
    }

    const keepCandidate =
      getTimestamp(candidate.chat.updated_at)
      > getTimestamp(current.chat.updated_at)
    const kept = keepCandidate ? candidate : current
    const ignored = keepCandidate ? current : candidate
    bySessionId.set(candidate.chat.session_id, kept)
    warnings.push({
      code: 'duplicate-session',
      message: `会话 ${candidate.chat.session_id} 存在重复 ChatSpec，已保留最新记录。`,
      agentId: ignored.agentId,
      chatSpecId: ignored.chat.id,
    })
  })

  return {
    chats: [...bySessionId.values()],
    warnings,
  }
}

export function aggregateAgentTaskRuns(
  definition: BusinessAgentDefinition,
  projectId: string,
  results: EntryAgentChatsResult[],
): AgentTaskRun[] {
  const historyWarnings = results.flatMap((result) =>
    result.error
      ? [{
          code: 'entry-agent-history-incomplete',
          message: `${result.agentId} 会话索引加载失败：${result.error}`,
          agentId: result.agentId,
        }]
      : [])
  const grouped = new Map<string, IndexedChat[]>()

  results.forEach((result) => {
    result.chats.forEach((chat) => {
      if (chat.channel !== 'console') {
        return
      }
      const identity = parseWorkflowUserId(
        chat.user_id,
        projectId,
        definition.id,
      )
      if (!identity) {
        return
      }
      const current = grouped.get(identity.runId) ?? []
      current.push({ agentId: result.agentId, chat })
      grouped.set(identity.runId, current)
    })
  })

  return [...grouped.entries()]
    .map(([runId, indexedChats]) => {
      const deduplicated = deduplicateSessions(indexedChats)
      const warnings = [...historyWarnings, ...deduplicated.warnings]
      const parsedJobs = deduplicated.chats.flatMap(({ agentId, chat }) => {
        const parsed = definition.identity.parseSessionId(
          chat.session_id,
          runId,
        )
        if (!parsed) {
          warnings.push({
            code: 'invalid-session-identity',
            message: `无法识别会话 ${chat.session_id} 的 Job 身份。`,
            agentId,
            chatSpecId: chat.id,
          })
          return []
        }

        return [{
          id: parsed.jobId,
          stepId: parsed.stepId,
          entryAgentId: agentId,
          status: 'registered',
          order: parsed.order,
          functionKey: parsed.functionKey,
          chatSpec: chat,
          registrationState: 'registered',
          historyState: 'idle',
        } satisfies WorkflowJob]
      })

      const jobs = parsedJobs
        .sort((left, right) => {
          if (left.order !== right.order) {
            return left.order - right.order
          }
          return getTimestamp(left.chatSpec?.created_at ?? '')
            - getTimestamp(right.chatSpec?.created_at ?? '')
        })
        .map((job, index) => ({
          ...job,
          order:
            job.stepId === 'function-modeling'
              ? index
              : job.order,
        }))
      const timestamps = deduplicated.chats.flatMap(({ chat }) => [
        chat.created_at,
        chat.updated_at,
      ])
      const activeStepId =
        jobs.some((job) => job.stepId === 'ontology')
          ? 'ontology'
          : jobs.some((job) => job.stepId === 'function-modeling')
            ? 'function-modeling'
            : definition.steps[0]?.id ?? ''
      const firstTitle = deduplicated.chats
        .map(({ chat }) => chat.name.trim())
        .find(Boolean)

      return {
        businessAgentId: definition.id,
        runId,
        projectId,
        userId: deduplicated.chats[0]?.chat.user_id
          ?? `baic-project:${projectId}:agent:${definition.id}:run:${runId}`,
        title: firstTitle || `${definition.name} ${runId.slice(0, 8)}`,
        createdAt: minDate(timestamps),
        updatedAt: maxDate(timestamps),
        status: 'running',
        activeStepId,
        jobs,
        artifacts: [],
        warnings,
        workflowData: null,
        historyIncomplete: historyWarnings.length > 0,
      } satisfies AgentTaskRun
    })
    .sort((left, right) =>
      getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt))
}
