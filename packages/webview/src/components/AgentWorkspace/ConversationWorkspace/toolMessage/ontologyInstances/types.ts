import type { GraphDBGraphRequest } from '../../../../../models/GraphDBGraph'

export interface OntologyInstancesEnvelope {
  protocol_version: '1.0'
  panel: 'req-relationship'
  status: 'ready'
  query: Required<
    Pick<
      GraphDBGraphRequest,
      | 'root'
      | 'depth'
      | 'origin'
      | 'node_limit'
      | 'edge_limit'
      | 'include_properties'
    >
  >
  error: null
}

export type OntologyInstancesPanelPayload =
  | { state: 'loading' }
  | { state: 'ready'; envelope: OntologyInstancesEnvelope }
  | { state: 'parse-error'; message: string }
