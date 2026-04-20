import type { ModelStrategy } from '../types'
import { exportGraphTOJSON } from './exportGraph'
import importGraphFromJSON from './importGraph'

export * from './exportTypes'

const internalCompositionStrategy: ModelStrategy = {
    exportGraphToJSON: exportGraphTOJSON,
    importGraphFromJSON: importGraphFromJSON
}

export default internalCompositionStrategy