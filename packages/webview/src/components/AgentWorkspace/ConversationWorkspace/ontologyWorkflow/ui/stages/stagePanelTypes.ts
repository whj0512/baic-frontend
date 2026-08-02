import type { OntologyWorkflowEvidence } from '../../state/deriveWorkflowState'

export type SendWorkflowText = (text: string) => Promise<boolean>

export interface BaseStagePanelProps {
  evidence: OntologyWorkflowEvidence
  canSend: boolean
  streaming: boolean
  sendText: SendWorkflowText
}
