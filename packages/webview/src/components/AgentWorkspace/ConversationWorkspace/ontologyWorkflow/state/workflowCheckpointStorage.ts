import type { ConversationMessageView } from '../../../qwenPaw/types'
import { isOntologyInstancesToolPart } from '../../toolMessage/ontologyInstances/parseOntologyInstances'
import type { OntologyWorkflowEvidence } from './deriveWorkflowState'
import {
  DSL_QUERY_OPENING,
  ONTOLOGY_QUERY_OPENING,
  SCENE_EIGHT_OPENING,
  SCENE_NINE_OPENING,
  SCENE_SEVEN_OPENING,
  SCENE_THREE_OPENING,
} from '../core/workflowProtocol'

const CHECKPOINT_SCHEMA_VERSION = 1
const CHECKPOINT_KEY_PREFIX = 'baic:ontology-workflow-checkpoint'
const CHECKPOINT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export interface OntologyWorkflowCheckpoint {
  schemaVersion: 1
  kind: 'ontology-workflow-checkpoint'
  conversationKey: string
  updatedAt: string
  messages: ConversationMessageView[]
  chunksEvidenceKey: string
  latestModelingEvidenceKey: string | null
  dslEvidenceKey: string | null
  itemizationConfirmed: boolean
  functionModelingConfirmed: boolean
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getCheckpointKey(conversationKey: string): string {
  return [
    CHECKPOINT_KEY_PREFIX,
    CHECKPOINT_SCHEMA_VERSION,
    encodeURIComponent(conversationKey),
  ].join(':')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isCheckpointMessage(value: unknown): value is ConversationMessageView {
  if (!isRecord(value) || typeof value.id !== 'string' || !Array.isArray(value.parts)) {
    return false
  }
  if (value.role !== 'user' && value.role !== 'assistant') {
    return false
  }
  return value.parts.length > 0 && value.parts.every((part) => {
    if (!isRecord(part)) {
      return false
    }
    if (part.type === 'text') {
      return typeof part.text === 'string'
    }
    return part.type === 'tool' && typeof part.eventType === 'string'
  })
}

function isCheckpoint(value: unknown): value is OntologyWorkflowCheckpoint {
  return (
    isRecord(value)
    && value.schemaVersion === CHECKPOINT_SCHEMA_VERSION
    && value.kind === 'ontology-workflow-checkpoint'
    && typeof value.conversationKey === 'string'
    && typeof value.updatedAt === 'string'
    && Array.isArray(value.messages)
    && value.messages.every(isCheckpointMessage)
    && typeof value.chunksEvidenceKey === 'string'
    && (value.latestModelingEvidenceKey === null
      || typeof value.latestModelingEvidenceKey === 'string')
    && (value.dslEvidenceKey === null || typeof value.dslEvidenceKey === 'string')
    && typeof value.itemizationConfirmed === 'boolean'
    && typeof value.functionModelingConfirmed === 'boolean'
  )
}

function removeCheckpoint(conversationKey: string): void {
  const storage = getStorage()
  if (!storage) {
    return
  }
  try {
    storage.removeItem(getCheckpointKey(conversationKey))
  } catch {
    // A storage failure must not block the conversation UI.
  }
}

export function readOntologyWorkflowCheckpoint(
  conversationKey: string | null,
): OntologyWorkflowCheckpoint | null {
  if (!conversationKey) {
    return null
  }
  const storage = getStorage()
  if (!storage) {
    return null
  }
  try {
    const raw = storage.getItem(getCheckpointKey(conversationKey))
    if (!raw) {
      return null
    }
    const checkpoint: unknown = JSON.parse(raw)
    if (!isCheckpoint(checkpoint) || checkpoint.conversationKey !== conversationKey) {
      removeCheckpoint(conversationKey)
      return null
    }
    const updatedAt = Date.parse(checkpoint.updatedAt)
    if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > CHECKPOINT_MAX_AGE_MS) {
      removeCheckpoint(conversationKey)
      return null
    }
    return checkpoint
  } catch {
    removeCheckpoint(conversationKey)
    return null
  }
}

export function mergeOntologyWorkflowMessages(
  checkpoint: OntologyWorkflowCheckpoint | null,
  messages: ConversationMessageView[],
): ConversationMessageView[] {
  if (!checkpoint || checkpoint.messages.length === 0) {
    return messages
  }
  const currentIds = new Set(messages.map((message) => message.id))
  const restoredEvidenceChain = checkpoint.messages.filter(
    (message) => !currentIds.has(message.id),
  )
  if (restoredEvidenceChain.length === 0) {
    return messages
  }
  return [...restoredEvidenceChain, ...messages]
}

function getText(message: ConversationMessageView): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim()
}

