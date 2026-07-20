import type { Requirement } from '../../models/Requirement'
import type { SectionKey } from '../DimensionEditor/types'
import type { DimensionListSection } from './DimensionList'

export type RequirementDimensionSection = DimensionListSection<SectionKey> & {
  graphField?: keyof Requirement
  dslField?: keyof Requirement
}

export const DEFAULT_REQUIREMENT_SECTIONS: RequirementDimensionSection[] = [
  { key: 'environment', dimensionCode: 'IBD', label: '环境组成', desc: '对系统所属的环境组成进行刻画，描述外部存在的实体以及这些实体之间存在的交互。', graphField: 'graph_IBD', dslField: 'dsl_IBD' },
  { key: 'interaction', dimensionCode: 'ESD', label: '与环境交互', desc: '基于UML中顺序图的概念，通过实体之间的交互序列，来刻画系统和外部实体之间的交互场景。', graphField: 'graph_ESD', dslField: 'dsl_ESD' },
  { key: 'internalComposition', dimensionCode: 'BDD', label: '内部组成', desc: '描述系统内部模块、部件及其组成层级和静态结构关系。', graphField: 'graph_BDD', dslField: 'dsl_BDD' },
  { key: 'moduleResponses', dimensionCode: 'ISD', label: '组成模块间的响应', desc: '描述内部组成模块之间的响应、调用顺序和协作行为。', graphField: 'graph_ISD', dslField: 'dsl_ISD' },
  { key: 'internalConstraints', dimensionCode: 'SC', label: '内部约束', desc: '通过状态机对系统内部的约束/状态迁移进行刻画。', graphField: 'graph_SC', dslField: 'dsl_SC' },
]

export const UI_REQUIREMENT_SECTIONS: RequirementDimensionSection[] = [
  { key: 'dialogMap', dimensionCode: 'DialogMap', label: '会话图', desc: '描述UI页面间的跳转关系。' },
]

export const isUiRequirementType = (reqType?: string) => reqType?.trim() === 'UI级'

export const getRequirementSections = (reqType?: string) => (
  isUiRequirementType(reqType) ? UI_REQUIREMENT_SECTIONS : DEFAULT_REQUIREMENT_SECTIONS
)
