import { createContext, useContext } from 'react'
import type { OntologyWorkflowInteraction } from '../core/types'

export const OntologyWorkflowInteractionContext =
  createContext<OntologyWorkflowInteraction | null>(null)

export function useOntologyWorkflowInteraction(): OntologyWorkflowInteraction | null {
  return useContext(OntologyWorkflowInteractionContext)
}
