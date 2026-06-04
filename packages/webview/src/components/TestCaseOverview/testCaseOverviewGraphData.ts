import type { Requirement } from '../../models/Requirement'
import { createGraphNodeStyle, TEST_CASE_OVERVIEW_NODE_STYLES } from '../graphNodeStyles'
import type {
  OverviewLinkMeta,
  OverviewNodeMeta,
  ParsedTreeEdge,
  ParsedTreeNode,
  StackItem,
  TestCaseOverviewGraphData,
} from './types'

const SCENARIO_TEXT = `
c23e3fed-7a54-4909-86fe-ad367bbff0b9_path_0 (path)
  READY_LAMP (data)
    43f4e1cd-6162-4ed5-a5f2-7424f7b18da8_path_0 (path)


43f4e1cd-6162-4ed5-a5f2-7424f7b18da8_path_1 (path)
  FrntEsc_bEscIncActv (data)
    b60caad1-9cca-4248-bf16-f72fc3c709cc_path_0 (path)
      READY_LAMP (data)
        43f4e1cd-6162-4ed5-a5f2-7424f7b18da8_path_0 (path)


8b90b350-9d72-4e7a-88ae-838430f0be67_path_0 (path)
  READY_LAMP (data)
    43f4e1cd-6162-4ed5-a5f2-7424f7b18da8_path_0 (path)


43f4e1cd-6162-4ed5-a5f2-7424f7b18da8_path_2 (path)
  FrntEsc_bEscDecActv (data)
    cc4da0bc-a7b3-420b-b658-b7e65be522dd_path_0 (path)
      READY_LAMP (data)
        43f4e1cd-6162-4ed5-a5f2-7424f7b18da8_path_0 (path)
  `

const TEST_CASE_TEXT = `
FrntESP_Lose == 1, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== TrqCtl , MSR_TqInc_MCU_FSts ==1
FrntESP_Lose == 1, READY_LAMP==0, STRATEGY_SHIFT_POSITION==3, MCU_F_CrtMod== TrqCtl , MSR_TqInc_MCU_FSts ==1
FrntESP_Lose == 1, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== TrqCtl , MSR_TqInc_MCU_FSts ==1

FrntEsc_bEscIncActv == 1, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 1
FrntEsc_bEscIncActv == 0, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 1
FrntEsc_bEscIncActv == 1, READY_LAMP==0, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 1
FrntEsc_bEscIncActv == 1, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 0
FrntEsc_bEscIncActv == 1, READY_LAMP==0, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 0
FrntEsc_bEscIncActv == 0, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==0, FrntESP_Lose == 0

FrntESP_Lose == 1, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1
FrntESP_Lose == 1, READY_LAMP==0, STRATEGY_SHIFT_POSITION==3, MCU_F_CrtMod== SpdCtI, MSR_TqInc_MCU_FSts ==1
FrntESP_Lose == 0, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI, MSR_TqInc_MCU_FSts ==1
FrntESP_Lose == 1, READY_LAMP==0, STRATEGY_SHIFT_POSITION==3, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==0
FrntESP_Lose == 0, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==0

FrntEsc_bEscIncActv == 1, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 1
FrntEsc_bEscIncActv == 0, READY_LAMP==1, STRATEGY_SHIFT_POSITION==3, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 1
FrntEsc_bEscIncActv == 1, READY_LAMP==0, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 1
FrntEsc_bEscIncActv == 1, READY_LAMP==1, STRATEGY_SHIFT_POSITION==3, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 0
FrntEsc_bEscIncActv == 1, READY_LAMP==0, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 0
FrntEsc_bEscIncActv == 0, READY_LAMP==1, STRATEGY_SHIFT_POSITION==3, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==0, FrntESP_Lose == 0
FrntEsc_bEscIncActv == 1, READY_LAMP==1, STRATEGY_SHIFT_POSITION==4, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 1
FrntEsc_bEscIncActv == 1, READY_LAMP==1, STRATEGY_SHIFT_POSITION==3, MCU_F_CrtMod== SpdCtI , MSR_TqInc_MCU_FSts ==1, FrntESP_Lose == 0
  `

