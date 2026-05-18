import type { ModelStrategy } from '../types'
import { exportGraphTOJSON } from './exportGraph'
import importGraphFromJSON from './importGraph'

export * from './exportTypes'

const environmentStrategy: ModelStrategy = {
    exportGraphToJSON: exportGraphTOJSON,
    importGraphFromJSON: importGraphFromJSON
}

export default environmentStrategy