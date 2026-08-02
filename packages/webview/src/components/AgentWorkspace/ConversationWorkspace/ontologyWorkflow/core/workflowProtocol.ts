import type { ConversationMessageView } from '../../../qwenPaw/types'
import type {
  SceneEightFormValues,
  SceneNineFormValues,
  SceneOneFormValues,
  SceneSevenFormValues,
  SceneThreeFormValues,
  WorkflowFunctionSelection,
} from './types'

export const SCENE_ONE_OPENING =
  '请使用 requirement_itemizer 对系统需求文档进行条目化。'
export const CHUNKS_QUERY_OPENING =
  '请使用 $query-project-chunks 查询以下项目根目录的 chunks.json。'
export const SCENE_THREE_OPENING =
  '请使用 requirement_analysis_pipeline 对一个功能进行完整建模。'
export const DSL_QUERY_OPENING =
  '请使用 $query-requirement-dsl-artifacts 查询以下项目根目录中已生成的需求 DSL 产物。'
export const CHUNKS_RECOVERY_REASON =
  '恢复原因：上下文压缩后的工作流检查点重建。'
export const SCENE_SEVEN_OPENING =
  '请将该项目已验证的 DSL 和 requirement_relations.json 转换为 TTL。'
export const SCENE_EIGHT_OPENING =
  '我明确授权向 GraphDB 写入本项目 ABox。'
export const SCENE_NINE_OPENING =
  '我明确授权在 GraphDB 仓库'
export const ONTOLOGY_QUERY_OPENING =
  '请使用 $query-project-ontology-instances 加载当前项目的本体实例关系图。'

export interface SceneThreeEvidence extends SceneThreeFormValues {
  chunkId: string
  functionName: string
}

export function getWorkflowMessageText(message: ConversationMessageView): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim()
}

function readLabeledLine(text: string, label: string): string {
  const line = text.split(/\r?\n/).find((item) => item.startsWith(label))
  return line?.slice(label.length).trim() ?? ''
}

export function parseSceneOneMessage(text: string): SceneOneFormValues | null {
  if (!text.startsWith(SCENE_ONE_OPENING)) {
    return null
  }
  const sourceDocument = readLabeledLine(text, '原始文档：')
  const mineruMarkdown = readLabeledLine(text, 'MinerU Markdown：')
  const projectRoot = readLabeledLine(text, '项目根目录：')
  if (!sourceDocument || !mineruMarkdown || !projectRoot) {
    return null
  }
  return {
    sourceDocument,
    mineruMarkdown,
    projectRoot,
    additionalConstraints: readLabeledLine(text, '补充限制：'),
  }
}

export function parseSceneThreeMessage(text: string): SceneThreeEvidence | null {
  if (!text.startsWith(SCENE_THREE_OPENING)) {
    return null
  }
  const chunkId = readLabeledLine(text, '功能分块 ID：')
  const functionMarkdown = readLabeledLine(text, '功能 Markdown：')
  if (!chunkId || !functionMarkdown) {
    return null
  }
  return {
    chunkId,
    functionName: readLabeledLine(text, '功能名称：'),
    functionMarkdown,
    projectRoot: readLabeledLine(text, '项目根目录：'),
    additionalRequirements: readLabeledLine(text, '补充要求：'),
  }
}

export function parseSceneSevenMessage(text: string): SceneSevenFormValues | null {
  if (!text.startsWith(SCENE_SEVEN_OPENING)) {
    return null
  }
  const projectRoot = readLabeledLine(text, '项目根目录：')
  const ttlOutputPath = readLabeledLine(text, '输出 TTL：')
  if (!projectRoot || !ttlOutputPath) {
    return null
  }
  return {
    projectRoot,
    ttlOutputPath,
    additionalRequirements: readLabeledLine(text, '补充要求：'),
  }
}

export function parseSceneEightMessage(text: string): SceneEightFormValues | null {
  if (!text.startsWith(SCENE_EIGHT_OPENING)) {
    return null
  }
  const ttlPath = readLabeledLine(text, 'TTL：')
  const graphDbUrl = readLabeledLine(text, 'GraphDB 地址：')
  const repository = readLabeledLine(text, '仓库：')
  return ttlPath && graphDbUrl && repository
    ? { ttlPath, graphDbUrl, repository }
    : null
}

export function parseSceneNineMessage(text: string): SceneNineFormValues | null {
  if (!text.startsWith(SCENE_NINE_OPENING)) {
    return null
  }
  const projectIdentifier = readLabeledLine(text, '项目：')
  const graphDbUrl = readLabeledLine(text, 'GraphDB 地址：')
  const repository = text.slice(SCENE_NINE_OPENING.length).split(' 上执行')[0]?.trim() ?? ''
  return projectIdentifier && graphDbUrl && repository
    ? { projectIdentifier, graphDbUrl, repository }
    : null
}

