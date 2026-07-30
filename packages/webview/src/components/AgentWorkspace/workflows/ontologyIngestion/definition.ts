import {
  buildDefaultWorkflowSessionId,
} from '../../workflowCore/workflowIdentity'
import { registerBusinessAgent } from '../../workflowCore/registry'
import type {
  BusinessAgentDefinition,
  ParsedWorkflowJobIdentity,
} from '../../workflowCore/types'
import {
  ONTOLOGY_INGESTION_ENTRY_AGENT_IDS,
  ONTOLOGY_INGESTION_ID,
  ONTOLOGY_INGESTION_REQUIRED_AGENT_IDS,
} from './constants'
import {
  buildOntologyContinuationRequest,
  buildOntologyInitialRequest,
} from './prompt'

function buildOntologySessionId(
  runId: string,
  job: ParsedWorkflowJobIdentity,
): string {
  if (job.stepId === 'itemization') {
    return buildDefaultWorkflowSessionId(
      ONTOLOGY_INGESTION_ID,
      runId,
      'itemize',
    )
  }
  if (job.stepId === 'ontology') {
    return buildDefaultWorkflowSessionId(
      ONTOLOGY_INGESTION_ID,
      runId,
      'ontology',
    )
  }

  return `${buildDefaultWorkflowSessionId(
    ONTOLOGY_INGESTION_ID,
    runId,
    'model',
  )}:${encodeURIComponent(job.functionKey ?? job.jobId)}`
}

function parseOntologySessionId(
  sessionId: string,
  runId: string,
): ParsedWorkflowJobIdentity | null {
  const prefix = `baic-agent:${ONTOLOGY_INGESTION_ID}:${runId}:`
  if (!sessionId.startsWith(prefix)) {
    return null
  }

  const suffix = sessionId.slice(prefix.length)
  if (suffix === 'itemize') {
    return {
      jobId: 'itemize',
      stepId: 'itemization',
      order: 0,
    }
  }
  if (suffix === 'ontology') {
    return {
      jobId: 'ontology',
      stepId: 'ontology',
      order: Number.MAX_SAFE_INTEGER,
    }
  }
  if (!suffix.startsWith('model:')) {
    return null
  }

  const encodedFunctionKey = suffix.slice('model:'.length)
  if (!encodedFunctionKey) {
    return null
  }

  let functionKey: string
  try {
    functionKey = decodeURIComponent(encodedFunctionKey)
  } catch {
    return null
  }
  if (!functionKey) {
    return null
  }

  return {
    jobId: `model:${functionKey}`,
    stepId: 'function-modeling',
    order: 1,
    functionKey,
  }
}

export const ontologyIngestionDefinition: BusinessAgentDefinition = {
  id: ONTOLOGY_INGESTION_ID,
  name: '本体入库智能体',
  description: '将需求文档条目化、逐功能建模并生成可授权写入的本体关系。',
  requiredAgentIds: [...ONTOLOGY_INGESTION_REQUIRED_AGENT_IDS],
  entryAgentIds: [...ONTOLOGY_INGESTION_ENTRY_AGENT_IDS],
  starter: {
    fields: [
      {
        id: 'source_document',
        label: '源需求文档',
        type: 'file',
        required: true,
      },
      {
        id: 'mineru_markdown',
        label: '同版本 MinerU Markdown',
        type: 'file',
        required: true,
      },
      {
        id: 'output_root',
        label: '输出目录',
        type: 'directory',
        required: true,
      },
      {
        id: 'project_name',
        label: '项目名称',
        type: 'text',
        required: true,
      },
      {
        id: 'goal',
        label: '建模目标',
        type: 'textarea',
        required: true,
      },
    ],
  },
  steps: [
    {
      id: 'itemization',
      name: '文档条目化',
      description: '解析需求文档并派生可建模功能。',
    },
    {
      id: 'function-modeling',
      name: '单功能建模',
      description: '按功能串行生成上下文、DSL、对齐和测试用例。',
    },
    {
      id: 'ontology',
      name: '本体关系管理',
      description: '生成并校验 TTL，在授权后写入和推理。',
    },
  ],
  artifactGroups: [
    {
      id: 'itemization',
      name: '条目化产物',
      stepId: 'itemization',
      kinds: ['chunks'],
    },
    {
      id: 'modeling',
      name: '建模产物',
      stepId: 'function-modeling',
      kinds: ['context', 'dsl', 'alignment', 'testcase'],
    },
    {
      id: 'ontology',
      name: '本体产物',
      stepId: 'ontology',
      kinds: ['ttl', 'graphdb', 'inference'],
    },
  ],
  artifactQueries: [
    {
      id: 'itemization-chunks',
      stepId: 'itemization',
      entryAgentId: 'requirement_itemizer',
      skillId: 'query-project-chunks',
      delivery: 'assistant-fence',
      handlerId: 'chunks',
      scope: 'step',
      trigger: 'on-step-output-ready',
      sessionSelector: 'current-job',
      variants: [
        { id: 'summary', label: '查看功能摘要', detail: 'summary' },
        { id: 'full', label: '查看原始分块', detail: 'full' },
      ],
    },
    {
      id: 'requirement-dsl',
      stepId: 'function-modeling',
      entryAgentId: 'requirement_document_parse',
      skillId: 'query-requirement-dsl-artifacts',
      delivery: 'tool-output',
      handlerId: 'query-requirement-dsl-artifacts',
      scope: 'step',
      trigger: 'on-step-output-ready',
      sessionSelector: 'latest-completed-step-job',
    },
    {
      id: 'ontology-instances',
      stepId: 'ontology',
      entryAgentId: 'requirement_ontology_manager',
      skillId: 'query-project-ontology-instances',
      delivery: 'client-panel',
      handlerId: 'query-project-ontology-instances',
      scope: 'step',
      trigger: 'manual',
      sessionSelector: 'current-job',
    },
  ],
  identity: {
    buildSessionId: buildOntologySessionId,
    parseSessionId: parseOntologySessionId,
  },
  buildInitialRequest: buildOntologyInitialRequest,
  buildContinuationRequest: buildOntologyContinuationRequest,
}

registerBusinessAgent(ontologyIngestionDefinition)
