import type { Project } from './Project'
import type { ReqRelationship } from './ReqRelationship'
import type { Requirement } from './Requirement'

export type ProjectSnapshotV1 = {
  schema_version: 1
  source: {
    installation_id: string
    project_id: string
  }
  project: Project & Record<string, unknown>
  publisher: {
    local_user_id?: string
    email?: string
  }
  requirements: Requirement[]
  entities: {
    devices: Array<Record<string, unknown>>
    control_units: Array<Record<string, unknown>>
  }
  relationships: ReqRelationship[]
  exported_at: string
}

export type PublishRequest = {
  snapshot: ProjectSnapshotV1
  version_label?: string
  release_notes?: string
}

export type PublishResponse = {
  remote_project_id: string
  version_id: string
  version_number: number
  upload_id: string
  deduplicated: boolean
}

export type PublishStage = 'idle' | 'exporting' | 'uploading' | 'success' | 'error'
