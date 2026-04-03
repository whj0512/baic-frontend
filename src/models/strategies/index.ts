import type { ModelStrategy } from './types'
import environmentStrategy from './environment'
import interactionStrategy from './interaction'
import internalCompositionStrategy from './internalComposition'
import moduleResponsesStrategy from './moduleResponses'
import internalConstraintsStrategy from './internalConstraints'

const strategies: Record<string, ModelStrategy> = {
  environment: environmentStrategy,
  interaction: interactionStrategy,
  internalComposition: internalCompositionStrategy,
  moduleResponses: moduleResponsesStrategy,
  internalConstraints: internalConstraintsStrategy,
}

// Default fallback（空实现）
const defaultStrategy: ModelStrategy = {
  exportGraphToJSON: () => ({ nodes: [], transitions: [] }),
  importGraphFromJSON: () => ({ cells: [] }),
}

export const getModelStrategy = (key: string): ModelStrategy => {
  return strategies[key] || defaultStrategy
}

export type { ModelStrategy } from './types'