export function buildSceneOnePrompt(values: SceneOneFormValues): string {
  const lines = [
    SCENE_ONE_OPENING,
    `原始文档：${values.sourceDocument.trim()}`,
    `MinerU Markdown：${values.mineruMarkdown.trim()}`,
    `项目根目录：${values.projectRoot.trim()}`,
    '要求：按系统功能拆分为独立 Markdown，保留功能概述和系统概述；',
    '从功能概述、功能列表或正文的明确描述中提取项目级 includes 关系；',
    '不要根据目录层级推断包含关系。',
    '请输出 chunks.json、每个功能条目、关系种子和校验结果。',
  ]
  const additionalConstraints = values.additionalConstraints.trim()
  if (additionalConstraints) {
    lines.push(`补充限制：${additionalConstraints}`)
  }
  return lines.join('\n')
}

export function buildChunksQueryPrompt(projectRoot: string): string {
  return [
    CHUNKS_QUERY_OPENING,
    `项目根目录：${projectRoot.trim()}`,
    '详细度：detail=summary',
    '请严格按 Skill 契约在最终 assistant text 中只返回 chunks 围栏。',
  ].join('\n')
}

export function buildChunksRecoveryPrompt(projectRoot: string): string {
  return [
    CHUNKS_QUERY_OPENING,
    `项目根目录：${projectRoot.trim()}`,
    '详细度：detail=summary',
    CHUNKS_RECOVERY_REASON,
    '请严格按 Skill 契约在最终 assistant text 中只返回 chunks 围栏。',
  ].join('\n')
}

export function buildSceneThreePrompt(
  selection: WorkflowFunctionSelection,
  values: SceneThreeFormValues,
): string {
  const lines = [
    SCENE_THREE_OPENING,
    `功能分块 ID：${selection.chunkId}`,
    `功能名称：${selection.name}`,
    `功能 Markdown：${values.functionMarkdown.trim()}`,
    `项目根目录：${values.projectRoot.trim()}`,
    '目标：生成实体、条件逻辑、四类 DSL、DSL 对齐结果和测试用例。',
    '要求：从本功能原文中增量维护项目关系；只有原文唯一确定的内容才可写回 DSL；',
    '不得修改原始需求 Markdown；DSL 语法或对齐失败时停止测试用例生成并报告原因。',
  ]
  const additionalRequirements = values.additionalRequirements.trim()
  if (additionalRequirements) {
    lines.push(`补充要求：${additionalRequirements}`)
  }
  return lines.join('\n')
}

export function buildDslQueryPrompt(projectRoot: string): string {
  return [
    DSL_QUERY_OPENING,
    `项目根目录：${projectRoot.trim()}`,
    '请将完整结构化结果保留在工具结果中，最终回答只显示 Skill 规定的统计信息。',
  ].join('\n')
}

export function buildSceneSevenPrompt(values: SceneSevenFormValues): string {
  const lines = [
    SCENE_SEVEN_OPENING,
    `项目根目录：${values.projectRoot.trim()}`,
    `输出 TTL：${values.ttlOutputPath.trim()}`,
    '只做本地 Turtle 校验，不连接、不上传、不修改 GraphDB。',
    '请返回 TTL 路径、实体/关系统计、校验结果和问题列表。',
  ]
  const additionalRequirements = values.additionalRequirements.trim()
  if (additionalRequirements) {
    lines.push(`补充要求：${additionalRequirements}`)
  }
  return lines.join('\n')
}

export function buildSceneEightPrompt(values: SceneEightFormValues): string {
  return [
    SCENE_EIGHT_OPENING,
    `TTL：${values.ttlPath.trim()}`,
    `GraphDB 地址：${values.graphDbUrl.trim()}`,
    `仓库：${values.repository.trim()}`,
    '仅追加该 ABox；不得清库、不得覆盖 TBox/SHACL、不得执行推理。',
    '请返回上传状态、三元组数量、中文标签抽样和 SHACL 验证结果。',
  ].join('\n')
}

export function buildSceneNinePrompt(values: SceneNineFormValues): string {
  return [
    `${SCENE_NINE_OPENING} ${values.repository.trim()} 上执行本体关系推理。`,
    `GraphDB 地址：${values.graphDbUrl.trim()}`,
    `项目：${values.projectIdentifier.trim()}`,
    '请推理并导出数据依赖、写冲突、状态机问题和关系证据。',
    '每条推理关系必须包含 relationSource、relationTarget、isInferred=true、subtype 和 evidence；',
    '不要把同名信号、共享连接或目录层级单独判定为依赖。',
  ].join('\n')
}

export function buildOntologyQueryPrompt(): string {
  return ONTOLOGY_QUERY_OPENING
}
