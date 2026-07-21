import type { Requirement } from '../../models/Requirement'

export function buildRequirementTreeData(requirements: Requirement[]) {
  const groupedRequirements = new Map<string, Requirement[]>()

  requirements.forEach((requirement) => {
    const type = requirement.type || '未分类'
    const group = groupedRequirements.get(type)
    if (group) {
      group.push(requirement)
    } else {
      groupedRequirements.set(type, [requirement])
    }
  })

  return Array.from(groupedRequirements, ([type, grouped]) => ({
    title: type,
    value: `type:${type}`,
    selectable: false,
    children: grouped.map(requirement => ({
      title: requirement.name || requirement.id,
      value: requirement.id,
    })),
  }))
}
