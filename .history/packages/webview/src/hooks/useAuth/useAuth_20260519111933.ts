import { useEffect, useState } from 'react'
import {
  getAuthSnapshotSync,
  refreshAuthSnapshot,
  subscribeAuth,
  type AuthSnapshot,
} from '../config/authClient'

export function useAuth(): AuthSnapshot {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(() => getAuthSnapshotSync())

  useEffect(() => {
    const unsubscribe = subscribeAuth(setSnapshot)
    refreshAuthSnapshot().catch(() => {
      setSnapshot({ status: 'unauthenticated' })
    })

    return unsubscribe
  }, [])

  return snapshot
}
