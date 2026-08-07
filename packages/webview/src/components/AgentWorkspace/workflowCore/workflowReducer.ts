import type {
  AgentTaskRun,
  WorkflowArtifact,
  WorkflowJob,
  WorkflowWarning,
} from './types'

export type WorkflowAction =
  | { type: 'create'; run: AgentTaskRun }
  | { type: 'restore'; run: AgentTaskRun }
  | {
      type: 'register_session'
      identity: AsyncWorkflowIdentity
      job: WorkflowJob
    }
  | {
      type: 'append_messages'
      identity: AsyncWorkflowIdentity
      messages: WorkflowJob['messages']
    }
  | {
      type: 'receive_protocol'
      identity: AsyncWorkflowIdentity
      status: AgentTaskRun['status']
      artifacts?: WorkflowArtifact[]
      warnings?: WorkflowWarning[]
    }
  | {
      type: 'confirm_step'
      identity: AsyncWorkflowIdentity
      nextStepId: string
    }
  | { type: 'retry_job'; identity: AsyncWorkflowIdentity }
  | { type: 'stop_job'; identity: AsyncWorkflowIdentity }
  | {
      type: 'fail_job'
      identity: AsyncWorkflowIdentity
      error: string
    }
  | { type: 'complete_job'; identity: AsyncWorkflowIdentity }

export interface AsyncWorkflowIdentity {
  businessAgentId: string
  runId: string
  jobId: string
  requestId: string
}

function identityMatches(
  run: AgentTaskRun,
  identity: AsyncWorkflowIdentity,
): boolean {
  if (
    run.businessAgentId !== identity.businessAgentId
    || run.runId !== identity.runId
  ) {
    return false
  }

  const job = run.jobs.find((candidate) => candidate.id === identity.jobId)
  return Boolean(job && (!job.requestId || job.requestId === identity.requestId))
}

function updateJob(
  run: AgentTaskRun,
  identity: AsyncWorkflowIdentity,
  update: (job: WorkflowJob) => WorkflowJob,
): AgentTaskRun {
  if (!identityMatches(run, identity)) {
    return run
  }

  return {
    ...run,
    updatedAt: new Date().toISOString(),
    jobs: run.jobs.map((job) =>
      job.id === identity.jobId ? update(job) : job),
  }
}

function mergeArtifacts(
  current: WorkflowArtifact[],
  next: WorkflowArtifact[],
): WorkflowArtifact[] {
  const merged = new Map(
    current.map((artifact) => [
      `${artifact.jobId}:${artifact.id}`,
      artifact,
    ]),
  )
  next.forEach((artifact) => {
    merged.set(`${artifact.jobId}:${artifact.id}`, artifact)
  })
  return [...merged.values()]
}

export function workflowReducer(
  state: AgentTaskRun | null,
  action: WorkflowAction,
): AgentTaskRun | null {
  if (action.type === 'create' || action.type === 'restore') {
    return action.run
  }
  if (!state || !identityMatches(state, action.identity)) {
    return state
  }

  switch (action.type) {
    case 'register_session':
      return updateJob(state, action.identity, () => action.job)
    case 'append_messages':
      return updateJob(state, action.identity, (job) => ({
        ...job,
        messages: action.messages,
      }))
    case 'receive_protocol':
      return {
        ...state,
        status: action.status,
        artifacts: mergeArtifacts(
          state.artifacts,
          action.artifacts ?? [],
        ),
        warnings: [...state.warnings, ...(action.warnings ?? [])],
        updatedAt: new Date().toISOString(),
      }
    case 'confirm_step':
      return {
        ...state,
        status: 'running',
        activeStepId: action.nextStepId,
        updatedAt: new Date().toISOString(),
      }
    case 'retry_job':
      return updateJob(state, action.identity, (job) => ({
        ...job,
        status: 'queued',
        error: undefined,
        requestId: action.identity.requestId,
      }))
    case 'stop_job':
      return updateJob(state, action.identity, (job) => ({
        ...job,
        status: 'stopped',
      }))
    case 'fail_job':
      return {
        ...updateJob(state, action.identity, (job) => ({
          ...job,
          status: 'failed',
          error: action.error,
        })),
        status: 'partially_failed',
      }
    case 'complete_job':
      return updateJob(state, action.identity, (job) => ({
        ...job,
        status: 'completed',
      }))
  }
}
