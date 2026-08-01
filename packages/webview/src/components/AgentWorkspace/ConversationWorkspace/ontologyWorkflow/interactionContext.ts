import { createContext, useContext } from 'react'
import type { OntologyWorkflowInteraction } from './types'

export const OntologyWorkflowInteractionContext =
  createContext<OntologyWorkflowInteraction | null>(null)

export function useOntologyWorkflowInteraction(): OntologyWorkflowInteraction | null {
  return useContext(OntologyWorkflowInteractionContext)
}
