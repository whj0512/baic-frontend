import type { Project } from '../models/Project'
import type { Requirement } from '../models/Requirement'

export type MockProjectStatus = 'active' | 'archived'

export type MockUploadStatus = 'processing' | 'succeeded' | 'failed' | 'deduplicated'

export interface MockProjectSnapshot {
  schema_version: 1
  source: {
    installation_id: string
    project_id: string
  }
  project: Project
  requirements: Requirement[]
  exported_at: string
}

export interface MockProjectVersion {
  id: string
  versionNumber: number
  versionLabel?: string
  releaseNotes?: string
  uploadId: string
  deduplicated: boolean
  createdAt: string
  snapshot: MockProjectSnapshot
}

export interface MockPlatformProject {
  id: string
  name: string
  description: string
  status: MockProjectStatus
  sourceInstallationId: string
  sourceProjectId: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
  versions: MockProjectVersion[]
}

export interface MockUploadRecord {
  id: string
  projectId: string
  projectName: string
  sourceInstallationId: string
  status: MockUploadStatus
  versionId?: string
  versionNumber?: number
  deduplicated: boolean
  errorMessage?: string
  createdAt: string
  completedAt?: string
}
