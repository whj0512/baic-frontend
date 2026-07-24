import type { ModelStrategy } from '../types'
import importGraphFromJSON from './importGraph'

const testcaseViewStrategy: ModelStrategy = {
  exportGraphToJSON: () => ({ nodes: [], transitions: [] }),
  importGraphFromJSON,
}

export default testcaseViewStrategy
