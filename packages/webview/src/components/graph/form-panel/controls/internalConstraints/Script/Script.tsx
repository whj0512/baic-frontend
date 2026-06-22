import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CodeOutlined,
  CopyOutlined,
  LoadingOutlined,
  CaretRightOutlined,
} from '@ant-design/icons'
import { Button, Input, message, Tooltip } from 'antd'
import type { Graph } from '@antv/x6'
import { useAdvancedEditor } from '../../../../../../hooks/useAdvancedEditor'
import EditableSwitch from '../../common/EditableSwitch'
import { createActionCompletionItems } from '../../../../../../data/advancedEditorCompletions'
import {
  calculateCallShell,
  collectCallNodes,
  extractVariablesShell,
  listToObject,
  type RunParam,
} from './utils'
import './Script.css'

interface ScriptProps {
  value?: string
  onChange?: (value: string) => void
  controlSchema?: { groupId?: string }
  graph?: Graph
  currentNodeId?: string
}

const COMPILE_DELAY = 1000

const Script: React.FC<ScriptProps> = ({
  value = '',
  onChange,
  controlSchema,
  graph,
  currentNodeId,
}) => {
  const [completed, setCompleted] = useState(true)
  const [runParams, setRunParams] = useState<RunParam[]>([])
  const [runResult, setRunResult] = useState('')
  const [runError, setRunError] = useState(false)
  const compileSeqRef = useRef(0)
  const groupId = controlSchema?.groupId
  const advancedCompletionItems = useMemo(() => createActionCompletionItems(groupId), [groupId])
  const advancedEditor = useAdvancedEditor<string>({
    value,
    title: '脚本高级编辑',
    languageLabel: 'Python',
    editorLanguage: 'python',
    shortcutLabel: '保存',
    cancelText: '取消',
    saveText: '保存',
    completionLanguage: 'python',
    completionItems: advancedCompletionItems,
    onSave: (nextValue) => onChange?.(nextValue),
    onError: (errorMessage) => message.error(errorMessage),
  })

  const getCallNodes = useCallback(() => (
    collectCallNodes(graph, currentNodeId)
  ), [graph, currentNodeId])

  // ── 编译：提取脚本变量 ──
  useEffect(() => {
    const seq = compileSeqRef.current + 1
    compileSeqRef.current = seq
    const loadingTimer = window.setTimeout(() => {
      if (compileSeqRef.current === seq) {
        setCompleted(false)
      }
    }, 0)

    const timer = window.setTimeout(async () => {
      const result = await extractVariablesShell(getCallNodes())

      if (compileSeqRef.current !== seq) {
        return
      }

      setCompleted(true)
      if (result.status === 'ok') {
        setRunParams(Object.values(result.data ?? {}))
        setRunResult('')
        setRunError(false)
        return
      }

      setRunParams([])
      setRunResult('')
      setRunError(false)
      message.error(result.message || '脚本变量提取失败')
    }, COMPILE_DELAY)

    return () => {
      window.clearTimeout(loadingTimer)
      window.clearTimeout(timer)
    }
  }, [getCallNodes, value])

  // ── 自动运行脚本 ──
  const allParamsFilled = useMemo(() => (
    runParams.length > 0 && runParams.every((param) => String(param.value ?? '').trim() !== '')
  ), [runParams])

  const runScript = useCallback(async () => {
    const variables = listToObject(runParams)
    if (Object.keys(variables).length !== runParams.length) {
      message.error('参数值不合法')
      setRunResult('')
      setRunError(true)
      return
    }

    const result = await calculateCallShell(getCallNodes(), variables)

    if (result.status === 'ok') {
      setRunResult(result.data ?? '')
      setRunError(false)
      return
    }

    setRunResult(result.message || '脚本运行失败')
    setRunError(true)
  }, [getCallNodes, runParams])

  useEffect(() => {
    if (!runParams.length || !allParamsFilled) {
      return
    }

    let cancelled = false

    const run = async () => {
      const variables = listToObject(runParams)
      if (Object.keys(variables).length !== runParams.length) {
        if (!cancelled) {
          setRunResult('')
          setRunError(false)
        }
        return
      }

      const result = await calculateCallShell(getCallNodes(), variables)
      if (cancelled) {
        return
      }

      if (result.status === 'ok') {
        setRunResult(result.data ?? '')
        setRunError(false)
        return
      }

      setRunResult(result.message || '脚本运行失败')
      setRunError(true)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [allParamsFilled, getCallNodes, runParams])

  // ── 事件处理 ──
  const handleScriptChange = (nextValue: string) => {
    onChange?.(nextValue)
  }

  const handleParamChange = (index: number, nextValue: string) => {
    if (!nextValue.trim()) {
      setRunResult('')
      setRunError(false)
    }

    setRunParams((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        value: nextValue,
      }
      return next
    })
  }

  const handleCopyParams = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(runParams, null, 2))
      message.success('参数已复制')
    } catch {
      message.error('复制失败，请手动复制')
    }
  }

  return (
    <div className="script-control">
      {/* ── 操作栏：高级编辑 + 状态图标 ── */}
      <div className="script-actionbar">
        {!completed ? (
          <LoadingOutlined className="script-status-icon" />
        ) : (
          runParams.length > 0 && (
            <Tooltip title="复制参数">
              <CopyOutlined
                onClick={handleCopyParams}
                className="script-status-icon script-copy-icon"
              />
            </Tooltip>
          )
        )}
        <Tooltip title="高级编辑">
          <button
            type="button"
            className="script-action-button"
            onClick={advancedEditor.openEditor}
          >
            <CodeOutlined />
          </button>
        </Tooltip>
      </div>

      {/* ── 脚本输入 ── */}
      <div className="script-input-wrapper">
        <EditableSwitch readonlyValue={value || '未设置脚本'}>
          {(onFinish) => (
            <Input
              value={value}
              placeholder="输入脚本表达式"
              autoFocus
              onBlur={onFinish}
              onChange={(event) => handleScriptChange(event.target.value)}
              onPressEnter={onFinish}
            />
          )}
        </EditableSwitch>
      </div>

      {/* ── 参数列表 + 结果 ── */}
      {(runParams.length > 0 || runResult) && (
        <div className="script-param-container">
          {runParams.length > 0 && (
            <div className="script-param-header">
              <span className="script-param-title">变量</span>
            </div>
          )}

          {runParams.map((item, index) => {
            const type = item.type === 'int' ? 'integer' : item.type
            const readonlyValue = item.value || ''

            return (
              <div className="script-param-row" key={`${item.name}-${index}`}>
                <Tooltip title={`${item.name}${type ? ` (${type})` : ''}`}>
                  <label>{item.name}：</label>
                </Tooltip>
                <EditableSwitch readonlyValue={readonlyValue}>
                  {(onFinish) => (
                    <Input
                      autoFocus
                      value={item.value}
                      onBlur={onFinish}
                      onPressEnter={onFinish}
                      onChange={(event) => handleParamChange(index, event.target.value)}
                    />
                  )}
                </EditableSwitch>
              </div>
            )
          })}

          {/* 手动运行按钮 */}
          {allParamsFilled && (
            <div className="script-run-row">
              <Button
                type="primary"
                size="small"
                icon={<CaretRightOutlined />}
                onClick={runScript}
              >
                运行
              </Button>
            </div>
          )}

          {/* 运行结果 */}
          {runResult && (
            <div className={`script-result-row${runError ? ' script-result-error' : ''}`}>
              <span className="script-result-label">
                {runError ? '错误：' : '结果：'}
              </span>
              <span className="script-result-text">{runResult}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Script
