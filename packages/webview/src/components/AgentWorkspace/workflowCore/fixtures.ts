import {
  buildDefaultWorkflowSessionId,
  parseDefaultWorkflowSessionId,
} from './workflowIdentity'
import type { BusinessAgentDefinition } from './types'

function createFixtureDefinition(
  id: string,
  stepIds: string[],
): BusinessAgentDefinition {
  const entryAgentId = `${id}-entry`
  return {
    id,
    name: id,
    description: '仅用于验证通用工作流扩展性的开发 fixture',
    requiredAgentIds: [entryAgentId],
    entryAgentIds: [entryAgentId],
    starter: { fields: [] },
    steps: stepIds.map((stepId) => ({
      id: stepId,
      name: stepId,
      description: stepId,
    })),
    artifactGroups: [],
    artifactQueries: [],
    identity: {
      buildSessionId: (runId, job) =>
        buildDefaultWorkflowSessionId(id, runId, job.jobId),
      parseSessionId: (sessionId, runId) =>
        parseDefaultWorkflowSessionId(sessionId, id, runId, stepIds),
    },
    buildInitialRequest: ({ projectId, runId, job }) => ({
      agentId: entryAgentId,
      sessionId: buildDefaultWorkflowSessionId(id, runId, job.jobId),
      userId: `baic-project:${projectId}:agent:${id}:run:${runId}`,
      channel: 'console',
      content: [{ type: 'text', text: 'fixture' }],
    }),
    buildContinuationRequest: ({ projectId, runId, job }) => ({
      agentId: entryAgentId,
      sessionId: buildDefaultWorkflowSessionId(id, runId, job.jobId),
      userId: `baic-project:${projectId}:agent:${id}:run:${runId}`,
      channel: 'console',
      content: [{ type: 'text', text: 'fixture continuation' }],
    }),
  }
}

export const singleStepFixtureDefinition = createFixtureDefinition(
  'workflow-fixture-single',
  ['execute'],
)

export const twoStepFixtureDefinition = createFixtureDefinition(
  'workflow-fixture-confirmation',
  ['prepare', 'confirm'],
)