export function buildTestCaseOverviewGraphData(requirements: Requirement[]): TestCaseOverviewGraphData {
  const requirementNameById = new Map(requirements.map(req => [req.id, req.name]))
  const scenarios = SCENARIO_TEXT.split('\n\n').filter(scenario => scenario.trim())
  const testCases = TEST_CASE_TEXT.split('\n\n').filter(testCase => testCase.trim())
  const nodesMap = new Map<string, OverviewNodeMeta>()
  const links: OverviewLinkMeta[] = []

  requirements.forEach(req => {
    const style = TEST_CASE_OVERVIEW_NODE_STYLES.requirement
    nodesMap.set(req.id, {
      id: req.id,
      name: req.name?.substring(0, 8) || req.id.substring(0, 8),
      category: style.category,
      kind: 'requirement',
      tooltip: `<div class="tc-g6-tooltip"><b>需求</b><div>${escapeHtml(req.name || req.id)}</div></div>`,
    })
  })

  scenarios.forEach((scenario, index) => {
    const scenarioId = `scenario_${index}`
    const { nodes, edges } = parseTreeToGraph(scenario, requirementNameById)
    const scenarioStyle = TEST_CASE_OVERVIEW_NODE_STYLES.scenario

    nodesMap.set(scenarioId, {
      id: scenarioId,
      name: `场景 ${index + 1}`,
      category: scenarioStyle.category,
      kind: 'scenario',
      tooltip: buildScenarioTooltip(index, nodes, edges),
    })

    collectScenarioRequirementIds(scenario).forEach(reqId => {
      if (!nodesMap.has(reqId)) {
        const style = TEST_CASE_OVERVIEW_NODE_STYLES.requirement
        nodesMap.set(reqId, {
          id: reqId,
          name: reqId.substring(0, 8),
          category: style.category,
          kind: 'requirement',
          tooltip: `<div class="tc-g6-tooltip"><b>需求 (未在当前列表)</b><div>${escapeHtml(reqId)}</div></div>`,
        })
      }

      links.push({
        source: scenarioId,
        target: reqId,
      })
    })
  })

  testCases.forEach((testCase, index) => {
    const testCaseId = `testCase_${index}`
    const testCaseStyle = TEST_CASE_OVERVIEW_NODE_STYLES.testCase
    const tooltipContent = testCase
      ? `<b>测试用例 ${index + 1}</b><br/>${testCase.trim().split('\n').map(escapeHtml).join('<br/>')}`
      : `测试用例 ${index + 1}`

    nodesMap.set(testCaseId, {
      id: testCaseId,
      name: `测试用例 ${index + 1}`,
      category: testCaseStyle.category,
      kind: 'testCase',
      tooltip: `<div class="tc-g6-tooltip">${tooltipContent}</div>`,
    })

    links.push({
      source: testCaseId,
      target: `scenario_${index}`,
    })
  })

  const finalNodes = Array.from(nodesMap.values())
  applyColumnLayout(finalNodes)

  return {
    nodes: finalNodes.map(toG6Node),
    edges: links.map(toG6Edge),
  }
}

function parseTreeToGraph(
  tree: string,
  requirementNameById: Map<string, string>,
): { nodes: ParsedTreeNode[]; edges: ParsedTreeEdge[] } {
  const nodes: ParsedTreeNode[] = []
  const edges: ParsedTreeEdge[] = []
  const nodeSet = new Set<string>()
  const stack: StackItem[] = []
  const lines = tree
    .split('\n')
    .filter(line => line.trim().length > 0)

  for (const rawLine of lines) {
    const indent = rawLine.search(/\S/)
    const line = rawLine.trim()
    const isPath = line.endsWith(' (path)')
    const isData = line.endsWith(' (data)')
    let value = ''
    let id = ''

    if (isPath) {
      id = line.replace(' (path)', '').trim().match(/([a-fA-F0-9\-]+)_path/i)?.[1] || ''
      value = requirementNameById.get(id) || id.substring(0, 8)
    } else if (isData) {
      value = line.replace(' (data)', '').trim()
    } else {
      continue
    }

    const current: StackItem = {
      indent,
      type: isPath ? 'path' : 'data',
      value,
      id,
    }

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    if (isPath && current.id && !nodeSet.has(current.id)) {
      nodes.push({
        id: current.id,
        name: current.value,
        category: 0,
      })
      nodeSet.add(current.id)
    }

    if (isPath && stack.length >= 2) {
      const parentData = stack[stack.length - 1]
      const parentPath = stack[stack.length - 2]
      if (parentData.type === 'data' && parentPath.type === 'path') {
        edges.push({
          from: parentPath.id || '',
          to: current.id || '',
          label: parentData.value,
        })
      }
    }

    stack.push(current)
  }

  return { nodes, edges }
}

