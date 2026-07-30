import type {
  BusinessAgentDefinition,
  BusinessAgentHealth,
} from './types'
import type {
  QwenPawAgent,
  QwenPawConnectionState,
} from '../qwenPaw/types'

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (!value || seen.has(value)) {
      throw new Error(`${label} 必须是非空且唯一的 ID：${value || '(empty)'}`)
    }
    seen.add(value)
  }
}

export function validateBusinessAgentDefinition(
  definition: BusinessAgentDefinition,
): void {
  if (!definition.id || !definition.name) {
    throw new Error('业务智能体定义必须包含 id 和 name')
  }

  assertUnique(definition.requiredAgentIds, `${definition.id}.requiredAgentIds`)
  assertUnique(definition.entryAgentIds, `${definition.id}.entryAgentIds`)
  assertUnique(
    definition.steps.map((step) => step.id),
    `${definition.id}.steps`,
  )
  assertUnique(
    definition.artifactGroups.map((group) => group.id),
    `${definition.id}.artifactGroups`,
  )
  assertUnique(
    definition.artifactQueries.map((query) => query.id),
    `${definition.id}.artifactQueries`,
  )

  const requiredAgentIds = new Set(definition.requiredAgentIds)
  const stepIds = new Set(definition.steps.map((step) => step.id))
  for (const entryAgentId of definition.entryAgentIds) {
    if (!requiredAgentIds.has(entryAgentId)) {
      throw new Error(
        `${definition.id} 的入口 Agent ${entryAgentId} 不在 requiredAgentIds 中`,
      )
    }
  }

  const handlerKeys = new Set<string>()
  for (const query of definition.artifactQueries) {
    if (!stepIds.has(query.stepId)) {
      throw new Error(`${definition.id} 查询 ${query.id} 引用了未知步骤`)
    }
    if (!definition.entryAgentIds.includes(query.entryAgentId)) {
      throw new Error(`${definition.id} 查询 ${query.id} 引用了非入口 Agent`)
    }
    const handlerKey = `${query.delivery}:${query.handlerId}`
    if (handlerKeys.has(handlerKey)) {
      throw new Error(`${definition.id} 查询 handler 重复：${handlerKey}`)
    }
    handlerKeys.add(handlerKey)
  }
}

const definitions = new Map<string, BusinessAgentDefinition>()

export function registerBusinessAgent(
  definition: BusinessAgentDefinition,
): BusinessAgentDefinition {
  validateBusinessAgentDefinition(definition)
  const existing = definitions.get(definition.id)
  if (existing && existing !== definition) {
    throw new Error(`业务智能体 ID 已注册：${definition.id}`)
  }
  definitions.set(definition.id, definition)
  return definition
}

export function getBusinessAgent(
  businessAgentId: string,
): BusinessAgentDefinition | null {
  return definitions.get(businessAgentId) ?? null
}

export function listBusinessAgents(): BusinessAgentDefinition[] {
  return [...definitions.values()]
}

export function getBusinessAgentHealth(
  definition: BusinessAgentDefinition,
  agents: QwenPawAgent[],
  connectionState: QwenPawConnectionState,
): BusinessAgentHealth {
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]))
  const dependencies = definition.requiredAgentIds.map((id) => {
    const agent = agentsById.get(id) ?? null
    const state =
      connectionState !== 'online'
        ? 'offline'
        : !agent
          ? 'missing'
          : !agent.enabled
            ? 'disabled'
            : !agent.active_model?.provider_id || !agent.active_model.model
              ? 'model-missing'
              : 'available'

    return {
      id,
      agent,
      state,
      available: state === 'available',
    } as const
  })

  return {
    businessAgentId: definition.id,
    available: dependencies.every((dependency) => dependency.available),
    connectionState,
    dependencies,
  }
}
