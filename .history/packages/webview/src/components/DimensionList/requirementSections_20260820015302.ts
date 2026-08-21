import type { Requirement } from '../../models/Requirement'
import type { RequirementDimensionCode } from '../../models/RequirementModel'
import type { SectionKey } from '../DimensionEditor/types'
import type { DimensionListSection } from './DimensionList'
import { SECTION_TO_DIMENSION_CODE } from '../DimensionEditor/dimensionEditorConfig'

export type RequirementDimensionSection = DimensionListSection<SectionKey> & {
  graphField?: keyof Requirement
  dslField?: keyof Requirement
}

const ENVIRONMENT_SECTION: RequirementDimensionSection = {
  key: 'environment',
  dimensionCode: SECTION_TO_DIMENSION_CODE.environment,
  label: '环境组成',
  desc: '对系统所属的环境组成进行刻画，描述外部存在的实体以及这些实体之间存在的交互。',
  graphField: 'graph_IBD',
  dslField: 'dsl_IBD',
}

const INTERACTION_SECTION: RequirementDimensionSection = {
  key: 'interaction',
  dimensionCode: SECTION_TO_DIMENSION_CODE.interaction,
  label: '外部交互',
  desc: '基于UML中顺序图的概念，通过实体之间的交互序列，来刻画系统和外部实体之间的交互场景。',
  graphField: 'graph_ESD',
  dslField: 'dsl_ESD',
}

const INTERNAL_CONSTRAINTS_SECTION: RequirementDimensionSection = {
  key: 'internalConstraints',
  dimensionCode: SECTION_TO_DIMENSION_CODE.internalConstraints,
  label: '内部约束',
  desc: '通过状态机对系统内部的约束/状态迁移进行刻画。',
  graphField: 'graph_SC',
  dslField: 'dsl_SC',
}

const DIALOG_MAP_SECTION: RequirementDimensionSection = {
  key: 'dialogMap',
  dimensionCode: SECTION_TO_DIMENSION_CODE.dialogMap,
  label: '会话图',
  desc: '描述UI页面间的跳转关系。',
}

const COMPONENT_REQUIREMENT_SECTIONS: RequirementDimensionSection[] = [
  INTERNAL_CONSTRAINTS_SECTION,
]

const SYSTEM_REQUIREMENT_SECTIONS: RequirementDimensionSection[] = [
  ENVIRONMENT_SECTION,
  INTERACTION_SECTION,
  INTERNAL_CONSTRAINTS_SECTION,
  DIALOG_MAP_SECTION,
]

export const getRequirementSections = (reqType?: string): RequirementDimensionSection[] => {
  if (reqType === 'component') return COMPONENT_REQUIREMENT_SECTIONS
  if (reqType === 'system') return SYSTEM_REQUIREMENT_SECTIONS
  return []
}

export const getIncompatibleRequirementDimensionCodes = (
  reqType: string | undefined,
  dimensionCodes: RequirementDimensionCode[],
): RequirementDimensionCode[] => {
  const allowedDimensionCodes = new Set(
    getRequirementSections(reqType).map(section => section.dimensionCode),
  )
  return [...new Set(dimensionCodes.filter(code => !allowedDimensionCodes.has(code)))]
}
