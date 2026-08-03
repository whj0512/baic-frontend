import { defineToolPanelHandler } from '../defineToolPanelHandler'
import FunctionRelationsPanel from './FunctionRelationsPanel'
import {
  isFunctionRelationsToolPart,
  parseFunctionRelationsToolPart,
} from './parseFunctionRelations'

export const functionRelationsToolPanelHandler = defineToolPanelHandler({
  id: 'query-project-function-relations',
  matches: isFunctionRelationsToolPart,
  parse: parseFunctionRelationsToolPart,
  Component: FunctionRelationsPanel,
})
