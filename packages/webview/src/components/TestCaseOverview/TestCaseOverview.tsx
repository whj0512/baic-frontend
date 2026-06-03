import React, { useMemo, useState } from 'react'
import { Button, Badge } from 'antd'
import { ArrowLeftOutlined, ExperimentOutlined, EyeOutlined } from '@ant-design/icons'
import type { Requirement } from '../../models/Requirement'
import FlowGraph from '../graph'
import AntvG6GraphRenderer from './graph-renderers/AntvG6GraphRenderer'
import { buildTestCaseOverviewGraphData } from './testCaseOverviewGraphData'
import './TestCaseOverview.css'

interface TestCaseOverviewProps {
  /** 来自 groupedRequirements[type].subTypeMap 下所有需求的扁平列表 */
  requirements: Requirement[]
  onBack?: () => void
}

const TestCaseOverview: React.FC<TestCaseOverviewProps> = ({ requirements, onBack }) => {
  const [showTestCaseGraph, setShowTestCaseGraph] = useState(false)
  const g6GraphData = useMemo(() => buildTestCaseOverviewGraphData(requirements), [requirements])

  return (
    <div className="tc-container">
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
        <div className="tc-overview-graph-wrap">
          <AntvG6GraphRenderer graphData={g6GraphData} />
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
