import { QuestionOutlined } from '@ant-design/icons'
import { AutoComplete, Input, Select, Tooltip } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import {
  type ChangeEvent,
  type FC,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getLegacyActionDatabaseData } from '../../data/legacyLogics'
import {
  ACTION_SIGNAL_NAME,
  type ActionCandidate,
  type ActionValue,
  cacheKeyWithUsageFrequency,
  convertListToOptions,
  formatAction,
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
} from '../../utils'
import './ActionEditor.css'

interface ActionEditorProps {
  value: ActionValue
  onUpdate: (value: ActionValue) => void
  controlSchema?: { groupId?: string }
  onFinish: () => void
}

const ActionEditor: FC<ActionEditorProps> = ({
  value: defaultValue,
  onUpdate,
  controlSchema,
  onFinish,
}) => {
  const groupId = controlSchema?.groupId
  const symbolOptions = useMemo(() => (
    getSymbols(groupId).map((symbol) => ({
      label: symbol,
      value: symbol,
    }))
  ), [groupId])
  const summaryList = useMemo(() => {
    const nextSummaryList = getListOfName(groupId, getLegacyActionDatabaseData())
    sortSummaryListByUsageFrequency(ACTION_SIGNAL_NAME, nextSummaryList)
    return nextSummaryList
  }, [groupId])
  const matchedOption = useMemo(() => {
    const matcher = isNameMatchOption(summaryList, defaultValue.name)
    return matcher ? matcher() : null
  }, [defaultValue.name, summaryList])

  const containerRef = useRef<HTMLDivElement>(null)
  const isUserTrigger = useRef(false)
  const [inputedName, setInputedName] = useState(
    matchedOption ? defaultValue.name.trim() : formatAction(defaultValue).trim(),
  )
  const [inputedValue, setInputedValue] = useState(defaultValue.value)
  const [selectedSymbol, setSelectedSymbol] = useState(defaultValue.symbol)
  const [nameFilter, setNameFilter] = useState('')
  const [illegalChSymbols, setIllegalChSymbols] = useState<string[]>([])
  const [selectedNameOption, setSelectedNameOption] = useState<ActionCandidate | null>(
    matchedOption?.selectedNameOption ?? null,
  )
  const { type = '', doc = '' } = selectedNameOption ?? {}
  const nameOptions = useMemo(() => (
    convertListToOptions(summaryList).filter((item) => `${item.label}`.includes(nameFilter))
  ), [nameFilter, summaryList])
  const valueOptions = useMemo<DefaultOptionType[]>(() => {
    if (selectedNameOption?.type !== 'type') return []
    return getSignalGuide(selectedNameOption)
  }, [selectedNameOption])

  const applySelectedName = useCallback((selected: ActionCandidate) => {
    if (selected.type === 'type') {
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
  }, [selectedNameOption])

  useEffect(() => {
    if (isUserTrigger.current) return

    const matcher = isNameMatchOption(summaryList, defaultValue.name)
    if (matcher) {
      const matched = matcher()
      setSelectedNameOption(matched.selectedNameOption)
      setInputedName(defaultValue.name.trim())
      setInputedValue(defaultValue.value)
      setSelectedSymbol(defaultValue.symbol)
      return
    }

    setSelectedNameOption(null)
    setInputedName(formatAction(defaultValue).trim())
    setInputedValue('')
    setSelectedSymbol('')
  }, [defaultValue, summaryList])

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

  const fixIllegalString = useCallback(() => {
    const nextValue = replaceChSymbolWithEnSymbol(inputedValue, illegalChSymbols)
    const nextName = replaceChSymbolWithEnSymbol(inputedName, illegalChSymbols)

    if (nextValue !== inputedValue) setInputedValue(nextValue)
    if (nextName !== inputedName) setInputedName(nextName)
    setIllegalChSymbols([])
    isUserTrigger.current = true
  }, [illegalChSymbols, inputedName, inputedValue])

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
  }, [fixIllegalString, onFinish])

  const onFilterByName = (text: string) => {
    setNameFilter(text)
    setIllegalChSymbols(getChCharOfStr(text))

    const matcher = isNameMatchOption(summaryList, text)
    if (matcher) {
      applySelectedName(matcher().selectedNameOption)
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

  const onInputByValue = (text: string) => {
    setIllegalChSymbols(getChCharOfStr(text))
    setInputedValue(text)
    isUserTrigger.current = true
  }

  const onSelectByName = (text: string) => {
    const selected = summaryList.find((item) => item.name === text)

    if (selected) {
      applySelectedName(selected)
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

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return
    fixIllegalString()
    onFinish()
  }

  return (
    <div ref={containerRef}>
      <div className="internal-action-editor">
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
                className="internal-action-editor__func-args"
                placeholder="Arguments"
                onKeyUp={handleKeyUp}
                onChange={onInputValue}
              />
              {!!doc && (
                <Tooltip title={doc}>
                  <QuestionOutlined className="internal-action-editor__help" />
                </Tooltip>
              )}
            </>
          )
        ) : null}
      </div>
      {!!illegalChSymbols.length && (
        <div className="internal-action-editor__warn-tips" onClick={fixIllegalString}>
          &apos;{illegalChSymbols.join(',')}&apos; invalid
          <span className="internal-action-editor__fixup">Fix (Enter)</span>
        </div>
      )}
    </div>
  )
}

export default ActionEditor
