import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CodeOutlined, CopyOutlined, LoadingOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { Button, Input, message, Modal, Tooltip } from 'antd'
import type { Graph } from '@antv/x6'
import EditableSwitch from '../../common/EditableSwitch'
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
  graph?: Graph
  currentNodeId?: string
}

const COMPILE_DELAY = 1000

const Script: React.FC<ScriptProps> = ({
  value = '',
  onChange,
  graph,
  currentNodeId,
}) => {
  const [completed, setCompleted] = useState(true)
  const [runParams, setRunParams] = useState<RunParam[]>([])
  const [runResult, setRunResult] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advancedValue, setAdvancedValue] = useState(value)
  const compileSeqRef = useRef(0)

  const getCallNodes = useCallback(() => (
    collectCallNodes(graph, currentNodeId)
  ), [graph, currentNodeId])

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
        return
      }

      setRunParams([])
      setRunResult('')
      message.error(result.message || '脚本变量提取失败')
    }, COMPILE_DELAY)

    return () => {
      window.clearTimeout(loadingTimer)
      window.clearTimeout(timer)
    }
  }, [getCallNodes, value])

  const allParamsFilled = useMemo(() => (
    runParams.length > 0 && runParams.every((param) => String(param.value ?? '').trim() !== '')
  ), [runParams])

  useEffect(() => {
    if (!runParams.length || !allParamsFilled) {
      return
    }

    let cancelled = false

    const runScript = async () => {
      const variables = listToObject(runParams)
      if (Object.keys(variables).length !== runParams.length) {
        message.error('illegal value!')
        setRunResult('')
        return
      }

      const result = await calculateCallShell(getCallNodes(), variables)
      if (cancelled) {
        return
      }

      if (result.status === 'ok') {
        setRunResult(result.data ?? '')
        return
      }

      setRunResult('')
      message.error(result.message || '脚本运行失败')
    }

    runScript()

    return () => {
      cancelled = true
    }
  }, [allParamsFilled, getCallNodes, runParams])

  const handleScriptChange = (nextValue: string) => {
    onChange?.(nextValue)
  }

  const handleParamChange = (index: number, nextValue: string) => {
    if (!nextValue.trim()) {
      setRunResult('')
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
    await navigator.clipboard.writeText(JSON.stringify(runParams))
    message.success('复制成功')
  }

  const handleOpenAdvancedEditor = () => {
    setAdvancedValue(value)
    setAdvancedOpen(true)
  }

  const handleSaveAdvancedEditor = () => {
    onChange?.(advancedValue)
    setAdvancedOpen(false)
  }

  return (
    <div className="script-control">
      <div className="script-actionbar">
        <Tooltip title="高级编辑">
          <button
            type="button"
            className="script-action-button"
            onClick={handleOpenAdvancedEditor}
          >
            <CodeOutlined />
          </button>
        </Tooltip>
      </div>

      <div className="script-input-wrapper">
        <EditableSwitch readonlyValue={value || '未设置脚本'}>
          {(onFinish) => (
            <input
              type="text"
              className="script-input"
              value={value}
              placeholder="输入脚本表达式"
              autoFocus
              onBlur={onFinish}
              onChange={(event) => handleScriptChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onFinish()
                }
              }}
            />
          )}
        </EditableSwitch>
      </div>

      {!completed ? (
        <LoadingOutlined className="script-status-icon" />
      ) : (
        runParams.length > 0 && (
          <CopyOutlined
            onClick={handleCopyParams}
            className="script-status-icon script-copy-icon"
          />
        )
      )}

      {runParams.length > 0 && (
        <div className="script-param-container">
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

          {runResult && (
            <div className="script-result-row">
              <span className="script-result-label">结果：</span>
              <span className="script-result-text">{runResult}</span>
            </div>
          )}
        </div>
      )}

      <Modal
        title="脚本高级编辑"
        open={advancedOpen}
        width={760}
        centered
        destroyOnHidden
        onCancel={() => setAdvancedOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setAdvancedOpen(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveAdvancedEditor}>
            保存
          </Button>,
        ]}
      >
        <div className="script-advanced-editor">
          <Editor
            height="320px"
            defaultLanguage="python"
            value={advancedValue}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              automaticLayout: true,
            }}
            onChange={(nextValue) => setAdvancedValue(nextValue ?? '')}
          />
        </div>
      </Modal>
    </div>
  )
}

export default Script
