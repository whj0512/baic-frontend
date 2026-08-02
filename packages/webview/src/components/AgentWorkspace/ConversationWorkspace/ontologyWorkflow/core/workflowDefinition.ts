import type {
  OntologyWorkflowStageDefinition,
  OntologyWorkflowStageView,
} from './types'

export const ONTOLOGY_WORKFLOW_STAGES: readonly OntologyWorkflowStageDefinition[] = [
  {
    id: 'itemization',
    title: '文档条目化',
    description: '整理需求文档并审核功能清单',
    scenes: [1],
  },
  {
    id: 'function-modeling',
    title: '单功能 DSL 建模',
    description: '逐项完成所选功能的结构化建模',
    scenes: [3],
  },
  {
    id: 'ontology-management',
    title: '本体关系管理',
    description: '校验、上传、推理并查看本体关系',
    scenes: [7, 8, 9],
  },
]

export function deriveOntologyWorkflowStages(
  itemizationConfirmed: boolean,
  functionModelingConfirmed = false,
  ontologyCompleted = false,
): OntologyWorkflowStageView[] {
  return ONTOLOGY_WORKFLOW_STAGES.map((stage, index) => ({
    ...stage,
    status:
      ontologyCompleted
        ? 'completed'
        : functionModelingConfirmed && index < 2
          ? 'completed'
          : functionModelingConfirmed && index === 2
            ? 'active'
            : itemizationConfirmed && index === 0
              ? 'completed'
              : itemizationConfirmed && index === 1
                ? 'active'
                : !itemizationConfirmed && index === 0
                  ? 'active'
                  : 'pending',
  }))
}
