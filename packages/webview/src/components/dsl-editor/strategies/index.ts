import environmentStrategy from "./environment";
import interactionStrategy from "./interaction";
import internalCompositionStrategy from "./internalComposition";
import internalConstraintsStrategy from "./internalConstraints";
import type { DslEditorStrategy } from "./type";

const strategies: Record<string, DslEditorStrategy> = {
    environment: environmentStrategy,
    interaction: interactionStrategy,
    internalComposition: internalCompositionStrategy,
    moduleResponses: interactionStrategy,
    internalConstraints: internalConstraintsStrategy,
}

// Default fallback (can be empty or environment)
const defaultStrategy: DslEditorStrategy = {
    languageId: 'environment',
}

export const getStrategy = (key: string): DslEditorStrategy => {
    return strategies[key] || defaultStrategy
}
