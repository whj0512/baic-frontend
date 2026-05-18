export type EChartsBorderType = 'solid' | 'dashed' | 'dotted'

export interface EChartsNodeStyle {
  symbolSize: number
  category?: number
  name?: string
  color?: string
  borderColor?: string
  borderType?: EChartsBorderType
  borderWidth?: number
  backgroundColor?: string
  labelColor?: string
}

const DEFAULT_REQUIREMENT_RELATION_NODE_STYLE: EChartsNodeStyle = {
  borderColor: '#8c8c8c',
  borderType: 'dashed',
  borderWidth: 2,
  backgroundColor: '#fafafa',
  labelColor: '#595959',
  symbolSize: 65
}

const REQUIREMENT_RELATION_NODE_STYLE_MAP: Record<string, EChartsNodeStyle> = {
  系统级: {
    borderColor: '#722ed1',
    borderType: 'dashed',
    borderWidth: 2,
    backgroundColor: '#f9f0ff',
    labelColor: '#531dab',
    symbolSize: 75
  },
  部件级: {
    borderColor: '#1890ff',
    borderType: 'dashed',
    borderWidth: 2,
    backgroundColor: '#e6f7ff',
    labelColor: '#0050b3',
    symbolSize: 70
  },
  默认: DEFAULT_REQUIREMENT_RELATION_NODE_STYLE
}

export const getRequirementRelationNodeStyle = (type?: string): EChartsNodeStyle => {
  if (!type) return DEFAULT_REQUIREMENT_RELATION_NODE_STYLE
  return REQUIREMENT_RELATION_NODE_STYLE_MAP[type] ?? DEFAULT_REQUIREMENT_RELATION_NODE_STYLE
}

export const TEST_CASE_OVERVIEW_NODE_STYLES = {
  requirement: {
    category: 0,
    name: '需求',
    color: '#1890ff',
    borderColor: '#1890ff',
    borderType: 'dashed',
    borderWidth: 2,
    backgroundColor: '#e6f7ff',
    labelColor: '#0050b3',
    symbolSize: 70
  },
  scenario: {
    category: 1,
    name: '测试场景',
    color: '#52c41a',
    borderColor: '#52c41a',
    borderType: 'dashed',
    borderWidth: 2,
    backgroundColor: '#f6ffed',
    labelColor: '#237804',
    symbolSize: 65
  },
  testCase: {
    category: 2,
    name: '测试用例',
    color: '#fa8c16',
    borderColor: '#fa8c16',
    borderType: 'dashed',
    borderWidth: 2,
    backgroundColor: '#fff7e6',
    labelColor: '#ad4e00',
    symbolSize: 65
  }
} as const satisfies Record<string, EChartsNodeStyle>

export const TEST_CASE_OVERVIEW_CATEGORIES = Object.values(TEST_CASE_OVERVIEW_NODE_STYLES).map(style => ({
  name: style.name,
  itemStyle: {
    color: style.backgroundColor,
    borderColor: style.borderColor,
    borderType: style.borderType,
    borderWidth: style.borderWidth
  }
}))
