import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { createMockProjects, createMockUploads } from './mockData'
import type { MockPlatformProject, MockProjectStatus, MockUploadRecord } from './mockTypes'

interface PlatformMockContextValue {
  projects: MockPlatformProject[]
  uploads: MockUploadRecord[]
  updateProjectStatus: (projectId: string, status: MockProjectStatus) => void
  deleteProject: (projectId: string) => void
}

const PlatformMockContext = createContext<PlatformMockContextValue | null>(null)

export function PlatformMockProvider({ children }: PropsWithChildren) {
  const [projects, setProjects] = useState(createMockProjects)
  const [uploads] = useState(createMockUploads)

  const updateProjectStatus = useCallback((projectId: string, status: MockProjectStatus) => {
    setProjects(current => current.map(project => (
      project.id === projectId
        ? {
            ...project,
            status,
            archivedAt: status === 'archived' ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
          }
        : project
    )))
  }, [])

  const deleteProject = useCallback((projectId: string) => {
    setProjects(current => current.filter(project => project.id !== projectId))
  }, [])

  const value = useMemo(() => ({
    projects,
    uploads,
    updateProjectStatus,
    deleteProject,
  }), [deleteProject, projects, updateProjectStatus, uploads])

  return (
    <PlatformMockContext.Provider value={value}>
      {children}
    </PlatformMockContext.Provider>
  )
}

export function usePlatformMock() {
  const context = useContext(PlatformMockContext)
  if (!context) {
    throw new Error('usePlatformMock must be used within PlatformMockProvider')
  }
  return context
}
