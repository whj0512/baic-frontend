import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, Result, Spin } from 'antd'
import { ApartmentOutlined } from '@ant-design/icons'
import TraceabilityExtract from '../TraceabilityExtract/TraceabilityExtract'
import { fetchProjectTestCases } from './projectTestCasesApi'
import type { JsonValue, ProjectTestCase } from './types'
import './ProjectTestCaseView.css'

interface ProjectTestCaseViewProps {
  projectId: string
  active: boolean
}

type TestCaseViewMode = 'cases' | 'traceability'

function getNodeCount(testCase: ProjectTestCase): number | null {
  const testContent = testCase.test_content
  if (!isJsonObject(testContent) || !Array.isArray(testContent.nodes)) return null
  return testContent.nodes.length
}

function formatUpdatedAt(value: JsonValue | undefined): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '更新时间未知'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('zh-CN')
}

function isJsonObject(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ProjectTestCaseView({ projectId, active }: ProjectTestCaseViewProps) {
  const [mode, setMode] = useState<TestCaseViewMode>('cases')
  const [hasOpenedTraceability, setHasOpenedTraceability] = useState(false)
  const [testCases, setTestCases] = useState<ProjectTestCase[]>([])
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)

  const selectedTestCase = useMemo(
    () => testCases.find(testCase => testCase.id === selectedTestCaseId) ?? null,
    [selectedTestCaseId, testCases],
  )

  const formattedJson = useMemo(() => {
    if (!selectedTestCase) return { value: '', error: false }

    try {
      const value = JSON.stringify(selectedTestCase, null, 2)
      return typeof value === 'string'
        ? { value, error: false }
        : { value: '', error: true }
    } catch {
      return { value: '', error: true }
    }
  }, [selectedTestCase])

  useEffect(() => {
    setMode('cases')
    setHasOpenedTraceability(false)
    setTestCases([])
    setSelectedTestCaseId(null)
    setLoading(false)
    setLoaded(false)
    setErrorMessage('')
    setRequestVersion(0)
  }, [projectId])

  useEffect(() => {
    if (!active || loaded) return

    const abortController = new AbortController()
    setLoading(true)
    setErrorMessage('')

    fetchProjectTestCases(projectId, abortController.signal)
      .then(nextTestCases => {
        if (abortController.signal.aborted) return

        setTestCases(nextTestCases)
        setSelectedTestCaseId(nextTestCases[0]?.id ?? null)
        setLoaded(true)
      })
      .catch(error => {
        if (abortController.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : '获取项目测试用例失败')
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      })

    return () => abortController.abort()
  }, [active, loaded, projectId, requestVersion])

  const openTraceability = () => {
    setHasOpenedTraceability(true)
    setMode('traceability')
  }

  return (
    <div className="project-test-case-view">
      <section
        className="project-test-case-subview"
        hidden={mode !== 'cases'}
        aria-hidden={mode !== 'cases'}
      >
        <header className="project-test-case-header">
          <div>
            <h2>项目测试用例</h2>
            <p>查看当前项目测试用例及所选记录的完整原始 JSON</p>
          </div>
          <Button
            type="primary"
            icon={<ApartmentOutlined />}
            onClick={openTraceability}
          >
            关系总览
          </Button>
        </header>

        <div className="project-test-case-content">
          <section className="project-test-case-panel project-test-case-list-panel">
            <h3>用例列表</h3>
            <div className="project-test-case-list-content">
              {loading ? (
                <div className="project-test-case-state">
                  <Spin tip="正在加载项目测试用例..." />
                </div>
              ) : errorMessage ? (
                <Result
                  status="error"
                  title="项目测试用例加载失败"
                  subTitle={errorMessage}
                  extra={(
                    <Button
                      type="primary"
                      onClick={() => setRequestVersion(version => version + 1)}
                    >
                      重试
                    </Button>
                  )}
                />
              ) : testCases.length === 0 ? (
                <div className="project-test-case-state">
                  <Empty description="当前项目暂无测试用例" />
                </div>
              ) : (
                <ul className="project-test-case-list">
                  {testCases.map(testCase => {
                    const nodeCount = getNodeCount(testCase)
                    const selected = testCase.id === selectedTestCaseId

                    return (
                      <li key={testCase.id}>
                        <button
                          type="button"
                          className={`project-test-case-item${selected ? ' project-test-case-item-selected' : ''}`}
                          aria-pressed={selected}
                          onClick={() => setSelectedTestCaseId(testCase.id)}
                        >
                          <strong title={testCase.name || testCase.id}>
                            {testCase.name || testCase.id}
                          </strong>
                          <span>{formatUpdatedAt(testCase.updated_at)}</span>
                          <span>{nodeCount === null ? '节点数未知' : `${nodeCount} 个节点`}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="project-test-case-panel project-test-case-json-panel">
            <h3>所选用例完整原始 JSON</h3>
            <div className="project-test-case-json-content">
              {!selectedTestCase ? (
                <div className="project-test-case-state">
                  <Empty description="请选择一个测试用例" />
                </div>
              ) : formattedJson.error ? (
                <div className="project-test-case-state">
                  <Result
                    status="error"
                    title="当前测试用例数据无法格式化"
                  />
                </div>
              ) : (
                <pre className="project-test-case-json">
                  <code>{formattedJson.value}</code>
                </pre>
              )}
            </div>
          </section>
        </div>
      </section>

      {hasOpenedTraceability ? (
        <section
          className="project-test-case-subview"
          hidden={mode !== 'traceability'}
          aria-hidden={mode !== 'traceability'}
        >
          <TraceabilityExtract
            projectId={projectId}
            onBack={() => setMode('cases')}
          />
        </section>
      ) : null}
    </div>
  )
}

export default ProjectTestCaseView
