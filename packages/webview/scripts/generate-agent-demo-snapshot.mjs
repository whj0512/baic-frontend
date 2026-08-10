import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const defaultOutput = path.resolve(
  scriptDir,
  '../src/components/AgentWorkspace/qwenPaw/demo/snapshot.json',
)
const sourceRoot = path.resolve(process.argv[2] ?? '')
const outputPath = path.resolve(process.argv[3] ?? defaultOutput)

if (!process.argv[2]) {
  throw new Error('请提供“多媒体中心功能规范V1.0-20250722”产物目录。')
}

const FEATURE_NAMES = [
  '4在线音乐',
  '5在线电台',
  '6收音机',
  '7蓝牙音乐',
  '8U盘音乐',
]

const includedFiles = new Map()

async function readSource(relativePath, encoding = 'utf8') {
  const normalized = relativePath.replaceAll('\\', '/')
  const content = await readFile(path.join(sourceRoot, relativePath), encoding)
  includedFiles.set(normalized, createHash('sha256').update(content).digest('hex'))
  return content
}

async function readJson(relativePath) {
  return JSON.parse(await readSource(relativePath))
}

function cleanTableText(value) {
  return value
    .replaceAll('<br>', '\n')
    .replaceAll('&vert;', '|')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .trim()
}

function getArtifactType(relativePath, content = '') {
  if (relativePath.endsWith('/Environment.dsl')) return 'environment'
  if (relativePath.includes('/DialogMaps/')) return 'dialog-map'
  if (relativePath.includes('/ExternalScenarios/')) return 'external-scenario'
  if (relativePath.includes('/Statecharts/')) return 'statechart'
  if (/\bScenario\s+/u.test(content)) return 'external-scenario'
  if (/\b(?:Statechart|StateMachine)\s+/u.test(content)) return 'statechart'
  if (relativePath.endsWith('/search_favorite_scan.dsl')) return 'external-scenario'
  throw new Error(`无法识别 DSL 类型：${relativePath}`)
}

async function listFiles(relativeDirectory = '') {
  const entries = await readdir(path.join(sourceRoot, relativeDirectory), {
    withFileTypes: true,
  })
  const results = []
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      results.push(...await listFiles(relativePath))
    } else {
      results.push(relativePath.replaceAll('\\', '/'))
    }
  }
  return results
}

