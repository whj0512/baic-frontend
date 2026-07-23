import { createGraphNodeStyle, TEST_CASE_OVERVIEW_NODE_STYLES } from '../graphNodeStyles'
import type {
  TestCaseOverviewGraphData,
  TestCaseOverviewNodeKind,
  TraceabilityGraphResponse,
} from './types'

const COLUMN_X: Record<TestCaseOverviewNodeKind, number> = {
  requirement: 300,
  scenario: 800,
  testCase: 1300,
}

const Y_SPACING = 100

export function buildTestCaseOverviewGraphData(
  graphData: TraceabilityGraphResponse['g6'],
): TestCaseOverviewGraphData {
  const positions = buildColumnPositions(graphData.nodes)

  return {
    nodes: graphData.nodes.map(node => {
      const kind = node.data.kind
      const style = TEST_CASE_OVERVIEW_NODE_STYLES[kind]
      const position = positions.get(node.id)

      return {
        ...node,
        type: style.type,
        data: {
          ...node.data,
          categoryName: style.name,
          tooltip: buildNodeTooltip(style.name, node.data.name),
        },
        style: createGraphNodeStyle(style, {
          x: position?.x,
          y: position?.y,
          labelText: node.data.name,
        }),
      }
    }),
    edges: graphData.edges.map(edge => ({
      ...edge,
      type: 'cubic-horizontal',
      style: {
        stroke: '#8c8c8c',
        lineWidth: 1.5,
        endArrow: false,
      },
    })),
  }
}

function buildColumnPositions(nodes: TraceabilityGraphResponse['g6']['nodes']) {
  const nodesByKind: Record<TestCaseOverviewNodeKind, typeof nodes> = {
    requirement: [],
    scenario: [],
    testCase: [],
  }

  nodes.forEach(node => {
    nodesByKind[node.data.kind].push(node)
  })

  const positions = new Map<string, { x: number; y: number }>()

  Object.entries(nodesByKind).forEach(([kind, columnNodes]) => {
    const nodeKind = kind as TestCaseOverviewNodeKind
    const startY = -(columnNodes.length * Y_SPACING) / 2

    columnNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: COLUMN_X[nodeKind],
        y: startY + index * Y_SPACING,
      })
    })
  })

  return positions
}

function buildNodeTooltip(categoryName: string, name: string) {
  return `<div class="tc-g6-tooltip"><b>${escapeHtml(categoryName)}</b><div>${escapeHtml(name)}</div></div>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
