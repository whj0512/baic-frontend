import { GraphStrategy } from './types'
import environmentStrategy from './environment'
import interactionStrategy from './interaction'
import internalCompositionStrategy from './internalComposition'
import moduleResponsesStrategy from './moduleResponses'
import internalConstraintsStrategy from './internalConstraints'

const strategies: Record<string, GraphStrategy> = {
  environment: environmentStrategy,
  interaction: interactionStrategy,
  internalComposition: internalCompositionStrategy,
  moduleResponses: moduleResponsesStrategy,
  internalConstraints: internalConstraintsStrategy,
}

// Default fallback (can be empty or environment)
const defaultStrategy: GraphStrategy = {
    sidebarItems: []
}

export const getStrategy = (key: string): GraphStrategy => {
  return strategies[key] || defaultStrategy
}
