import { useMemo } from 'react'
import type {
  QwenPawAgent,
  QwenPawConnectionState,
} from '../qwenPaw/types'
import { getBusinessAgentHealth } from './registry'
import type { BusinessAgentDefinition } from './types'
import { useAgentTaskRuns } from './useAgentTaskRuns'

interface UseAgentTaskWorkflowOptions {
  projectId: string | null
  definition: BusinessAgentDefinition
  agents: QwenPawAgent[]
  connectionState: QwenPawConnectionState
}

export function useAgentTaskWorkflow({
  projectId,
  definition,
  agents,
  connectionState,
}: UseAgentTaskWorkflowOptions) {
  const health = useMemo(
    () => getBusinessAgentHealth(definition, agents, connectionState),
    [agents, connectionState, definition],
  )
  const runs = useAgentTaskRuns(projectId, definition)

  return {
    definition,
    health,
    canStart: Boolean(projectId) && health.available,
    ...runs,
  }
}
