import type { Requirement } from '../models/Requirement'
import type {
  MockPlatformProject,
  MockProjectSnapshot,
  MockProjectVersion,
  MockUploadRecord,
} from './mockTypes'

const INSTALLATION_ID = '6fc30f5b-5d99-4a1c-92e3-1bc4f42e7e90'

const createGraph = (prefix: string, accent: string) => ({
  cells: [
    {
      id: `${prefix}-source`,
      shape: 'rect',
      x: 90,
      y: 120,
      width: 150,
      height: 54,
      attrs: {
        body: { fill: '#ffffff', stroke: accent, strokeWidth: 2, rx: 8, ry: 8 },
        label: { text: '输入信号', fill: '#1f2937', fontSize: 14 },
      },
    },
    {
      id: `${prefix}-target`,
      shape: 'rect',
      x: 380,
      y: 120,
      width: 150,
      height: 54,
      attrs: {
        body: { fill: '#ffffff', stroke: accent, strokeWidth: 2, rx: 8, ry: 8 },
        label: { text: '系统响应', fill: '#1f2937', fontSize: 14 },
      },
    },
    {
      id: `${prefix}-edge`,
      shape: 'edge',
      source: { cell: `${prefix}-source` },
      target: { cell: `${prefix}-target` },
      attrs: {
        line: {
          stroke: accent,
          strokeWidth: 2,
          targetMarker: { name: 'block', width: 10, height: 8 },
        },
      },
      labels: [{ attrs: { labelText: { text: '触发' } } }],
    },
  ],
})

const createRequirement = (
  id: string,
  projectId: string,
  name: string,
  description: string,
  revision: number,
): Requirement => ({
  id,
  project_id: projectId,
  name,
  nl_text: description,
  created_by: 'kevingriffith@example.org',
  created_at: '2026-06-18T08:30:00.000Z',
  updated_at: revision > 1 ? '2026-07-12T09:18:00.000Z' : '2026-06-18T08:30:00.000Z',
  type: revision % 2 === 0 ? '系统级' : '部件级',
  subtype: revision % 2 === 0 ? '控制逻辑' : '执行机构',
  dsl_IBD: `environment ${id} {\n  sensor InputSignal\n  actuator SystemResponse\n}`,
  dsl_ESD: `interaction ${id} {\n  InputSignal -> SystemResponse: trigger\n}`,
  dsl_BDD: `composition ${id} {\n  module Controller\n  module Actuator\n}`,
  dsl_ISD: `response ${id} {\n  Controller -> Actuator: execute\n}`,
  dsl_SC: `constraint ${id} {\n  when InputSignal.active then SystemResponse.enable\n}`,
  graph_IBD: createGraph(`${id}-ibd`, '#2563eb'),
  graph_ESD: createGraph(`${id}-esd`, '#16a34a'),
  graph_BDD: createGraph(`${id}-bdd`, '#7c3aed'),
  graph_ISD: createGraph(`${id}-isd`, '#db2777'),
  graph_SC: createGraph(`${id}-sc`, '#d97706'),
})

const createSnapshot = (
  remoteProjectId: string,
  localProjectId: string,
  name: string,
  description: string,
  versionNumber: number,
): MockProjectSnapshot => {
  const exportedAt = versionNumber > 1
    ? '2026-07-12T09:20:00.000Z'
    : '2026-06-18T08:35:00.000Z'

  return {
    schema_version: 1,
    source: {
      installation_id: INSTALLATION_ID,
      project_id: localProjectId,
    },
    project: {
      id: localProjectId,
      key: localProjectId.toUpperCase(),
      name,
      description,
      created_by: 'kevingriffith@example.org',
      created_at: '2026-06-18T08:20:00.000Z',
      updated_at: exportedAt,
    },
    requirements: [
      createRequirement(
        `${remoteProjectId}-req-brake`,
        localProjectId,
        versionNumber > 1 ? '制动信号响应与降级控制' : '制动信号响应',
        versionNumber > 1
          ? '系统应在接收到有效制动信号后完成制动，并在信号异常时进入安全降级模式。'
          : '系统应在接收到有效制动信号后完成制动响应。',
        versionNumber,
      ),
      createRequirement(
        `${remoteProjectId}-req-status`,
        localProjectId,
        '执行状态反馈',
        '执行机构应持续反馈当前状态，并在超时后产生可诊断的错误信息。',
        versionNumber + 1,
      ),
      ...(versionNumber > 1 ? [
        createRequirement(
          `${remoteProjectId}-req-recovery`,
          localProjectId,
          '故障恢复策略',
          '故障条件解除后，系统应完成自检并在满足恢复条件时返回正常工作状态。',
          versionNumber + 2,
        ),
      ] : []),
    ],
    exported_at: exportedAt,
  }
}