function collectScenarioRequirementIds(scenario: string) {
  return scenario
    .split('\n')
    .map(line => line.trim().match(/^([a-fA-F0-9\-]+)_path/i)?.[1])
    .filter((id): id is string => Boolean(id))
}

function buildScenarioTooltip(index: number, nodes: ParsedTreeNode[], edges: ParsedTreeEdge[]) {
  let tooltipHtml = `<div class="tc-g6-tooltip"><b>场景 ${index + 1} 结构</b><br/>`

  if (edges.length > 0) {
    tooltipHtml += edges.map(edge => {
      const fromNode = nodes.find(node => node.id === edge.from)
      const toNode = nodes.find(node => node.id === edge.to)
      const fromName = fromNode ? fromNode.name : edge.from.substring(0, 8)
      const toName = toNode ? toNode.name : edge.to.substring(0, 8)

      return `<div style="margin-top: 4px;">${escapeHtml(fromName)} <span style="color: #1890ff; padding: 0 4px;">-[ <b>${escapeHtml(edge.label)}</b> ]-></span> ${escapeHtml(toName)}</div>`
    }).join('')
  } else if (nodes.length > 0) {
    tooltipHtml += nodes.map(node => `<div style="margin-top: 4px;">节点: ${escapeHtml(node.name)}</div>`).join('')
  } else {
    tooltipHtml += '<div style="margin-top: 4px; color: #999;">无节点信息</div>'
  }

  return `${tooltipHtml}</div>`
}

function applyColumnLayout(nodes: OverviewNodeMeta[]) {
  const reqNodes = nodes.filter(node => node.category === 0)
  const scenarioNodes = nodes.filter(node => node.category === 1)
  const testCaseNodes = nodes.filter(node => node.category === 2)
  const ySpacing = 100

  setColumnPosition(reqNodes, 300, -(reqNodes.length * ySpacing) / 2, ySpacing)
  setColumnPosition(scenarioNodes, 800, -(scenarioNodes.length * ySpacing) / 2, ySpacing)
  setColumnPosition(testCaseNodes, 1300, -(testCaseNodes.length * ySpacing) / 2, ySpacing)
}

function setColumnPosition(nodes: OverviewNodeMeta[], x: number, startY: number, ySpacing: number) {
  nodes.forEach((node, index) => {
    node.x = x
    node.y = startY + index * ySpacing
  })
}

function toG6Node(node: OverviewNodeMeta): NonNullable<TestCaseOverviewGraphData['nodes']>[number] {
  const style = TEST_CASE_OVERVIEW_NODE_STYLES[node.kind]

  return {
    id: node.id,
    type: style.type,
    data: {
      categoryName: style.name,
      name: node.name,
      tooltip: node.tooltip,
    },
    style: createGraphNodeStyle(style, {
      x: node.x,
      y: node.y,
      labelText: node.name,
    }),
  }
}

function toG6Edge(
  link: OverviewLinkMeta,
  index: number,
): NonNullable<TestCaseOverviewGraphData['edges']>[number] {
  return {
    id: `overview-edge-${index}`,
    source: link.source,
    target: link.target,
    type: 'cubic-horizontal',
    style: {
      stroke: '#8c8c8c',
      lineWidth: 1.5,
      endArrow: false,
    },
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
