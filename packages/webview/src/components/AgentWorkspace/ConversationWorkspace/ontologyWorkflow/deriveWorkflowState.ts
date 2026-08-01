import type { ConversationMessageView } from '../../qwenPaw/types'
import { extractFencedMessage } from '../fencedMessage/extractFencedMessage'
import type { ChunksEnvelope } from '../fencedMessage/chunks/types'
import { extractToolPanels } from '../toolMessage/extractToolPanels'
import type { RequirementDslArtifactsPanelPayload } from '../toolMessage/requirementDslArtifacts/types'
import type {
  OntologyWorkflowStageView,
  SceneOneFormValues,
  SceneThreeFormValues,
  WorkflowFunctionProgress,
  WorkflowFunctionSelection,
} from './types'
import { ONTOLOGY_WORKFLOW_STAGES } from './workflowDefinition'

export const SCENE_ONE_OPENING =
  '请使用 requirement_itemizer 对系统需求文档进行条目化。'
export const CHUNKS_QUERY_MARKER = '$query-project-chunks'
export const SCENE_THREE_OPENING =
  '请使用 requirement_analysis_pipeline 对一个功能进行完整建模。'
export const DSL_QUERY_MARKER = '$query-requirement-dsl-artifacts'

interface SceneThreeEvidence extends SceneThreeFormValues {
  chunkId: string
  functionName: string
}

export interface OntologyWorkflowEvidence {
  sceneOne: (SceneOneFormValues & { messageIndex: number }) | null
  chunksQueryIndex: number | null
  chunksEnvelope: ChunksEnvelope | null
  chunksMessageId: string | null
  chunksMessageIndex: number | null
  chunksEvidenceKey: string | null
  functions: WorkflowFunctionSelection[]
  functionProgress: Map<string, WorkflowFunctionProgress>
  modeledChunkIds: ReadonlySet<string>
  modeledFunctionCount: number
  latestModelingMessageIndex: number | null
  latestModelingEvidenceKey: string | null
  unknownSceneThreeChunkIds: string[]
  commonProjectRoot: string | null
  inconsistentProjectRootChunkIds: string[]
  dslQueryIndex: number | null
  dslPayload: RequirementDslArtifactsPanelPayload | null
  dslEvidenceKey: string | null
}