function parseRequirementMap(markdown) {
  const section = markdown
    .split('## Requirement DSL 映射')[1]
    ?.split('## DSL 围栏')[0]
  if (!section) throw new Error('未找到 Requirement DSL 映射表。')

  const requirements = {}
  for (const line of section.split(/\r?\n/u)) {
    const match = line.match(
      /^\| `([^`]+)` \| (.*?) \| (.*?) \| (\d+) \| (.*?) \|$/u,
    )
    if (!match) continue
    const [, requirementId, rawName, rawDescription, rawCount, rawArtifacts] = match
    const artifacts = [...rawArtifacts.matchAll(/<code>(.*?)<\/code>/gu)]
      .map((artifactMatch) => cleanTableText(artifactMatch[1]).replaceAll('\\', '/'))
    if (artifacts.length !== Number(rawCount)) {
      throw new Error(`${requirementId} 的 DSL 映射数量不一致。`)
    }
    requirements[requirementId] = {
      name: cleanTableText(rawName),
      description: cleanTableText(rawDescription),
      artifacts,
    }
  }
  return requirements
}

function readLiteral(block, predicate) {
  const match = block.match(new RegExp(`${predicate}\\s+"([\\s\\S]*?)"(?:@zh)?\\s*[;.]`, 'u'))
  return match?.[1]?.replaceAll('\\"', '"') ?? ''
}

function readResource(block, predicate) {
  return block.match(new RegExp(`${predicate}\\s+ro:([^\\s;.]*)`, 'u'))?.[1] ?? ''
}

function parseInferredRelations(ttl) {
  return ttl
    .split(/(?=^ro:inferred_)/gmu)
    .flatMap((block) => {
      const relationClass = block.match(/a ro:(DependencyRelation|ConflictRelation)/u)?.[1]
      if (!relationClass) return []
      const name = readLiteral(block, 'ro:name')
      const [labelSource = '', labelTarget = ''] = name.split(' → ')
      const evidence = [...block.matchAll(/ro:evidence\s+"([\s\S]*?)"@zh\s*[;.]/gu)]
        .map((match) => match[1].replaceAll('\\"', '"'))
      return [{
        relationType: relationClass === 'DependencyRelation' ? 'dependency' : 'conflict',
        relationSource: labelSource || readResource(block, 'ro:relationSource'),
        relationTarget: labelTarget || readResource(block, 'ro:relationTarget'),
        isInferred: true,
        subtype: readLiteral(block, 'ro:subtype'),
        evidence,
        confidence: relationClass === 'DependencyRelation' ? 'inferred' : 'candidate',
        inferenceRule: relationClass === 'DependencyRelation' ? 'R13' : 'R27',
      }]
    })
}

function parseStateMachineIssues(report) {
  const section = report.split('## 3. 状态机问题')[1] ?? ''
  return section
    .split(/\r?\n/u)
    .flatMap((line) => {
      const match = line.match(/^- \[([^\]]+)\]\s+(.+)$/u)
      return match ? [{ module: match[1], description: match[2] }] : []
    })
}

function countTestcaseMappings(value) {
  const candidates = [
    value.mappings,
    value.requirements_coverage,
    value.coverage?.mappings,
    value.coverage?.requirements,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.length
    if (candidate && typeof candidate === 'object') return Object.keys(candidate).length
  }
  return 0
}

function getRequirementDslEntries(value) {
  for (const key of ['requirement_dsl_map', 'coverage', 'dsl_map']) {
    if (Array.isArray(value[key])) {
      return [
        ...value[key],
        ...(Array.isArray(value.orphan_dsl_references)
          ? value.orphan_dsl_references
          : []),
      ]
    }
  }
  return []
}

function getDslReferencePath(reference) {
  const rawPath = typeof reference === 'string'
    ? reference
    : reference && typeof reference === 'object'
      ? reference.file ?? reference.path ?? reference.source_path
      : null
  if (typeof rawPath !== 'string') return null
  return rawPath.split('::', 1)[0].split('#', 1)[0].trim().replaceAll('\\', '/')
}

const chunks = await readJson('chunks.json')
const requirementRelations = await readJson('requirement_relations.json')
const dslReport = await readSource('requirement_dsl_query_result.md')
const inferenceReport = await readSource('inference_report.md')
const inferenceTtl = await readSource('inference_results.ttl')
const ontologyTtl = await readSource('requirement_ontology.ttl')
const relationConsistencyReport = await readSource('relation_consistency_report.md')
const fixedMineruMarkdownName = (
  await Promise.all([
    'fixed_MinerU_markdown_多媒体中心功能规范V1.0-20250722_2081303193935974400.md',
  ])
)[0]
const fixedMineruMarkdown = await readSource(fixedMineruMarkdownName)
const requirements = parseRequirementMap(dslReport)
const artifactPaths = (await listFiles())
  .filter((relativePath) => (
    relativePath.endsWith('.dsl')
    && !relativePath.includes('/alignment_backup/')
  ))
  .sort()
const artifacts = {}
for (const artifactPath of artifactPaths) {
  const content = await readSource(artifactPath)
  artifacts[artifactPath] = {
    type: getArtifactType(artifactPath, content),
    content,
  }
}

const features = {}
for (const featureName of FEATURE_NAMES) {
  const testcaseMapPath = `${featureName}/testcase/requirement_testcase_map.json`
  const testcaseMap = await readJson(testcaseMapPath)
  const featureArtifactPaths = artifactPaths.filter((artifactPath) =>
    artifactPath.startsWith(`${featureName}/`))
  const featureRequirements = Object.entries(requirements).filter(([, requirement]) =>
    requirement.artifacts.some((artifactPath) => artifactPath.startsWith(`${featureName}/`)))
  features[featureName] = {
    markdown: await readSource(`${featureName}/${featureName}.md`),
    requirements: await readJson(`${featureName}/requirements.json`),
    requirementDslMap: await readJson(`${featureName}/requirement_dsl_map.json`),
    alignmentResult: await readJson(`${featureName}/alignment_result.json`),
    alignmentReport: await readSource(`${featureName}/alignment_report.md`),
    alignmentChanges: await readSource(`${featureName}/alignment_changes.md`),
    completionPlan: await readSource(`${featureName}/completion_plan.md`),
    testcaseMap,
    summary: {
      mappedRequirementCount: featureRequirements.length,
      artifactCount: featureArtifactPaths.length,
      testcaseMappingCount: countTestcaseMappings(testcaseMap),
    },
  }
}

const requirementValues = Object.values(requirements)
const dimensionByArtifactType = {
  environment: 'IBD',
  'external-scenario': 'ESD',
  statechart: 'SC',
  'dialog-map': 'UI',
}
const modelTypeByArtifactType = {
  environment: 'Environment',
  'external-scenario': 'ExternalScenario',
  statechart: 'Statechart',
  'dialog-map': 'DialogMap',
}
const requirementMetadata = new Map()
const requirementModelIds = new Map(
  Object.keys(requirements).map((requirementId) => [requirementId, new Set()]),
)
for (const [featureName, feature] of Object.entries(features)) {
  for (const item of feature.requirements.requirements ?? []) {
    requirementMetadata.set(item.requirement_id, item)
  }
  for (const item of getRequirementDslEntries(feature.requirementDslMap)) {
    const modelIds = requirementModelIds.get(item.requirement_id) ?? new Set()
    for (const reference of item.dsl_references ?? item.artifacts ?? []) {
      const referencePath = getDslReferencePath(reference)
      if (referencePath) modelIds.add(`${featureName}/${referencePath}`)
    }
    requirementModelIds.set(item.requirement_id, modelIds)
  }
}
const referencedModelIds = [...new Set(
  [...requirementModelIds.values()].flatMap((modelIds) => [...modelIds]),
)].sort()
const models = {}
const dimensionOrder = new Map()
for (const modelId of referencedModelIds) {
  const artifact = artifacts[modelId]
  if (!artifact) throw new Error(`需求映射引用了不存在的 DSL：${modelId}`)
  const dimensionCode = dimensionByArtifactType[artifact.type]
  const featureName = modelId.split('/')[0]
  const orderKey = `${featureName}:${dimensionCode}`
  const sortOrder = dimensionOrder.get(orderKey) ?? 0
  dimensionOrder.set(orderKey, sortOrder + 1)
  models[modelId] = {
    dimension_code: dimensionCode,
    model_type: modelTypeByArtifactType[artifact.type],
    name: path.basename(modelId, '.dsl'),
    model_key: modelId,
    dsl_text: artifact.content,
    graph_json: null,
    source_representation: 'dsl',
    context_model_id: dimensionCode === 'ESD' || dimensionCode === 'ISD'
      ? `${featureName}/Environment.dsl`
      : null,
    is_primary: sortOrder === 0,
    sort_order: sortOrder,
    source_path: modelId,
  }
}
const modelRequirements = Object.fromEntries(
  Object.entries(requirements).map(([requirementId, requirement]) => {
    const metadata = requirementMetadata.get(requirementId) ?? {}
    return [requirementId, {
      name: requirement.name,
      description: requirement.description,
      nl_text: metadata.source_text ?? requirement.description,
      req_type: metadata.req_type ?? metadata.responsibility_scope ?? '',
      model_ids: [...(requirementModelIds.get(requirementId) ?? [])].sort(),
    }]
  }),
)
const modelValues = Object.values(models)
const dimensionCounts = Object.fromEntries(
  ['IBD', 'ESD', 'BDD', 'ISD', 'SC', 'UI'].map((dimensionCode) => [
    dimensionCode,
    modelValues.filter((model) => model.dimension_code === dimensionCode).length,
  ]),
)
const dslEnvelope = {
  protocol_version: '2.0',
  status: 'success',
  summary: {
    feature_count: FEATURE_NAMES.length,
    requirement_count: requirementValues.length,
    source_requirement_count: 121,
    model_count: modelValues.length,
    relationship_count: Object.values(modelRequirements).reduce(
      (total, requirement) => total + requirement.model_ids.length,
      0,
    ),
    dimension_counts: dimensionCounts,
    empty_model_requirement_count: Object.values(modelRequirements).filter(
      (requirement) => requirement.model_ids.length === 0,
    ).length,
    missing_name_count: requirementValues.filter((requirement) => !requirement.name).length,
    missing_description_count: requirementValues.filter(
      (requirement) => !requirement.description,
    ).length,
    metadata_missing_count: requirementValues.filter(
      (requirement) => !requirement.name || !requirement.description,
    ).length,
    orphan_requirement_count: 3,
    unmapped_source_requirement_count: 0,
  },
  requirements: modelRequirements,
  models,
  warnings: ['Demo 快照来自已完成的多媒体中心建模产物。'],
  error: null,
}

const inferredRelations = parseInferredRelations(inferenceTtl)
const stateMachineIssues = parseStateMachineIssues(inferenceReport)
const qaEnvelope = {
  protocol_version: '1.0',
  status: 'success',
  source_file: 'requirement-ontology-qa.json',
  data: {
    schema_version: '1.0',
    generated_at: '2026-07-28T23:56:41.229190',
    generated_by: 'requirement_ontology_inferencer',
    project_name: '多媒体中心功能规范',
    summary: {
      total_inferred: inferredRelations.length,
      dependencies: inferredRelations.filter((relation) => relation.relationType === 'dependency').length,
      conflicts: inferredRelations.filter((relation) => relation.relationType === 'conflict').length,
      state_machine_issues: {
        deadlock: stateMachineIssues.filter((issue) => issue.description.includes('死锁')).length,
        isolated: stateMachineIssues.filter((issue) => issue.description.includes('孤立')).length,
      },
      scenario_issues: {},
    },
    inferred_dependencies: inferredRelations.filter(
      (relation) => relation.relationType === 'dependency',
    ),
    inferred_conflicts: inferredRelations.filter(
      (relation) => relation.relationType === 'conflict',
    ),
    state_machine_issues: stateMachineIssues,
    scenario_issues: [],
    root_cause_analysis: {
      report: inferenceReport,
      relation_consistency: relationConsistencyReport,
    },
  },
  warnings: ['Demo 回放不会连接 GraphDB 或执行推理。'],
  error: null,
}

const declaredBluetoothRelations = requirementRelations.relations
  .filter((relation) => relation.source === '蓝牙音乐' || relation.target === '蓝牙音乐')
  .map((relation) => ({
    relationType: relation.relation_type,
    relationSource: relation.source,
    relationTarget: relation.target,
    isInferred: false,
    subtype: relation.subtype ?? '',
    evidence: relation.evidence ?? [],
    confidence: 'source-evidence',
    inferenceRule: '',
  }))
const inferredBluetoothRelations = inferredRelations.filter((relation) =>
  relation.relationSource.includes('蓝牙音乐')
  || relation.relationTarget.includes('蓝牙音乐'))
const bluetoothRelations = [...declaredBluetoothRelations, ...inferredBluetoothRelations]
const byType = Object.fromEntries(
  [...new Set(bluetoothRelations.map((relation) => relation.relationType))]
    .map((type) => [
      type,
      bluetoothRelations.filter((relation) => relation.relationType === type).length,
    ]),
)
const functionRelationsEnvelope = {
  protocol_version: '1.0',
  panel: 'function-relations',
  status: 'success',
  source_file: '蓝牙音乐-relation.json',
  data: {
    schema_version: '2.0',
    generated_at: '2026-07-28T23:56:41.229190',
    generated_by: 'agent-workspace-demo-snapshot',
    project_name: '多媒体中心功能规范',
    query: { keyword: '蓝牙音乐', repository: 'requirement' },
    summary: {
      total_relations: bluetoothRelations.length,
      by_type: byType,
      inferred: bluetoothRelations.filter((relation) => relation.isInferred).length,
      declared: bluetoothRelations.filter((relation) => !relation.isInferred).length,
    },
    relations: bluetoothRelations,
  },
  warnings: ['Demo 回放使用已解析产物，不会查询或修改 GraphDB。'],
  error: null,
}

const snapshot = {
  manifest: {
    version: '1.0',
    generatedAt: '2026-07-28T23:56:41.229190Z',
    sourceName: '多媒体中心功能规范V1.0-20250722',
    sourceRootLabel: sourceRoot,
    files: Object.fromEntries([...includedFiles.entries()].sort()),
    statistics: {
      chunkCount: chunks.chunks.length,
      functionalRequirementCount: chunks.chunks.filter(
        (chunk) => chunk.chunk_type === 'functional_requirement',
      ).length,
      requirementCount: requirementValues.length,
      sourceRequirementCount: 121,
      artifactCount: modelValues.length,
      artifactRelationshipCount: dslEnvelope.summary.relationship_count,
      declaredRelationCount: requirementRelations.relations.length,
      inferredDependencyCount: qaEnvelope.data.summary.dependencies,
      inferredConflictCount: qaEnvelope.data.summary.conflicts,
      stateMachineIssueCount: stateMachineIssues.length,
    },
  },
  chunksEnvelope: {
    protocol_version: '1.0',
    status: 'success',
    project_root: sourceRoot,
    source_file: 'chunks.json',
    detail: 'full',
    data: chunks,
    warnings: ['Demo 回放使用已完成的真实条目化产物。'],
    error: null,
  },
  dslEnvelope,
  qaEnvelope,
  functionRelationsEnvelope,
  ontologyPanelEnvelope: {
    protocol_version: '1.0',
    panel: 'req-relationship',
    status: 'ready',
    query: {
      root: null,
      depth: 1,
      origin: 'all',
      node_limit: 200,
      edge_limit: 500,
      include_properties: false,
    },
    error: null,
  },
  sourceArtifacts: {
    fixedMineruMarkdown,
    features,
    requirementRelations,
    ontologyTtl,
    inferenceTtl,
    inferenceReport,
    relationConsistencyReport,
  },
}

const expected = {
  chunkCount: 7,
  functionalRequirementCount: 5,
  requirementCount: 124,
  artifactCount: 112,
  artifactRelationshipCount: 311,
  declaredRelationCount: 10,
  inferredDependencyCount: 3,
  inferredConflictCount: 1,
  stateMachineIssueCount: 21,
}
for (const [key, expectedValue] of Object.entries(expected)) {
  const actualValue = snapshot.manifest.statistics[key]
  if (actualValue !== expectedValue) {
    throw new Error(`${key} 期望 ${expectedValue}，实际 ${actualValue}。`)
  }
}

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(snapshot)}\n`, 'utf8')
console.log(JSON.stringify({ outputPath, statistics: snapshot.manifest.statistics }, null, 2))
