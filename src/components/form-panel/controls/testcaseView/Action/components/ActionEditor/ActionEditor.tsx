import { QuestionOutlined } from '@ant-design/icons'
import { AutoComplete, Input, Select, Tooltip } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import {
  type ChangeEvent,
  type FC,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { getDatabaseDataForCase } from '../../../getDatabaseDataForCase'
import { formatAction, type ActionType, type ActionValue } from '../../utils'
import {
  ACTION_SIGNAL_NAME,
  cacheKeyWithUsageFrequency,
  convertListToOptions,
  getChCharOfStr,
  getFunctionGuide,
  getListOfName,
  getSignalGuide,
  getSymbols,
  isModifySignalValue,
  isNameMatchOption,
  isSwitchComponent,
  replaceChSymbolWithEnSymbol,
  sortSummaryListByUsageFrequency,
} from './utils'
import './ActionEditor.css'

interface ActionEditorProps {
  value: ActionValue
  onUpdate: (value: ActionValue) => void
  controlSchema: { name: ActionType }
  onFinish: () => void
}

type Candidate = ReturnType<typeof getListOfName>[number]

const ActionEditor: FC<ActionEditorProps> = ({
  value: defaultValue,
  onUpdate,
  controlSchema,
  onFinish,
}) => {
  const actionType = controlSchema.name
  const symbolOptions = getSymbols(actionType).map((symbol) => ({
    label: symbol,
    value: symbol,
  }))

  const containerRef = useRef<HTMLDivElement>(null)
  const isUserTrigger = useRef(false)
  const [inputedName, setInputedName] = useState(defaultValue.name)
  const [inputedValue, setInputedValue] = useState(defaultValue.value)
  const [selectedSymbol, setSelectedSymbol] = useState(defaultValue.symbol)
  const [nameOptions, setNameOptions] = useState<DefaultOptionType[]>([])
  const [valueOptions, setValueOptions] = useState<DefaultOptionType[]>([])
  const [summaryList, setSummaryList] = useState<Candidate[]>([])
  const [illegalChSymbols, setIllegalChSymbols] = useState<string[]>([])
  const [selectedNameOption, setSelectedNameOption] = useState<Candidate | null>(null)
  const { type = '', doc = '' } = selectedNameOption ?? {}

  useEffect(() => {
    const env = getDatabaseDataForCase()
    const nextSummaryList = getListOfName(actionType, env)
    sortSummaryListByUsageFrequency(ACTION_SIGNAL_NAME, nextSummaryList)
    setSummaryList(nextSummaryList)
    setNameOptions(convertListToOptions(nextSummaryList))

    const matchedOption = isNameMatchOption(nextSummaryList, inputedName)
    if (matchedOption) {
      const matched = matchedOption()
      setSelectedNameOption(matched.selectedNameOption)
      setValueOptions(matched.valueOptions)
      setSelectedSymbol(defaultValue.symbol)
      setInputedValue(defaultValue.value)
      setInputedName(defaultValue.name.trim())
      return
    }

    setSelectedSymbol('')
    setInputedValue('')
    setInputedName(formatAction(defaultValue).trim())
  }, [])

  useEffect(() => {
    if (!isUserTrigger.current) return

    isUserTrigger.current = false
    onUpdate({
      ...defaultValue,
      name: inputedName,
      symbol: selectedSymbol,
      value: inputedValue,
      isStandard: true,
      express: undefined,
    })
  }, [defaultValue, inputedName, inputedValue, onUpdate, selectedSymbol])

  useEffect(() => {
    cacheKeyWithUsageFrequency(ACTION_SIGNAL_NAME, inputedName)
  }, [inputedName])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (containerRef.current?.contains(target)) return
      if (target.closest('.ant-select-dropdown, .ant-dropdown, .ant-picker-dropdown')) return

      fixIllegalString()
      onFinish()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [illegalChSymbols, inputedName, inputedValue, onFinish])

  const onFilterByName = (text: string) => {
    const nextSummaryList = [...summaryList]
    sortSummaryListByUsageFrequency(ACTION_SIGNAL_NAME, nextSummaryList)
    setNameOptions(convertListToOptions(nextSummaryList).filter((item) => `${item.label}`.includes(text)))
    setIllegalChSymbols(getChCharOfStr(text))
    setInputedValue('')
    setInputedName(text)
    isUserTrigger.current = true
  }

  const onInputByValue = (text: string) => {
    setIllegalChSymbols(getChCharOfStr(text))
    setInputedValue(text)
    isUserTrigger.current = true
  }

  const onSelectByName = (text: string) => {
    const selected = summaryList.find((item) => item.name === text)

    if (selected) {
      if (selected.type === 'type') {
        setValueOptions(getSignalGuide(selected))
        setInputedValue('')
      }

      if (selected.type === 'logic') {
        setInputedValue(getFunctionGuide(selected))
      }

      const switchComponent = isSwitchComponent(selectedNameOption, selected.type)
      if (switchComponent) {
        setSelectedSymbol(switchComponent())
      }

      setInputedName(selected.name)
      setSelectedNameOption(selected)
      isUserTrigger.current = true
      return
    }

    setInputedName(text)
    if (!isModifySignalValue(selectedNameOption, selectedSymbol, inputedValue)) {
      setInputedValue('')
      setSelectedSymbol('')
      setSelectedNameOption(null)
    }
    isUserTrigger.current = true
  }

  const onSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol)
    isUserTrigger.current = true
  }

  const onInputValue = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    setIllegalChSymbols(getChCharOfStr(nextValue))
    setInputedValue(nextValue)
    isUserTrigger.current = true
  }

  const fixIllegalString = () => {
    const nextValue = replaceChSymbolWithEnSymbol(inputedValue, illegalChSymbols)
    const nextName = replaceChSymbolWithEnSymbol(inputedName, illegalChSymbols)

    if (nextValue !== inputedValue) setInputedValue(nextValue)
    if (nextName !== inputedName) setInputedName(nextName)
    setIllegalChSymbols([])
    isUserTrigger.current = true
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return
    fixIllegalString()
    onFinish()
  }

  return (
    <div ref={containerRef}>
      <div className="testcase-action-editor action">
        <AutoComplete
          autoFocus
          allowClear
          options={nameOptions}
          value={inputedName}
          placeholder="Signal or function"
          onKeyUp={handleKeyUp}
          onSelect={onSelectByName}
          onSearch={onFilterByName}
        />
        {type ? (
          type === 'type' ? (
            <>
              <Select
                options={symbolOptions}
                value={selectedSymbol}
                onSelect={onSelectSymbol}
              />
              <AutoComplete
                allowClear
                value={inputedValue}
                options={valueOptions}
                placeholder="Value"
                onKeyUp={handleKeyUp}
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
                className="testcase-action-editor__func-args"
                placeholder="Arguments"
                onKeyUp={handleKeyUp}
                onChange={onInputValue}
              />
              {!!doc && (
                <Tooltip title={doc}>
                  <QuestionOutlined className="testcase-action-editor__help" />
                </Tooltip>
              )}
            </>
          )
        ) : null}
      </div>
      {!!illegalChSymbols.length && (
        <div className="testcase-action-editor__warn-tips" onClick={fixIllegalString}>
          &apos;{illegalChSymbols.join(',')}&apos; invalid
          <span className="testcase-action-editor__fixup">Fix (Enter)</span>
        </div>
      )}
    </div>
  )
}

export default ActionEditor
