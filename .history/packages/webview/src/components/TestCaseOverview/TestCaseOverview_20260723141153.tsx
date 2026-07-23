import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Empty, Result, Spin } from 'antd'
import { ArrowLeftOutlined, ExperimentOutlined, EyeOutlined } from '@ant-design/icons'
import FlowGraph from '../graph'
import AntvG6GraphRenderer from './graph-renderers/AntvG6GraphRenderer'
import { fetchTraceabilityGraph } from './testCaseOverviewApi'
import { buildTestCaseOverviewGraphData } from './testCaseOverviewGraphData'
import type { TraceabilityGraphResponse } from './types'
import './TestCaseOverview.css'

interface TestCaseOverviewProps {
  projectId: string
  onBack?: () => void
}

const TestCaseOverview: React.FC<TestCaseOverviewProps> = ({ projectId, onBack }) => {
  const [showTestCaseGraph, setShowTestCaseGraph] = useState(false)
  const [response, setResponse] = useState<TraceabilityGraphResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)
  const g6GraphData = useMemo(
    () => response ? buildTestCaseOverviewGraphData(response.g6) : { nodes: [], edges: [] },
    [response],
  )
  const hasGraphData = Boolean(g6GraphData.nodes?.length)

  useEffect(() => {
    const abortController = new AbortController()

    setLoading(true)
    setErrorMessage('')
    setResponse(null)

    fetchTraceabilityGraph(projectId, abortController.signal)
      .then(setResponse)
      .catch(error => {
        if (abortController.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : '获取测试用例关系失败')
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      })

    return () => abortController.abort()
  }, [projectId, requestVersion])

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
        <h2 className="tc-title">测试用例关系提取</h2>
        <Badge
          count={response?.summary.test_case_count ?? 0}
          className="tc-total-badge"
          overflowCount={999}
          showZero
          title="测试用例数量"
        />
      </div>

      {!showTestCaseGraph && (
        <div className="tc-overview-graph-wrap">
          {loading ? (
            <div className="tc-overview-state">
              <Spin size="large" tip="正在提取追溯关系..." />
            </div>
          ) : errorMessage ? (
            <div className="tc-overview-state">
              <Result
                status="error"
                title="测试用例关系加载失败"
                subTitle={errorMessage}
                extra={(
                  <Button type="primary" onClick={() => setRequestVersion(version => version + 1)}>
                    重试
                  </Button>
                )}
              />
            </div>
          ) : hasGraphData ? (
            <AntvG6GraphRenderer graphData={g6GraphData} />
          ) : (
            <div className="tc-overview-state">
              <Empty description="当前项目暂无可展示的追溯关系" />
            </div>
          )}
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
