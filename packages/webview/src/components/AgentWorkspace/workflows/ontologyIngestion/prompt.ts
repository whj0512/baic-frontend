import { buildWorkflowUserId } from '../../workflowCore/workflowIdentity'
import type {
  WorkflowRequest,
  WorkflowRequestContext,
} from '../../workflowCore/types'
import {
  ONTOLOGY_INGESTION_ID,
} from './constants'

function readEntryAgentId(stepId: string): string {
  switch (stepId) {
    case 'itemization':
      return 'requirement_itemizer'
    case 'function-modeling':
      return 'requirement_document_parse'
    case 'ontology':
      return 'requirement_ontology_manager'
    default:
      throw new Error(`未知本体入库步骤：${stepId}`)
  }
}

function buildRequest(
  context: WorkflowRequestContext,
  intent: string,
): WorkflowRequest {
  const agentId = readEntryAgentId(context.job.stepId)
  const sessionId =
    context.job.stepId === 'function-modeling'
      ? `baic-agent:${ONTOLOGY_INGESTION_ID}:${context.runId}:model:${
          encodeURIComponent(context.job.functionKey ?? context.job.jobId)
        }`
      : `baic-agent:${ONTOLOGY_INGESTION_ID}:${context.runId}:${
          context.job.stepId === 'itemization' ? 'itemize' : 'ontology'
        }`

  return {
    agentId,
    sessionId,
    userId: buildWorkflowUserId(
      context.projectId,
      ONTOLOGY_INGESTION_ID,
      context.runId,
    ),
    channel: 'console',
    content: [
      { type: 'text', text: intent },
      {
        type: 'data',
        data: {
          business_agent_id: ONTOLOGY_INGESTION_ID,
          run_id: context.runId,
          project_id: context.projectId,
          step_id: context.job.stepId,
          job_id: context.job.jobId,
          ...context.values,
        },
      },
    ],
  }
}

export function buildOntologyInitialRequest(
  context: WorkflowRequestContext,
): WorkflowRequest {
  return buildRequest(
    context,
    '请执行本体入库工作流的当前步骤，并保留结构化任务身份。',
  )
}

export function buildOntologyContinuationRequest(
  context: WorkflowRequestContext,
): WorkflowRequest {
  return buildRequest(
    context,
    '请继续当前本体入库 Job，并复用原会话与结构化任务身份。',
  )
}
