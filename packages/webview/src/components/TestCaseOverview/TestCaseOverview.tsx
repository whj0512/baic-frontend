import React, { useMemo, useState } from 'react'
import { Button, Badge } from 'antd'
import { ArrowLeftOutlined, ExperimentOutlined, EyeOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import type { Requirement } from '../../models/Requirement'
import FlowGraph from '../graph'
import {
  TEST_CASE_OVERVIEW_CATEGORIES,
  TEST_CASE_OVERVIEW_NODE_STYLES
} from '../echartsNodeStyles'
import './TestCaseOverview.css'

interface TestCaseOverviewProps {
  /** 来自 groupedRequirements[type].subTypeMap 下所有需求的扁平列表 */
  requirements: Requirement[]
  onBack?: () => void
}

interface StackItem {
  indent: number
  type: 'path' | 'data'
  value: string
  id?: string
}

const getNodeAppearance = (style: typeof TEST_CASE_OVERVIEW_NODE_STYLES[keyof typeof TEST_CASE_OVERVIEW_NODE_STYLES]) => ({
  symbol: style.category === 0 ? 'circle' : style.category === 1 ? 'diamond' : 'rect',
  symbolSize: style.symbolSize,
  itemStyle: {
    color: style.backgroundColor,
    borderType: style.borderType,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth
  },
  label: {
    show: true,
    formatter: '{b}',
    position: 'inside',
    width: style.symbolSize - 16,
    overflow: 'truncate',
    align: 'center',
    color: style.labelColor
  }
})

const TestCaseOverview: React.FC<TestCaseOverviewProps> = ({ requirements, onBack }) => {
  const [showTestCaseGraph, setShowTestCaseGraph] = useState(false)

  // 测试场景
  const scenarioTxt = `
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

  const testCaseTxt = `
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
  const scenarios = scenarioTxt.split('\n\n')
  const testCases = testCaseTxt.split('\n\n')

  const parseTreeToGraph = (tree: string) => {
    const nodes = []
    const edges = []

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
        // 需求节点
        id = line.replace(' (path)', '').trim().match(/([a-fA-F0-9\-]+)_path/i)?.[1] || ''
        value = requirements.find(req => req.id === id)?.name || id.substring(0, 8)
      } else if (isData) {
        value = line.replace(' (data)', '').trim()
      } else {
        continue
      }

      const current: StackItem = {
        indent,
        type: isPath ? 'path' : 'data',
        value,
        id
      }

      // 移除所有缩进大于当前节点的节点
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop()
      }

      // 添加当前节点到 nodes
      if (isPath && current?.id && !nodeSet.has(current.id)) {
        nodes.push({
          id: current.id,
          name: current.value,
          category: 0
        })
        nodeSet.add(current.id)
      }

      if (isPath && stack.length >= 2) {
        const parentData = stack[stack.length - 1]
        const parentPath = stack[stack.length - 2]
        if (parentData.type === 'data' && parentPath.type === 'path') {
          edges.push({
            from: parentPath.id,
            to: current.id,
            label: parentData.value
          })
        }
      }

      // 添加当前节点到 stack
      stack.push(current)
    }

    return { nodes, edges }
  }

  const echartsOption = useMemo(() => {
    const nodesMap = new Map<string, any>()
    const links: any[] = []

    // 1. 填入现有的需求节点
    requirements.forEach(req => {
      const style = TEST_CASE_OVERVIEW_NODE_STYLES.requirement
      nodesMap.set(req.id, {
        id: req.id,
        name: req.name.substring(0, 8) || req.id.substring(0, 8),
        category: style.category,
        ...getNodeAppearance(style),
        tooltip: {
          formatter: `需求: ${req.name || req.id}`
        }
      })
    })

    const scenarioList = scenarios.filter(s => s.trim())

    scenarioList.forEach((scenario, index) => {
      const scenarioId = `scenario_` + index
      const { nodes, edges } = parseTreeToGraph(scenario)

      // 使用 nodes 和 edges 构造结构化的可视化 tooltip
      let tooltipHtml = `<div style="font-size: 13px;"><b>场景 ${index + 1} 结构</b><br/>`
      if (edges.length > 0) {
        tooltipHtml += edges.map(e => {
          const fromNode = nodes.find(n => n.id === e.from)
          const toNode = nodes.find(n => n.id === e.to)
          const fromName = fromNode ? fromNode.name : e.from.substring(0, 8)
          const toName = toNode ? toNode.name : e.to.substring(0, 8)
          return `<div style="margin-top: 4px;">${fromName} <span style="color: #1890ff; padding: 0 4px;">-[ <b>${e.label}</b> ]-></span> ${toName}</div>`
        }).join('')
      } else if (nodes.length > 0) {
        tooltipHtml += nodes.map(n => `<div style="margin-top: 4px;">节点: ${n.name}</div>`).join('')
      } else {
        tooltipHtml += `<div style="margin-top: 4px; color: #999;">无节点信息</div>`
      }
      tooltipHtml += `</div>`

      // 添加场景节点
      const scenarioStyle = TEST_CASE_OVERVIEW_NODE_STYLES.scenario
      nodesMap.set(scenarioId, {
        id: scenarioId,
        name: `场景 ${index + 1}`,
        category: scenarioStyle.category,
        ...getNodeAppearance(scenarioStyle),
        tooltip: {
          formatter: tooltipHtml
        }
      })

      // 解析场景的每一行，查找以 (path) 结尾的行
      const lines = scenario.split('\n')
      lines.forEach(line => {
        const trimmed = line.trim()
        if (trimmed.endsWith(' (path)')) {
          // 截取 uuid，例如 c23e3fed-7a54-4909-86fe-ad367bbff0b9_path_0 取 uuid 部分
          const match = trimmed.match(/^([a-fA-F0-9\-]+)_path/i)
          if (match) {
            const reqId = match[1]

            // 如果需求不在已有列表中，为了能连线，也将其加入节点图
            if (!nodesMap.has(reqId)) {
              const style = TEST_CASE_OVERVIEW_NODE_STYLES.requirement
              nodesMap.set(reqId, {
                id: reqId,
                name: reqId.substring(0, 8),
                category: style.category,
                ...getNodeAppearance(style),
                tooltip: {
                  formatter: `需求 (未在当前列表): ${reqId}`
                }
              })
            }

            // 添加连线 (场景 -> 需求)
            links.push({
              source: scenarioId,
              target: reqId,
              lineStyle: {
                curveness: 0.2
              }
            })
          }
        }
      })
    })

    const testCaseList = testCases.filter(t => t.trim())
    testCaseList.forEach((testCase, index) => {
      const testCaseId = `testCase_` + index
      // 构造多行显示的 tooltip
      const tooltipContent = testCase
        ? `<b>测试用例 ${index + 1}</b><br/>${testCase.trim().split('\n').join('<br/>')}`
        : `测试用例 ${index + 1}`


      // 添加测试用例节点
      const testCaseStyle = TEST_CASE_OVERVIEW_NODE_STYLES.testCase
      nodesMap.set(testCaseId, {
        id: testCaseId,
        name: `测试用例 ${index + 1}`,
        category: testCaseStyle.category,
        ...getNodeAppearance(testCaseStyle),
        tooltip: {
          formatter: tooltipContent
        }
      })

      // 添加连线 (测试用例 -> 场景)
      links.push({
        source: testCaseId,
        target: `scenario_` + index,
        lineStyle: {
          curveness: 0.2
        }
      })
    })

    const finalNodes = Array.from(nodesMap.values())
    const reqNodes = finalNodes.filter(n => n.category === 0)
    const scenarioNodes = finalNodes.filter(n => n.category === 1)
    const testCaseNodes = finalNodes.filter(n => n.category === 2)

    // 为了让图表居中且节点分布均匀，计算一个起始 Y 偏移量
    const ySpacing = 100
    const reqStartY = -(reqNodes.length * ySpacing) / 2
    const scenarioStartY = -(scenarioNodes.length * ySpacing) / 2
    const testCaseStartY = -(testCaseNodes.length * ySpacing) / 2

    reqNodes.forEach((node, index) => {
      node.x = 300 // 需求排在左侧
      node.y = reqStartY + index * ySpacing
    })

    scenarioNodes.forEach((node, index) => {
      node.x = 800 // 测试场景排在右侧
      node.y = scenarioStartY + index * ySpacing
    })

    testCaseNodes.forEach((node, index) => {
      node.x = 1300 // 测试用例排在右侧
      node.y = testCaseStartY + index * ySpacing
    })

    return {
      tooltip: {},
      legend: {
        data: ['需求', '测试场景', '测试用例'],
        top: 10
      },
      series: [
        {
          type: 'graph',
          layout: 'none', // 使用 none 才能使手动指定的 x,y 生效
          data: finalNodes,
          links: links,
          categories: TEST_CASE_OVERVIEW_CATEGORIES,
          roam: true,
          label: {
            show: true,
            formatter: '{b}'
          },
          lineStyle: {
            color: '#999',
            curveness: 0.2
          }
        }
      ]
    }
  }, [requirements, scenarios])

  return (
    <div className="tc-container">
      {/* Header */}
      <div className="tc-header">
        {onBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="tc-back-btn"
          >
            返回
          </Button>
        )}
        <ExperimentOutlined className="tc-header-icon" />
        <h2 className="tc-title">测试用例总览</h2>
        <Badge count={requirements.length} className="tc-total-badge" overflowCount={999} />
      </div>

      {!showTestCaseGraph && (
        <div style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
          <div style={{ background: '#fff', height: '100%', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <ReactECharts
              option={echartsOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </div>
        </div>
      )}
      <div className={`tc-testcase-viewer${showTestCaseGraph ? ' tc-testcase-viewer-open' : ''}`}>
        <div className="tc-testcase-viewer-toolbar">
          <Button
            type={showTestCaseGraph ? 'default' : 'primary'}
            icon={<EyeOutlined />}
            onClick={() => setShowTestCaseGraph(prev => !prev)}
          >
            {showTestCaseGraph ? '返回关系图' : '查看测试用例'}
          </Button>
        </div>
        {showTestCaseGraph && (
          <div className="tc-testcase-graph-wrap">
            <FlowGraph sectionKey="testcaseView" />
          </div>
        )}
      </div>
    </div>
  )
}

export default TestCaseOverview
