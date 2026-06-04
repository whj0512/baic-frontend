import type { BaseNodeStyleProps } from '@antv/g6'

export type G6GraphNodeStyle = Partial<BaseNodeStyleProps> & Record<string, unknown>

export interface GraphNodeStyle {
  type?: 'circle' | 'diamond' | 'rect'
  category?: number
  name?: string
  color?: string
  style: G6GraphNodeStyle
}

const DEFAULT_REQUIREMENT_RELATION_NODE_STYLE: GraphNodeStyle = {
  type: 'circle',
  style: {
    size: 65,
    fill: '#fafafa',
    stroke: '#8c8c8c',
    lineWidth: 2,
    lineDash: [6, 4],
    label: true,
    labelFill: '#595959',
    labelFontSize: 12,
    labelFontWeight: 500,
    labelPlacement: 'center',
    labelWordWrap: true,
    labelMaxWidth: 53,
  }
}

export const REQUIREMENT_RELATION_NODE_STYLES: Record<string, GraphNodeStyle> = {
  系统级: {
    type: 'circle',
    style: {
      size: 75,
      fill: '#f9f0ff',
      stroke: '#722ed1',
      lineWidth: 2,
      lineDash: [6, 4],
      label: true,
      labelFill: '#531dab',
      labelFontSize: 12,
      labelFontWeight: 500,
      labelPlacement: 'center',
      labelWordWrap: true,
      labelMaxWidth: 63,
    }
  },
  部件级: {
    type: 'circle',
    style: {
      size: 70,
      fill: '#e6f7ff',
      stroke: '#1890ff',
      lineWidth: 2,
      lineDash: [6, 4],
      label: true,
      labelFill: '#0050b3',
      labelFontSize: 12,
      labelFontWeight: 500,
      labelPlacement: 'center',
      labelWordWrap: true,
      labelMaxWidth: 58,
    }
  },
  默认: DEFAULT_REQUIREMENT_RELATION_NODE_STYLE
}

export const getRequirementRelationNodeStyle = (type?: string): GraphNodeStyle => {
  if (!type) return DEFAULT_REQUIREMENT_RELATION_NODE_STYLE
  return REQUIREMENT_RELATION_NODE_STYLES[type] ?? DEFAULT_REQUIREMENT_RELATION_NODE_STYLE
}

export const TEST_CASE_OVERVIEW_NODE_STYLES = {
  requirement: {
    type: 'circle',
    category: 0,
    name: '需求',
    color: '#1890ff',
    style: {
      size: 70,
      fill: '#e6f7ff',
      stroke: '#1890ff',
      lineWidth: 2,
      lineDash: [6, 4],
      label: true,
      labelFill: '#0050b3',
      labelFontSize: 12,
      labelFontWeight: 500,
      labelPlacement: 'center',
      labelWordWrap: true,
      labelMaxWidth: 58,
    }
  },
  scenario: {
    type: 'diamond',
    category: 1,
    name: '测试场景',
    color: '#52c41a',
    style: {
      size: 65,
      fill: '#f6ffed',
      stroke: '#52c41a',
      lineWidth: 2,
      lineDash: [6, 4],
      label: true,
      labelFill: '#237804',
      labelFontSize: 12,
      labelFontWeight: 500,
      labelPlacement: 'center',
      labelWordWrap: true,
      labelMaxWidth: 53,
    }
  },
  testCase: {
    type: 'rect',
    category: 2,
    name: '测试用例',
    color: '#fa8c16',
    style: {
      size: [118, 58],
      radius: 6,
      fill: '#fff7e6',
      stroke: '#fa8c16',
      lineWidth: 2,
      lineDash: [6, 4],
      label: true,
      labelFill: '#ad4e00',
      labelFontSize: 12,
      labelFontWeight: 500,
      labelPlacement: 'center',
      labelWordWrap: true,
      labelMaxWidth: 96,
    }
  }
} as const satisfies Record<string, GraphNodeStyle>

export const createGraphNodeStyle = (
  nodeStyle: GraphNodeStyle,
  options: G6GraphNodeStyle = {},
): G6GraphNodeStyle => ({
  ...nodeStyle.style,
  ...options,
})

export const TEST_CASE_OVERVIEW_CATEGORIES = Object.values(TEST_CASE_OVERVIEW_NODE_STYLES).map(style => ({
  name: style.name,
  itemStyle: {
    color: style.style.fill,
    borderColor: style.style.stroke,
    borderWidth: style.style.lineWidth
  }
}))
