import type { ConversationQuickPrompt } from './types'

export const ONTOLOGY_QA_QUICK_PROMPTS: readonly ConversationQuickPrompt[] = [
  {
    id: 'ontology-scene-9',
    label: '场景 9 · 本体关系推理',
    description: '填写 GraphDB 仓库并逐次授权，将推理请求填入聊天草稿。',
    requiresAuthorization: true,
  },
  {
    id: 'ontology-scene-9-results',
    label: '场景 9 · 查询推理结果',
    description: '填写 GraphDB 仓库，调用查询 Skill 读取场景 9 已输出的结果。',
    requiresAuthorization: false,
  },
  {
    id: 'ontology-scene-10',
    label: '场景 10 · 只读关系查询',
    description: '填写 GraphDB 仓库和功能名，生成只读关系查询草稿。',
    requiresAuthorization: false,
  },
]

export function createOntologyScene9Prompt(
  repositoryName: string,
  projectDisplayName: string,
): string {
  return `我明确授权在 GraphDB 仓库 ${repositoryName} 上执行本体关系推理。
项目：${projectDisplayName}
请推理并导出数据依赖、写冲突、状态机问题和关系证据。
每条推理关系必须包含 relationSource、relationTarget、isInferred=true、subtype 和 evidence；
不要把同名信号、共享连接或目录层级单独判定为依赖。
请将结果输出至项目 ${projectDisplayName} 目录下的 ${repositoryName}-ontology-qa.json 文件中，并按 JSON 导出关系类型、起点、终点、证据和置信度，并给出统计。`
}

export function createOntologyScene9ResultsQueryPrompt(
  repositoryName: string,
): string {
  return `$query-project-ontology-qa-results project_root="<绝对项目目录>" repository_name="${repositoryName}"`
}

export function createOntologyScene10Prompt(
  repositoryName: string,
  functionName: string,
): string {
  return `请查询 GraphDB 仓库 ${repositoryName} 中与 ${functionName} 相关的关系。
只读，不上传、不推理、不修改仓库。
请按 JSON 导出关系类型、起点、终点、证据和置信度，并给出统计。
结果输出至项目 <绝对项目目录> 下的 ${functionName}-ontology-qa.json 文件中。`
}
