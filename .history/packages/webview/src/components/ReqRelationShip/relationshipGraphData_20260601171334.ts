import type { Requirement } from '../../models/Requirement'
import { getRequirementRelationNodeStyle } from '../echartsNodeStyles'
import type {
  DependencyResponse,
  G6GraphData,
  NormalizedReqRelationship,
  RequirementMap,
} from './types'

export function createRequirementMap(requirements: Requirement[]): RequirementMap {
  return new Map(requirements.map((req) => [req.id, req]))
}

export function buildRequirementTreeData(requirements: Requirement[]) {
  const grouped = requirements.reduce((acc, req) => {
    const type = req.type || '未分类'
    if (!acc[type]) acc[type] = []
    acc[type].push(req)
    return acc
  }, {} as Record<string, Requirement[]>)

  return Object.entries(grouped).map(([type, reqs]) => ({
    title: type,
    value: `type:${type}`,
    children: reqs.map(req => ({
      title: req.name || req.id,
      value: req.id,
    })),
  }))
}

export function normalizeRelationships(resultData: DependencyResponse | null): NormalizedReqRelationship[] {
  if (!resultData) return []

  if (Array.isArray(resultData.relationships)) {
    return resultData.relationships.map((rel, index) => ({
      id: rel.id || `relationship-${index}`,
      sourceRequirementId: rel.from_requirement,
      targetRequirementId: rel.to_requirement,
      relationType: rel.rel_type || 'depends_on',
      dataName: typeof rel.properties?.data_name === 'string' ? rel.properties.data_name : undefined,
      dependentRange: typeof rel.properties?.dependent_range === 'string' ? rel.properties.dependent_range : undefined,
      dependedRange: typeof rel.properties?.depended_range === 'string' ? rel.properties.depended_range : undefined,
      properties: rel.properties,
    }))
  }

  if (Array.isArray(resultData.dependencies)) {
    return resultData.dependencies.map((dep, index) => ({
      id: `dependency-${dep.dependent_graph}-${dep.depended_graph}-${dep.data_name || index}`,
      sourceRequirementId: dep.dependent_graph,
      targetRequirementId: dep.depended_graph,
      relationType: 'depends_on',
      dataName: dep.data_name,
      dependentRange: dep.dependent_range,
      dependedRange: dep.depended_range,
      properties: dep,
    }))
  }

  return []
}

export function buildG6GraphData(
  relationships: NormalizedReqRelationship[],
  requirementMap: RequirementMap,
): G6GraphData {
  const nodesMap = new Map<string, NonNullable<G6GraphData['nodes']>[number]>()
  const edges: NonNullable<G6GraphData['edges']> = []

  relationships.forEach((rel) => {
    const source = rel.sourceRequirementId
    const target = rel.targetRequirementId
    const sourceMeta = requirementMap.get(source)
    const targetMeta = requirementMap.get(target)

    addG6Node(nodesMap, source, sourceMeta)
    addG6Node(nodesMap, target, targetMeta)

    const [first, second] = [source, target].sort()
    const endpointPairKey = `${first}||${second}`

    edges.push({
      id: rel.id,
      source,
      target,
      type: 'cubic-vertical',
      data: {
        relationType: rel.relationType,
        dataName: rel.dataName,
        dependentRange: rel.dependentRange,
        dependedRange: rel.dependedRange,
        sourceName: sourceMeta?.name || source,
        targetName: targetMeta?.name || target,
        endpointPairKey,
        properties: rel.properties,
      },
      style: {
        stroke: '#8c8c8c',
        lineWidth: 2,
        endArrow: true,
        label: true,
        labelText: rel.dataName || rel.relationType,
        labelFill: '#595959',
        labelFontSize: 10,
        labelPlacement: 'center',
        labelWordWrap: true,
        labelMaxWidth: 120,
        labelBackground: true,
        labelBackgroundFill: '#ffffff',
        labelBackgroundOpacity: 0.85,
        labelPadding: [2, 4],
      },
    })
  })

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  }
}

function addG6Node(
  nodesMap: Map<string, NonNullable<G6GraphData['nodes']>[number]>,
  id: string,
  requirement?: Requirement,
) {
  if (nodesMap.has(id)) return

  const style = getRequirementRelationNodeStyle(requirement?.type)
  const label = requirement?.name?.substring(0, 8) || id.substring(0, 8)

  nodesMap.set(id, {
    id,
    data: {
      name: requirement?.name || id,
      type: requirement?.type,
      subtype: requirement?.subtype,
    },
    style: {
      size: Math.max(48, style.symbolSize),
      fill: style.backgroundColor,
      stroke: style.borderColor,
      lineWidth: Math.max(1, style.borderWidth),
      label: true,
      labelText: label,
      labelFill: style.labelColor,
      labelFontSize: 12,
      labelFontWeight: 500,
      labelPlacement: 'center',
      labelWordWrap: true,
      labelMaxWidth: Math.max(40, style.symbolSize - 12),
    },
  })
}
