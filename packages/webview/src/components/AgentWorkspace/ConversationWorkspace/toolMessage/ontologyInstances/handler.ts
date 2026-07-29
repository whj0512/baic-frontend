import { defineToolPanelHandler } from '../defineToolPanelHandler'
import OntologyInstancesPanel from './OntologyInstancesPanel'
import {
  isOntologyInstancesToolPart,
  parseOntologyInstancesToolPart,
} from './parseOntologyInstances'

export const ontologyInstancesToolPanelHandler =
  defineToolPanelHandler({
    id: 'query-project-ontology-instances',
    matches: isOntologyInstancesToolPart,
    parse: parseOntologyInstancesToolPart,
    Component: OntologyInstancesPanel,
  })
