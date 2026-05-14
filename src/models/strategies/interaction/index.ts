import type { ModelStrategy } from '../types'
import { exportGraphTOJSON } from './exportGraph'
import importGraphFromJSON from './importGraph'

export * from './exportTypes'

const interactionStrategy: ModelStrategy = {
    exportGraphToJSON: exportGraphTOJSON,
    importGraphFromJSON: importGraphFromJSON,
}

export default interactionStrategy