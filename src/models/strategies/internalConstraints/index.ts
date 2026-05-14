import type { ModelStrategy } from '../types'
import { exportGraphToJSON } from './exportGraph'
import importGraphFromJSON from './importGraph'
export * from './exportTypes'

const internalConstraintsStrategy: ModelStrategy = {
    exportGraphToJSON: exportGraphToJSON,
    importGraphFromJSON: importGraphFromJSON
}

export default internalConstraintsStrategy
