import type {
  BusinessAgentDefinition,
  ParsedWorkflowJobIdentity,
  WorkflowIdentity,
} from './types'

const USER_ID_PREFIX = 'baic-project:'
const SESSION_ID_PREFIX = 'baic-agent:'

export function buildWorkflowUserId(
  projectId: string,
  businessAgentId: string,
  runId: string,
): string {
  return `${USER_ID_PREFIX}${projectId}:agent:${businessAgentId}:run:${runId}`
}

export function buildWorkflowUserIdPrefix(
  projectId: string,
  businessAgentId: string,
): string {
  return `${USER_ID_PREFIX}${projectId}:agent:${businessAgentId}:run:`
}

export function parseWorkflowUserId(
  userId: string,
  projectId: string,
  businessAgentId: string,
): WorkflowIdentity | null {
  const prefix = buildWorkflowUserIdPrefix(projectId, businessAgentId)
  if (!userId.startsWith(prefix)) {
    return null
  }

  const runId = userId.slice(prefix.length)
  if (!runId || runId.includes(':')) {
    return null
  }

  return {
    projectId,
    businessAgentId,
    runId,
  }
}

export function buildDefaultWorkflowSessionId(
  businessAgentId: string,
  runId: string,
  jobId: string,
): string {
  return `${SESSION_ID_PREFIX}${businessAgentId}:${runId}:${jobId}`
}

export function parseDefaultWorkflowSessionId(
  sessionId: string,
  businessAgentId: string,
  runId: string,
  stepIds: readonly string[],
): ParsedWorkflowJobIdentity | null {
  const prefix = `${SESSION_ID_PREFIX}${businessAgentId}:${runId}:`
  if (!sessionId.startsWith(prefix)) {
    return null
  }

  const jobId = sessionId.slice(prefix.length)
  if (!jobId || jobId.includes(':')) {
    return null
  }

  const stepIndex = stepIds.indexOf(jobId)
  return {
    jobId,
    stepId: stepIndex >= 0 ? stepIds[stepIndex] : stepIds[0] ?? jobId,
    order: stepIndex >= 0 ? stepIndex : 0,
  }
}

export function createWorkflowIdentity(
  definition: BusinessAgentDefinition,
  projectId: string,
  runId = crypto.randomUUID(),
): WorkflowIdentity & { userId: string } {
  return {
    businessAgentId: definition.id,
    projectId,
    runId,
    userId: buildWorkflowUserId(projectId, definition.id, runId),
  }
}
