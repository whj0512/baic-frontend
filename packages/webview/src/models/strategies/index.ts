import type { ModelStrategy } from './types'
import environmentStrategy from './environment'
import interactionStrategy from './interaction'
import internalCompositionStrategy from './internalComposition'
import internalConstraintsStrategy from './internalConstraints'
import dialogMapStrategy from './dialogMap'

const strategies: Record<string, ModelStrategy> = {
  environment: environmentStrategy,
  interaction: interactionStrategy,
  internalComposition: internalCompositionStrategy,
  moduleResponses: interactionStrategy,
  internalConstraints: internalConstraintsStrategy,
  dialogMap: dialogMapStrategy,
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
