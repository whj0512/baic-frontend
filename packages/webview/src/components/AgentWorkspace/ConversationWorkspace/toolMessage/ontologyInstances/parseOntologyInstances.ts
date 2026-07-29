import type { ConversationPart } from '../../../qwenPaw/types'
import type {
  OntologyInstancesEnvelope,
  OntologyInstancesPanelPayload,
} from './types'

type ToolPart = Extract<ConversationPart, { type: 'tool' }>

const SKILL_SCRIPT_PATTERN =
  /(?:^|[\/\s"'])(?:query-project-ontology-instances\/)?scripts\/emit_ontology_instance_panel\.py(?:["'\s]|$)/iu

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function getCommand(input: unknown): string | null {
  let value = input
  if (typeof value === 'string') {
    value = parseJson(value) ?? value
  }

  if (typeof value === 'string') {
    return value
  }
  if (isRecord(value) && typeof value.command === 'string') {
    return value.command
  }
  return null
}

function unwrapTextOutput(value: unknown): string | null {
  if (typeof value === 'string') {
    const expanded = parseJson(value)
    if (expanded !== undefined && expanded !== value) {
      return unwrapTextOutput(expanded) ?? value
    }
    return value
  }

  if (Array.isArray(value)) {
    const textParts = value.flatMap((item) =>
      isRecord(item) && item.type === 'text' && typeof item.text === 'string'
        ? [item.text]
        : [])
    return textParts.length > 0 ? textParts.join('') : null
  }

  if (isRecord(value)) {
    if (value.type === 'text' && typeof value.text === 'string') {
      return value.text
    }
    if (value.output !== undefined) {
      return unwrapTextOutput(value.output)
    }
    if (value.result !== undefined) {
      return unwrapTextOutput(value.result)
    }
  }

  return null
}

function parseEnvelope(value: unknown): OntologyInstancesEnvelope | null {
  if (
    !isRecord(value)
    || value.protocol_version !== '1.0'
    || value.panel !== 'req-relationship'
    || value.status !== 'ready'
    || value.error !== null
    || !isRecord(value.query)
  ) {
    return null
  }

  const query = value.query
  if (
    query.root !== null
    || query.depth !== 1
    || query.origin !== 'all'
    || query.node_limit !== 200
    || query.edge_limit !== 500
    || query.include_properties !== false
  ) {
    return null
  }

  return {
    protocol_version: '1.0',
    panel: 'req-relationship',
    status: 'ready',
    query: {
      root: null,
      depth: 1,
      origin: 'all',
      node_limit: 200,
      edge_limit: 500,
      include_properties: false,
    },
    error: null,
  }
}

export function isOntologyInstancesToolPart(part: ToolPart): boolean {
  if (part.name !== 'execute_shell_command') {
    return false
  }

  const command = getCommand(part.input)
  return command
    ? SKILL_SCRIPT_PATTERN.test(command.replaceAll('\\', '/'))
    : false
}

export function parseOntologyInstancesToolPart(
  part: ToolPart,
): OntologyInstancesPanelPayload {
  if (part.output === undefined) {
    return { state: 'loading' }
  }

  const textOutput = unwrapTextOutput(part.output)
  if (!textOutput) {
    return {
      state: 'parse-error',
      message: '工具结果中没有可解析的文本内容。',
    }
  }

  const envelope = parseEnvelope(parseJson(textOutput))
  if (!envelope) {
    return {
      state: 'parse-error',
      message: '工具结果不是完整、有效的本体实例卡片 v1.0 协议。',
    }
  }

  return { state: 'ready', envelope }
}