function keepTextParts(message: ConversationMessageView): ConversationMessageView | null {
  const parts = message.parts.filter((part) => part.type === 'text')
  return parts.length > 0 ? { ...message, parts } : null
}

function keepOntologyToolParts(
  message: ConversationMessageView,
): ConversationMessageView | null {
  const parts = message.parts.filter((part) => (
    part.type === 'tool' && isOntologyInstancesToolPart(part)
  ))
  return parts.length > 0 ? { ...message, parts } : null
}

function collectCheckpointMessages(
  messages: ConversationMessageView[],
  evidence: OntologyWorkflowEvidence,
): ConversationMessageView[] {
  const chunksQueryIndex = evidence.chunksQueryIndex
  const chunksMessageIndex = evidence.chunksMessageIndex
  if (
    evidence.chunksEnvelope?.status !== 'success'
    || chunksQueryIndex === null
    || chunksMessageIndex === null
  ) {
    return []
  }

  const selected: ConversationMessageView[] = []
  const coreIndices = new Set([chunksQueryIndex, chunksMessageIndex])
  for (const index of coreIndices) {
    const message = messages[index]
    const textMessage = keepTextParts(message)
    if (textMessage) {
      selected.push(textMessage)
    }
  }
  for (let index = 0; index < messages.length; index += 1) {
    if (coreIndices.has(index) || index === evidence.ontologyMessageIndex) {
      continue
    }
    const message = messages[index]
    if (message.role !== 'user') {
      continue
    }
    const text = getText(message)
    const keepSceneThree =
      text.startsWith(SCENE_THREE_OPENING)
      && (evidence.chunksRecoveredFromCompression
        || index > chunksMessageIndex)
    const keepDslQuery =
      index > chunksMessageIndex
      && text.startsWith(DSL_QUERY_OPENING)
    const keepOntologyWorkflowMessage =
      text.startsWith(SCENE_SEVEN_OPENING)
      || text.startsWith(SCENE_EIGHT_OPENING)
      || text.startsWith(SCENE_NINE_OPENING)
      || text.startsWith(ONTOLOGY_QUERY_OPENING)
    if (!keepSceneThree && !keepDslQuery && !keepOntologyWorkflowMessage) {
      continue
    }
    const textMessage = keepTextParts(message)
    if (textMessage) {
      selected.push(textMessage)
    }
  }
  if (evidence.ontologyMessageIndex !== null) {
    const ontologyMessage = keepOntologyToolParts(
      messages[evidence.ontologyMessageIndex],
    )
    if (ontologyMessage) {
      selected.push(ontologyMessage)
    }
  }
  return selected
}

export function createOntologyWorkflowCheckpoint(
  conversationKey: string,
  messages: ConversationMessageView[],
  evidence: OntologyWorkflowEvidence,
  options: {
    itemizationConfirmed: boolean
    functionModelingConfirmed: boolean
  },
): OntologyWorkflowCheckpoint | null {
  if (!evidence.chunksEvidenceKey) {
    return null
  }
  const checkpointMessages = collectCheckpointMessages(messages, evidence)
  if (checkpointMessages.length === 0) {
    return null
  }
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    kind: 'ontology-workflow-checkpoint',
    conversationKey,
    updatedAt: new Date().toISOString(),
    messages: checkpointMessages,
    chunksEvidenceKey: evidence.chunksEvidenceKey,
    latestModelingEvidenceKey: evidence.latestModelingEvidenceKey,
    dslEvidenceKey: evidence.dslEvidenceKey,
    itemizationConfirmed: options.itemizationConfirmed,
    functionModelingConfirmed: options.functionModelingConfirmed,
  }
}

function getComparableCheckpoint(checkpoint: OntologyWorkflowCheckpoint): string {
  return JSON.stringify({
    ...checkpoint,
    updatedAt: undefined,
  })
}

export function checkpointsEqual(
  left: OntologyWorkflowCheckpoint | null,
  right: OntologyWorkflowCheckpoint | null,
): boolean {
  if (!left || !right) {
    return left === right
  }
  return getComparableCheckpoint(left) === getComparableCheckpoint(right)
}

export function saveOntologyWorkflowCheckpoint(
  checkpoint: OntologyWorkflowCheckpoint,
): boolean {
  const storage = getStorage()
  if (!storage) {
    return false
  }
  try {
    storage.setItem(
      getCheckpointKey(checkpoint.conversationKey),
      JSON.stringify(checkpoint),
    )
    return true
  } catch {
    return false
  }
}

export function clearOntologyWorkflowCheckpoint(
  conversationKey: string | null,
): void {
  if (conversationKey) {
    removeCheckpoint(conversationKey)
  }
}
