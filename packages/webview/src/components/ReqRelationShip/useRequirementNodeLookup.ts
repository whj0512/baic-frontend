import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchRequirementByName,
  RequirementNodeLookupError,
} from './requirementNodeLookup'
import type {
  RequirementNodeLookupState,
  RequirementNodeLookupTarget,
} from './requirementNodeLookup'

const IDLE_LOOKUP_STATE: RequirementNodeLookupState = {
  status: 'idle',
  target: null,
}

export function useRequirementNodeLookup(projectId: string) {
  const [state, setState] = useState<RequirementNodeLookupState>(IDLE_LOOKUP_STATE)
  const requestRef = useRef<{ sequence: number; controller: AbortController | null }>({
    sequence: 0,
    controller: null,
  })

  const cancelLookup = useCallback(() => {
    requestRef.current.sequence += 1
    requestRef.current.controller?.abort()
    requestRef.current.controller = null
    setState(IDLE_LOOKUP_STATE)
  }, [])

  const runLookup = useCallback(async (target: RequirementNodeLookupTarget) => {
    requestRef.current.controller?.abort()
    const controller = new AbortController()
    const sequence = requestRef.current.sequence + 1
    requestRef.current = { sequence, controller }
    setState({ status: 'loading', target })

    try {
      const requirementId = await fetchRequirementByName(
        projectId,
        target.name,
        controller.signal,
      )
      if (controller.signal.aborted || requestRef.current.sequence !== sequence) return

      setState({ status: 'success', target, requirementId })
    } catch (error) {
      if (controller.signal.aborted || requestRef.current.sequence !== sequence) return

      const message = error instanceof RequirementNodeLookupError
        ? error.message
        : error instanceof Error && error.message === '需求查询接口返回了无效数据'
          ? error.message
          : '查询需求详情失败，请稍后重试'
      setState({ status: 'error', target, message })
    } finally {
      if (requestRef.current.sequence === sequence) {
        requestRef.current.controller = null
      }
    }
  }, [projectId])

  const selectTarget = useCallback((target: RequirementNodeLookupTarget | null) => {
    if (!target) {
      cancelLookup()
      return
    }
    void runLookup(target)
  }, [cancelLookup, runLookup])

  const retry = useCallback(() => {
    if (state.status !== 'error') return
    void runLookup(state.target)
  }, [runLookup, state])

  useEffect(() => {
    cancelLookup()
    return cancelLookup
  }, [cancelLookup, projectId])

  return {
    state,
    selectTarget,
    retry,
  }
}
