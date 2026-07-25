import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAgents } from './qwenPawClient'
import {
  QwenPawError,
  type QwenPawAgent,
  type QwenPawConnectionState,
} from './types'

export function selectActiveAgentId(
  agents: QwenPawAgent[],
  currentAgentId?: string | null,
): string | null {
  if (
    currentAgentId
    && agents.some((agent) => agent.id === currentAgentId && agent.enabled)
  ) {
    return currentAgentId
  }

  const defaultAgent = agents.find(
    (agent) => agent.id === 'default' && agent.enabled,
  )
  if (defaultAgent) {
    return defaultAgent.id
  }

  return agents.find((agent) => agent.enabled)?.id ?? null
}

export function useQwenPawAgents() {
  const [agents, setAgents] = useState<QwenPawAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<QwenPawError | null>(null)
  const [connectionState, setConnectionState] =
    useState<QwenPawConnectionState>('checking')
  const [reloadVersion, setReloadVersion] = useState(0)
  const requestIdRef = useRef(0)

  const reload = useCallback(() => {
    setReloadVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setLoading(true)
    setError(null)
    setConnectionState('checking')

    void fetchAgents(controller.signal)
      .then((nextAgents) => {
        if (
          controller.signal.aborted
          || requestIdRef.current !== requestId
        ) {
          return
        }

        setAgents(nextAgents)
        setConnectionState('online')
      })
      .catch((requestError: unknown) => {
        if (
          controller.signal.aborted
          || requestIdRef.current !== requestId
        ) {
          return
        }

        const qwenPawError =
          requestError instanceof QwenPawError
            ? requestError
            : new QwenPawError('network', '无法加载 QwenPaw Agent', {
                cause: requestError,
              })
        setError(qwenPawError)
        setConnectionState('offline')
      })
      .finally(() => {
        if (
          !controller.signal.aborted
          && requestIdRef.current === requestId
        ) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [reloadVersion])

  return {
    agents,
    loading,
    error,
    connectionState,
    reload,
  }
}
