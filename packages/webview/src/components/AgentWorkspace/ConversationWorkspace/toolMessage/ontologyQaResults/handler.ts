import { defineToolPanelHandler } from '../defineToolPanelHandler'
import OntologyQaResultsPanel from './OntologyQaResultsPanel'
import {
  isOntologyQaResultsToolPart,
  parseOntologyQaResultsToolPart,
} from './parseOntologyQaResults'

export const ontologyQaResultsToolPanelHandler = defineToolPanelHandler({
  id: 'query-project-ontology-qa-results',
  matches: isOntologyQaResultsToolPart,
  parse: parseOntologyQaResultsToolPart,
  Component: OntologyQaResultsPanel,
})
