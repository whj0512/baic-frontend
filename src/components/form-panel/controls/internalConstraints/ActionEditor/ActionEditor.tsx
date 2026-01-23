import React, { useState, useEffect, useRef } from 'react'
import { QuestionOutlined } from '@ant-design/icons'
import { AutoComplete, Input, Select, Tooltip } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import {
  getSymbols,
  getListOfName,
  getChCharOfStr,
  getSignalGuide,
  getFunctionGuide,
  isNameMatchOption,
  isSwitchComponent,
  ACTION_SIGNAL_NAME,
  isModifySignalValue,
  ConvertListToOptions,
  cacheKeyWithUsageFrequency,
  replaceChSymbolWithEnSymbol,
  sortSummaryListByUsageFrequency,
  joinObject,
} from './utils'
import './ActionEditor.css'

export interface ActionValue {
  name: string
  symbol: string
  value: string
  isStandard?: boolean
}

interface ActionEditorProps {
  value: ActionValue
  onUpdate: (value: ActionValue) => void
  controlSchema?: { groupId?: string }
  onFinish?: () => void
}

export const ActionEditor: React.FC<ActionEditorProps> = ({
  value: defaultValue,
  onUpdate,
  controlSchema,
  onFinish = () => {},
}) => {
  const { name, value, symbol } = defaultValue
  const id = controlSchema?.groupId

  const symbolOptions = getSymbols(id).map((symbol) => ({
    label: symbol,
    value: symbol,
  }))

  const containerRef = useRef<HTMLDivElement>(null)
  const isUserTrigger = useRef(false)
  const [inputedName, setInputedName] = useState(name)
  const [inputedValue, setInputedValue] = useState(value)
  const [selectedSymbol, setSelectedSymbol] = useState(symbol)
  const [nameOptions, setNameOptions] = useState<DefaultOptionType[]>([])
  const [valueOptions, setValueOptions] = useState<DefaultOptionType[]>([])
  const [summaryList, setSummaryList] = useState<any[]>([])
  const [illegalChSymbols, setIllegalChSymbols] = useState<string[]>([])
  const [selectedNameOption, setSelectedNameOption] = useState<any>(null)

  const { type = '', doc = '' } = selectedNameOption || {}

  // 初始化数据
  useEffect(() => {
    const summaryList = getListOfName(id) as any[]
    sortSummaryListByUsageFrequency(ACTION_SIGNAL_NAME, summaryList)
    const options = ConvertListToOptions(summaryList)
    setSummaryList(summaryList)
    setNameOptions(options)

    // 检查初始值是否匹配某个信号
    const isMatched = isNameMatchOption(summaryList, inputedName)
    if (isMatched) {
      const getOption = isMatched
      const { selectedNameOption, valueOptions } = getOption()
      const { type } = selectedNameOption
      setSelectedNameOption(selectedNameOption)

      if (type === 'type') {
        setValueOptions(valueOptions)
      }
      setSelectedSymbol(symbol)
      setInputedValue(value)
      setInputedName(name?.trim())
    } else {
      // 如果没有匹配，合并到 name 中
      const name = joinObject(defaultValue).express
      setSelectedSymbol('')
      setInputedValue('')
      setInputedName(name?.trim())
    }
  }, [])

  // 用户触发更新时同步数据
  useEffect(() => {
    if (isUserTrigger.current) {
      Object.assign(defaultValue, {
        name: inputedName,
        symbol: selectedSymbol,
        value: inputedValue,
        isStandard: true,
      })
      onUpdate(defaultValue)
    }
  }, [inputedName, selectedSymbol, inputedValue])

  // 缓存使用频率
  useEffect(() => {
    cacheKeyWithUsageFrequency(ACTION_SIGNAL_NAME, inputedName)
  }, [inputedName])

  // 点击外部关闭编辑器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // 检查是否点击在 ActionEditor 容器内
      if (containerRef.current && containerRef.current.contains(target)) {
        return
      }

      // 检查是否点击在 Ant Design 的下拉菜单内
      const isClickInDropdown = target.closest(
        '.ant-select-dropdown, .ant-dropdown, .ant-autocomplete-dropdown, .ant-picker-dropdown'
      )

      if (isClickInDropdown) {
        return
      }

      // 检查是否点击在滚动条上（通过检查点击位置是否在元素的可视区域外）
      const isClickOnScrollbar = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect()
        const x = event.clientX
        const y = event.clientY

        // 如果点击位置在元素的 clientWidth/clientHeight 之外但在 offsetWidth/offsetHeight 之内
        // 说明点击在滚动条上
        if (x >= rect.left + element.clientWidth && x <= rect.right) {
          return true
        }
        if (y >= rect.top + element.clientHeight && y <= rect.bottom) {
          return true
        }
        return false
      }

      // 检查是否点击在任何祖先元素的滚动条上
      let currentElement = target
      while (currentElement && currentElement !== document.body) {
        if (isClickOnScrollbar(currentElement)) {
          return
        }
        currentElement = currentElement.parentElement as HTMLElement
      }

      // 点击在外部，关闭编辑器
      fixIllegalString()
      onFinish()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [illegalChSymbols, inputedName, inputedValue])

  const onFilterByName = (text: string) => {
    const _summaryList = summaryList.map((item) => ({
      label: item.name,
      value: item.name,
    }))
    sortSummaryListByUsageFrequency(ACTION_SIGNAL_NAME, _summaryList)
    const options = _summaryList.filter((item) => item.label.includes(text))
    const illegalChSymbols = getChCharOfStr(text)
    setIllegalChSymbols(illegalChSymbols)
    setNameOptions(options)
    setInputedValue('')
    setInputedName(text)
    isUserTrigger.current = true
  }

  const onInputByValue = (text: string) => {
    const illegalChSymbols = getChCharOfStr(text)
    setIllegalChSymbols(illegalChSymbols)
    setInputedValue(text)
    isUserTrigger.current = true
  }

  const onSelectByName = (text: string) => {
    const _selected = summaryList.find((item) => item.name === text)

    const selectNameOption = (selected: any) => {
      const { type } = selected
      if (type === 'type') {
        const valueGuide = getSignalGuide(selected)
        if (valueGuide) {
          setValueOptions(valueGuide)
          setInputedValue('')
        }
      }
      if (type === 'logic') {
        const functionGuide = getFunctionGuide(selected)
        setInputedValue(functionGuide)
      }
      const isSwitch = isSwitchComponent(selectedNameOption, type)
      if (isSwitch) {
        const symbol = isSwitch()
        setSelectedSymbol(symbol)
      }
      setInputedName(selected.name)
      setSelectedNameOption(selected)
    }

    const inputName = (name: string) => {
      setInputedName(name)
      const isModified = isModifySignalValue(
        selectedNameOption,
        selectedSymbol,
        inputedValue
      )
      // 如果之前是信号，推断用户只是想改信号的名称，symbol 和 value 保持不变
      if (isModified) {
        return
      }
      // 重置
      setInputedValue('')
      setSelectedSymbol('')
      setSelectedNameOption(null)
    }

    // 如果 input 的值匹配上了 select 选项，也认为是 select 的选项
    if (_selected) {
      selectNameOption(_selected)
    } else {
      inputName(text)
    }
    isUserTrigger.current = true
  }

  const onSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol)
    isUserTrigger.current = true
  }

  const onInputValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const _value = event.target.value
    const illegalChSymbols = getChCharOfStr(_value)
    setIllegalChSymbols(illegalChSymbols)
    setInputedValue(_value)
    isUserTrigger.current = true
  }

  const fixIllegalString = () => {
    const value = replaceChSymbolWithEnSymbol(inputedValue, illegalChSymbols)
    if (value !== inputedValue) {
      setInputedValue(value)
    }
    const name = replaceChSymbolWithEnSymbol(inputedName, illegalChSymbols)
    if (name !== inputedName) {
      setInputedName(name)
    }
    setIllegalChSymbols([])
    isUserTrigger.current = true
  }

  const keyup = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fixIllegalString()
      onFinish()
    }
  }

  return (
    <div ref={containerRef}>
      <div className="action-editor-container">
        <AutoComplete
          autoFocus
          allowClear
          options={nameOptions}
          defaultValue={name}
          value={inputedName}
          style={{ width: 150 }}
          placeholder="信号名或函数名"
          onKeyUp={keyup}
          onSelect={onSelectByName}
          onSearch={onFilterByName}
        />
        {type ? (
          type === 'type' ? (
            <>
              <Select
                options={symbolOptions}
                onSelect={onSelectSymbol}
                value={selectedSymbol}
                style={{ width: 60 }}
              />
              <AutoComplete
                allowClear
                defaultValue={value}
                value={inputedValue}
                options={valueOptions}
                style={{ width: 80 }}
                placeholder="信号值"
                onKeyUp={keyup}
                onSelect={onInputByValue}
                onSearch={onInputByValue}
              />
            </>
          ) : (
            <>
              <Input
                prefix="("
                suffix=")"
                value={inputedValue}
                className="func-args"
                placeholder="参数"
                onKeyUp={keyup}
                onChange={onInputValue}
              />
              {!!doc && (
                <Tooltip title={doc}>
                  <QuestionOutlined className="help-icon" />
                </Tooltip>
              )}
            </>
          )
        ) : null}
      </div>
      {!!illegalChSymbols?.length && (
        <div className="warn-tips" onClick={fixIllegalString}>
          &apos;{illegalChSymbols.join(',')}&apos; 不合法.
          <span className="fixup">修复(Enter)</span>
        </div>
      )}
    </div>
  )
}

export default ActionEditor