function getMessageText(message: ConversationMessageView): string {
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

function parseSceneOneMessage(text: string): SceneOneFormValues | null {
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

function parseSceneThreeMessage(text: string): SceneThreeEvidence | null {
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

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function countCharacter(value: string, character: string): number {
  return [...value].filter((item) => item === character).length
}

export function resolveWorkflowMarkdownPath(
  projectRootValue: string,
  sourceRelativePathValue: string | null | undefined,
): string | null {
  const projectRoot = projectRootValue.trim()
  const sourceRelativePath = sourceRelativePathValue?.trim() ?? ''
  if (!projectRoot || !sourceRelativePath) {
    return null
  }
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(sourceRelativePath)
    || sourceRelativePath.startsWith('/')
    || sourceRelativePath.startsWith('\\')
  ) {
    return null
  }

  const segments = sourceRelativePath
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0 && segment !== '.')
  if (segments.length === 0 || segments.some((segment) => segment === '..')) {
    return null
  }

  const separator =
    countCharacter(projectRoot, '\\') >= countCharacter(projectRoot, '/')
      && projectRoot.includes('\\')
      ? '\\'
      : '/'
  const root = projectRoot.replace(/[\\/]+$/, '')
  return `${root}${separator}${segments.join(separator)}`
}

function getFunctions(payload: ChunksEnvelope): WorkflowFunctionSelection[] {
  if (payload.status !== 'success' || !payload.data) {
    return []
  }

  const projectRoot = toTrimmedString(payload.project_root)
  return payload.data.chunks
    .filter((chunk) => chunk.chunk_type === 'functional_requirement')
    .map((chunk) => {
      const sourceRelativePath = toTrimmedString(chunk.source_relative_path) || null
      return {
        chunkId: chunk.chunk_id,
        requirementId: toTrimmedString(chunk.req_id) || null,
        name:
          toTrimmedString(chunk.canonical_function_name)
          || toTrimmedString(chunk.title)
          || chunk.chunk_id,
        sourceRelativePath,
        projectRoot,
        resolvedMarkdownPath: resolveWorkflowMarkdownPath(
          projectRoot,
          sourceRelativePath,
        ),
      }
    })
}

export function deriveOntologyWorkflowEvidence(
  messages: ConversationMessageView[],
): OntologyWorkflowEvidence {
  let sceneOne: OntologyWorkflowEvidence['sceneOne'] = null

  for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    const message = messages[messageIndex]
    if (message.role !== 'user') {
      continue
    }
    const parsed = parseSceneOneMessage(getMessageText(message))
    if (parsed) {
      sceneOne = { ...parsed, messageIndex }
    }
  }

  let chunksQueryIndex: number | null = null
  for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    const message = messages[messageIndex]
    if (
      // QwenPaw may compact the original scene-one prompt while retaining the
      // later chunks query and result. In that case the latest query becomes
      // the recovery anchor for the review checkpoint.
      messageIndex > (sceneOne?.messageIndex ?? -1)
      && message.role === 'user'
      && getMessageText(message).includes(CHUNKS_QUERY_MARKER)
    ) {
      chunksQueryIndex = messageIndex
    }
  }

  let chunksEnvelope: ChunksEnvelope | null = null
  let chunksMessageId: string | null = null
  let chunksMessageIndex: number | null = null
  let chunksEvidenceKey: string | null = null
  if (chunksQueryIndex !== null) {
    for (let messageIndex = chunksQueryIndex + 1; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      const blocks = extractFencedMessage(message).blocks
      for (const block of blocks) {
        if (block.keyword === 'chunks') {
          chunksEnvelope = block.payload as ChunksEnvelope
          chunksMessageId = message.id
          chunksMessageIndex = messageIndex
          chunksEvidenceKey = `${message.id}:${block.blockIndex}`
        }
      }
    }
  }

  const functions = chunksEnvelope ? getFunctions(chunksEnvelope) : []
  const functionIds = new Set(functions.map((item) => item.chunkId))
  const functionProgress = new Map<string, WorkflowFunctionProgress>()
  const unknownSceneThreeChunkIds = new Set<string>()
  if (chunksMessageIndex !== null) {
    for (let messageIndex = chunksMessageIndex + 1; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      if (message.role !== 'user') {
        continue
      }
      const sceneThree = parseSceneThreeMessage(getMessageText(message))
      if (!sceneThree) {
        continue
      }
      if (!functionIds.has(sceneThree.chunkId)) {
        unknownSceneThreeChunkIds.add(sceneThree.chunkId)
        continue
      }
      const previous = functionProgress.get(sceneThree.chunkId)
      const messageCount = (previous?.messageCount ?? 0) + 1
      functionProgress.set(sceneThree.chunkId, {
        chunkId: sceneThree.chunkId,
        messageCount,
        latestMessageIndex: messageIndex,
        functionMarkdown: sceneThree.functionMarkdown,
        projectRoot: sceneThree.projectRoot,
        status: messageCount > 1 ? 'restarted' : 'started',
      })
    }
  }

  const modeledChunkIds = new Set(functionProgress.keys())
  const progressValues = Array.from(functionProgress.values())
  const latestModelingMessageIndex = progressValues.length > 0
    ? Math.max(...progressValues.map((item) => item.latestMessageIndex))
    : null
  const latestModelingEvidenceKey = latestModelingMessageIndex !== null
    ? messages[latestModelingMessageIndex]?.id ?? null
    : null
  const nonEmptyProjectRoots = new Set(
    progressValues.map((item) => item.projectRoot).filter(Boolean),
  )
  const commonProjectRoot =
    progressValues.length === functions.length
    && nonEmptyProjectRoots.size === 1
    && progressValues.every((item) => item.projectRoot)
      ? progressValues[0]?.projectRoot ?? null
      : null
  const inconsistentProjectRootChunkIds =
    commonProjectRoot || progressValues.length < functions.length
      ? []
      : progressValues.map((item) => item.chunkId)

  let dslQueryIndex: number | null = null
  if (latestModelingMessageIndex !== null) {
    for (let messageIndex = latestModelingMessageIndex + 1; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      if (
        message.role === 'user'
        && getMessageText(message).includes(DSL_QUERY_MARKER)
      ) {
        dslQueryIndex = messageIndex
      }
    }
  }

  let dslPayload: RequirementDslArtifactsPanelPayload | null = null
  let dslEvidenceKey: string | null = null
  if (dslQueryIndex !== null) {
    for (let messageIndex = dslQueryIndex + 1; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      for (const panel of extractToolPanels(message)) {
        if (panel.handler.id === 'query-requirement-dsl-artifacts') {
          const payload = panel.payload as RequirementDslArtifactsPanelPayload
          const payloadRevision = payload.state === 'success'
            ? `${payload.state}:${payload.envelope.summary.feature_count}:${payload.envelope.summary.artifact_count}`
            : payload.state
          dslPayload = payload
          dslEvidenceKey = `${message.id}:${panel.callId}:${panel.partIndex}:${payloadRevision}`
        }
      }
    }
  }

  return {
    sceneOne,
    chunksQueryIndex,
    chunksEnvelope,
    chunksMessageId,
    chunksMessageIndex,
    chunksEvidenceKey,
    functions,
    functionProgress,
    modeledChunkIds,
    modeledFunctionCount: modeledChunkIds.size,
    latestModelingMessageIndex,
    latestModelingEvidenceKey,
    unknownSceneThreeChunkIds: Array.from(unknownSceneThreeChunkIds),
    commonProjectRoot,
    inconsistentProjectRootChunkIds,
    dslQueryIndex,
    dslPayload,
    dslEvidenceKey,
  }
}

export function deriveOntologyWorkflowStages(
  itemizationConfirmed: boolean,
  functionModelingConfirmed = false,
): OntologyWorkflowStageView[] {
  return ONTOLOGY_WORKFLOW_STAGES.map((stage, index) => ({
    ...stage,
    status:
      functionModelingConfirmed && index < 2
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
    '请使用 $query-requirement-dsl-artifacts 查询以下项目根目录中已生成的需求 DSL 产物。',
    `项目根目录：${projectRoot.trim()}`,
    '请将完整结构化结果保留在工具结果中，最终回答只显示 Skill 规定的统计信息。',
  ].join('\n')
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
    '请使用 $query-project-chunks 查询以下项目根目录的 chunks.json。',
    `项目根目录：${projectRoot.trim()}`,
    '详细度：detail=summary',
    '请严格按 Skill 契约在最终 assistant text 中只返回 chunks 围栏。',
  ].join('\n')
}