const createVersion = (
  projectId: string,
  localProjectId: string,
  projectName: string,
  description: string,
  versionNumber: number,
  deduplicated = false,
): MockProjectVersion => ({
  id: `${projectId}-version-${versionNumber}`,
  versionNumber,
  versionLabel: versionNumber === 1 ? '首次发布' : '安全策略完善',
  releaseNotes: versionNumber === 1
    ? '建立基础需求模型。'
    : '增加信号异常降级和故障恢复需求。',
  uploadId: `upload-${projectId}-${versionNumber}`,
  deduplicated,
  createdAt: versionNumber === 1
    ? '2026-06-18T08:35:00.000Z'
    : '2026-07-12T09:20:00.000Z',
  snapshot: createSnapshot(projectId, localProjectId, projectName, description, versionNumber),
})

const createProject = (
  index: number,
  options?: { archived?: boolean; versionCount?: number },
): MockPlatformProject => {
  const id = index === 1 ? 'remote-brake-control' : `remote-project-${String(index).padStart(2, '0')}`
  const localProjectId = index === 1 ? 'brake-control' : `local-project-${String(index).padStart(2, '0')}`
  const name = index === 1 ? '智能制动控制系统' : `示例需求项目 ${String(index).padStart(2, '0')}`
  const description = index === 1
    ? '车辆制动信号采集、执行控制与安全降级需求模型。'
    : `用于展示远程平台项目检索、版本管理和只读需求浏览的 mock 项目 ${index}。`
  const versionCount = options?.versionCount ?? (index % 3 === 0 ? 2 : 1)
  const versions = Array.from({ length: versionCount }, (_, versionIndex) => (
    createVersion(id, localProjectId, name, description, versionIndex + 1, index === 5 && versionIndex === 1)
  )).reverse()

  return {
    id,
    name,
    description,
    status: options?.archived ? 'archived' : 'active',
    sourceInstallationId: INSTALLATION_ID,
    sourceProjectId: localProjectId,
    createdAt: '2026-06-18T08:35:00.000Z',
    updatedAt: versions[0].createdAt,
    archivedAt: options?.archived ? '2026-07-13T03:15:00.000Z' : undefined,
    versions,
  }
}

export const createMockProjects = (): MockPlatformProject[] => (
  Array.from({ length: 14 }, (_, index) => createProject(index + 1, {
    archived: index === 3 || index === 9,
    versionCount: index === 0 ? 2 : undefined,
  }))
)

export const createMockUploads = (): MockUploadRecord[] => [
  {
    id: 'upload-remote-brake-control-2',
    projectId: 'remote-brake-control',
    projectName: '智能制动控制系统',
    sourceInstallationId: INSTALLATION_ID,
    status: 'succeeded',
    versionId: 'remote-brake-control-version-2',
    versionNumber: 2,
    deduplicated: false,
    createdAt: '2026-07-12T09:19:40.000Z',
    completedAt: '2026-07-12T09:20:00.000Z',
  },
  {
    id: 'upload-remote-project-05-2',
    projectId: 'remote-project-05',
    projectName: '示例需求项目 05',
    sourceInstallationId: INSTALLATION_ID,
    status: 'deduplicated',
    versionId: 'remote-project-05-version-2',
    versionNumber: 2,
    deduplicated: true,
    createdAt: '2026-07-11T06:20:00.000Z',
    completedAt: '2026-07-11T06:20:03.000Z',
  },
  {
    id: 'upload-processing-01',
    projectId: 'remote-project-02',
    projectName: '示例需求项目 02',
    sourceInstallationId: INSTALLATION_ID,
    status: 'processing',
    deduplicated: false,
    createdAt: '2026-07-14T01:05:00.000Z',
  },
  {
    id: 'upload-failed-schema',
    projectId: 'remote-project-07',
    projectName: '示例需求项目 07',
    sourceInstallationId: INSTALLATION_ID,
    status: 'failed',
    deduplicated: false,
    errorMessage: '快照 schema_version 不受支持',
    createdAt: '2026-07-10T10:00:00.000Z',
    completedAt: '2026-07-10T10:00:02.000Z',
  },
  ...Array.from({ length: 7 }, (_, index): MockUploadRecord => ({
    id: `upload-history-${index + 1}`,
    projectId: `remote-project-${String(index + 2).padStart(2, '0')}`,
    projectName: `示例需求项目 ${String(index + 2).padStart(2, '0')}`,
    sourceInstallationId: INSTALLATION_ID,
    status: 'succeeded',
    versionId: `remote-project-${String(index + 2).padStart(2, '0')}-version-1`,
    versionNumber: 1,
    deduplicated: false,
    createdAt: `2026-07-${String(9 - index).padStart(2, '0')}T08:00:00.000Z`,
    completedAt: `2026-07-${String(9 - index).padStart(2, '0')}T08:00:04.000Z`,
  })),
]
