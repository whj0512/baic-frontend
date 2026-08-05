import type { DimensionSectionConfig, SectionKey } from './types'
import type { RequirementDimensionCode } from '../../models/RequirementModel'

export const SECTION_CONFIG: Record<SectionKey, DimensionSectionConfig> = {
  environment: { dimensionCode: 'IBD', label: '所处环境', graphField: 'graph_IBD', dslField: 'dsl_IBD' },
  interaction: { dimensionCode: 'ESD', label: '与环境交互', graphField: 'graph_ESD', dslField: 'dsl_ESD' },
  internalComposition: { dimensionCode: 'BDD', label: '内部组成', graphField: 'graph_BDD', dslField: 'dsl_BDD' },
  moduleResponses: { dimensionCode: 'ISD', label: '组成模块间的响应', graphField: 'graph_ISD', dslField: 'dsl_ISD' },
  internalConstraints: { dimensionCode: 'SC', label: '内部约束', graphField: 'graph_SC', dslField: 'dsl_SC' },
  dialogMap: { dimensionCode: 'DialogMap', label: '会话图' },
}

export const SECTION_TO_DIMENSION_CODE: Record<Exclude<SectionKey, 'dialogMap'>, RequirementDimensionCode> = {
  environment: 'IBD',
  interaction: 'ESD',
  internalComposition: 'BDD',
  moduleResponses: 'ISD',
  internalConstraints: 'SC',
}

export const DIMENSION_CODE_TO_SECTION: Record<RequirementDimensionCode, Exclude<SectionKey, 'dialogMap'>> = {
  IBD: 'environment',
  ESD: 'interaction',
  BDD: 'internalComposition',
  ISD: 'moduleResponses',
  SC: 'internalConstraints',
}
