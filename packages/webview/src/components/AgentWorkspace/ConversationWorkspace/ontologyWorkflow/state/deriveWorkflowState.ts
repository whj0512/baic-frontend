import type { ConversationMessageView } from '../../../qwenPaw/types'
import { extractFencedMessage } from '../../fencedMessage/extractFencedMessage'
import type { ChunksEnvelope } from '../../fencedMessage/chunks/types'
import { extractToolPanels } from '../../toolMessage/extractToolPanels'
import type { OntologyInstancesPanelPayload } from '../../toolMessage/ontologyInstances/types'
import type { RequirementDslArtifactsPanelPayload } from '../../toolMessage/requirementDslArtifacts/types'
import type {
  SceneEightFormValues,
  SceneNineFormValues,
  SceneOneFormValues,
  SceneSevenFormValues,
  WorkflowFunctionProgress,
  WorkflowFunctionSelection,
} from '../core/types'
import { resolveWorkflowMarkdownPath } from '../core/workflowPath'
import {
  CHUNKS_QUERY_OPENING,
  CHUNKS_RECOVERY_REASON,
  DSL_QUERY_OPENING,
  getWorkflowMessageText,
  ONTOLOGY_QUERY_OPENING,
  parseSceneEightMessage,
  parseSceneNineMessage,
  parseSceneOneMessage,
  parseSceneSevenMessage,
  parseSceneThreeMessage,
} from '../core/workflowProtocol'
import type { SceneThreeEvidence } from '../core/workflowProtocol'

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
  projectName: string | null
  sceneSeven: (SceneSevenFormValues & { messageIndex: number }) | null
  sceneSevenResponseIndex: number | null
  sceneEight: (SceneEightFormValues & { messageIndex: number }) | null
  sceneEightResponseIndex: number | null
  sceneNine: (SceneNineFormValues & { messageIndex: number }) | null
  sceneNineResponseIndex: number | null
  ontologyQueryIndex: number | null
  ontologyPayload: OntologyInstancesPanelPayload | null
  ontologyMessageIndex: number | null
  ontologyEvidenceKey: string | null
  compressedChunksArchiveDetected: boolean
  recoveryProjectRoot: string | null
  recoverableSceneThreeCount: number
  chunksRecoveredFromCompression: boolean
}

