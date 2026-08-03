export interface ConversationQuickPrompt {
  id:
    | 'ontology-scene-9'
    | 'ontology-scene-9-results'
    | 'ontology-scene-10'
    | 'ontology-scene-10-results'
  label: string
  description: string
  requiresAuthorization: boolean
}

export interface OntologyQaQuickPromptsProps {
  projectDisplayName: string
  disabled: boolean
  disabledReason?: string
  onApplyPrompt: (prompt: string, onApplied?: () => void) => void
}
