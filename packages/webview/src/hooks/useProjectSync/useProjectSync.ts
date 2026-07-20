import { useCallback, useEffect, useRef, useState } from 'react'
import type { Requirement } from '../../models/Requirement'
import { WS_ENDPOINTS } from '../../config/api'

interface WebSocketMessage {
  event: 'initial_state' | 'requirement_created' | 'requirement_updated'
  requirements?: Requirement[]
  requirement?: Requirement
  requirement_id?: string
  diff?: Record<string, { before: unknown; after: unknown }>
}

const MAX_RETRIES = 5
const HEARTBEAT_INTERVAL = 15000

export function useProjectSync(projectId: string | undefined) {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    if (!projectId) {
      cleanup()
      setRequirements([])
      return
    }

    function connect() {
      const ws = new WebSocket(WS_ENDPOINTS.projectSync(projectId))
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        retryCountRef.current = 0
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          switch (message.event) {
            case 'initial_state':
              setRequirements(message.requirements ?? [])
              break
            case 'requirement_created':
              if (message.requirement) {
                setRequirements(previous => [...previous, message.requirement!])
              }
              break
            case 'requirement_updated':
              if (message.requirement_id && message.diff) {
                setRequirements(previous => previous.map(requirement => {
                  if (requirement.id !== message.requirement_id) return requirement
                  const updated = { ...requirement }
                  Object.entries(message.diff!).forEach(([field, change]) => {
                    ;(updated as Record<string, unknown>)[field] = change.after
                  })
                  return updated
                }))
              }
              break
          }
        } catch (error) {
          console.error('[WS] Failed to parse message:', error)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current)
          heartbeatTimerRef.current = null
        }
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1
          const delay = Math.min(1000 * 2 ** retryCountRef.current, 30000)
          retryTimerRef.current = setTimeout(connect, delay)
        }
      }
    }

    connect()
    return cleanup
  }, [projectId, cleanup])

  return {
    requirements,
    isConnected,
    removeRequirement: (id: string) => setRequirements(previous => previous.filter(requirement => requirement.id !== id)),
  }
}