function findAssistantResponseIndex(
  messages: ConversationMessageView[],
  afterIndex: number | null,
  beforeIndex: number | null = null,
): number | null {
  if (afterIndex === null) {
    return null
  }
  const endIndex = beforeIndex ?? messages.length
  for (let index = afterIndex + 1; index < endIndex; index += 1) {
    if (messages[index].role === 'assistant') {
      return index
    }
  }
  return null
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
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
  let compressedChunksArchiveDetected = false
  const recoverableSceneThreeMessages: SceneThreeEvidence[] = []

  for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    const message = messages[messageIndex]
    if (message.role !== 'user') {
      continue
    }
    const text = getWorkflowMessageText(message)
    const parsed = parseSceneOneMessage(text)
    if (parsed) {
      sceneOne = { ...parsed, messageIndex }
    }
    if (
      text.includes('[context compressed]')
      && text.includes('$query-project-chunks')
    ) {
      compressedChunksArchiveDetected = true
    }
    const sceneThree = parseSceneThreeMessage(text)
    if (sceneThree) {
      recoverableSceneThreeMessages.push(sceneThree)
    }
  }
  const recoveryProjectRoots = new Set(
    recoverableSceneThreeMessages
      .map((item) => item.projectRoot)
      .filter(Boolean),
  )
  const recoveryProjectRoot = recoveryProjectRoots.size === 1
    ? recoverableSceneThreeMessages.find((item) => item.projectRoot)?.projectRoot ?? null
    : null

  let chunksQueryIndex: number | null = null
  for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
    const message = messages[messageIndex]
    if (
      // QwenPaw may compact the original scene-one prompt while retaining the
      // later chunks query and result. In that case the latest query becomes
      // the recovery anchor for the review checkpoint.
      messageIndex > (sceneOne?.messageIndex ?? -1)
      && message.role === 'user'
      && getWorkflowMessageText(message).startsWith(CHUNKS_QUERY_OPENING)
    ) {
      chunksQueryIndex = messageIndex
    }
  }

  let chunksEnvelope: ChunksEnvelope | null = null
  let chunksMessageId: string | null = null
  let chunksMessageIndex: number | null = null
  let chunksEvidenceKey: string | null = null
  const chunksRecoveredFromCompression = chunksQueryIndex !== null
    && getWorkflowMessageText(messages[chunksQueryIndex]).includes(CHUNKS_RECOVERY_REASON)
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
    const progressStartIndex = chunksRecoveredFromCompression
      ? 0
      : chunksMessageIndex + 1
    for (let messageIndex = progressStartIndex; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      if (message.role !== 'user') {
        continue
      }
      const sceneThree = parseSceneThreeMessage(getWorkflowMessageText(message))
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
        && getWorkflowMessageText(message).startsWith(DSL_QUERY_OPENING)
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

  const projectName = toTrimmedString(
    chunksEnvelope?.data?.project_relation_seed?.project_name,
  ) || null

  let sceneSeven: OntologyWorkflowEvidence['sceneSeven'] = null
  if (dslQueryIndex !== null) {
    for (let messageIndex = dslQueryIndex + 1; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      if (message.role !== 'user') {
        continue
      }
      const parsed = parseSceneSevenMessage(getWorkflowMessageText(message))
      if (parsed) {
        sceneSeven = { ...parsed, messageIndex }
      }
    }
  }

  let sceneEight: OntologyWorkflowEvidence['sceneEight'] = null
  if (sceneSeven) {
    for (let messageIndex = sceneSeven.messageIndex + 1; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      if (message.role !== 'user') {
        continue
      }
      const parsed = parseSceneEightMessage(getWorkflowMessageText(message))
      if (parsed) {
        sceneEight = { ...parsed, messageIndex }
      }
    }
  }

  let sceneNine: OntologyWorkflowEvidence['sceneNine'] = null
  if (sceneEight) {
    for (let messageIndex = sceneEight.messageIndex + 1; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      if (message.role !== 'user') {
        continue
      }
      const parsed = parseSceneNineMessage(getWorkflowMessageText(message))
      if (parsed) {
        sceneNine = { ...parsed, messageIndex }
      }
    }
  }

  let ontologyQueryIndex: number | null = null
  if (sceneNine) {
    for (let messageIndex = sceneNine.messageIndex + 1; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      if (
        message.role === 'user'
        && getWorkflowMessageText(message).startsWith(ONTOLOGY_QUERY_OPENING)
      ) {
        ontologyQueryIndex = messageIndex
      }
    }
  }

  let ontologyPayload: OntologyInstancesPanelPayload | null = null
  let ontologyMessageIndex: number | null = null
  let ontologyEvidenceKey: string | null = null
  if (ontologyQueryIndex !== null) {
    for (let messageIndex = ontologyQueryIndex + 1; messageIndex < messages.length; messageIndex += 1) {
      const message = messages[messageIndex]
      for (const panel of extractToolPanels(message)) {
        if (panel.handler.id === 'query-project-ontology-instances') {
          const payload = panel.payload as OntologyInstancesPanelPayload
          ontologyPayload = payload
          ontologyMessageIndex = messageIndex
          ontologyEvidenceKey = `${message.id}:${panel.callId}:${panel.partIndex}:${payload.state}`
        }
      }
    }
  }

  const sceneSevenResponseIndex = sceneSeven
    ? findAssistantResponseIndex(messages, sceneSeven.messageIndex, sceneEight?.messageIndex)
      ?? sceneEight?.messageIndex
      ?? null
    : null
  const sceneEightResponseIndex = sceneEight
    ? findAssistantResponseIndex(messages, sceneEight.messageIndex, sceneNine?.messageIndex)
      ?? sceneNine?.messageIndex
      ?? null
    : null
  const sceneNineResponseIndex = sceneNine
    ? findAssistantResponseIndex(messages, sceneNine.messageIndex, ontologyQueryIndex)
      ?? ontologyQueryIndex
      ?? null
    : null

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
    projectName,
    sceneSeven,
    sceneSevenResponseIndex,
    sceneEight,
    sceneEightResponseIndex,
    sceneNine,
    sceneNineResponseIndex,
    ontologyQueryIndex,
    ontologyPayload,
    ontologyMessageIndex,
    ontologyEvidenceKey,
    compressedChunksArchiveDetected,
    recoveryProjectRoot,
    recoverableSceneThreeCount: recoverableSceneThreeMessages.length,
    chunksRecoveredFromCompression,
  }
}
