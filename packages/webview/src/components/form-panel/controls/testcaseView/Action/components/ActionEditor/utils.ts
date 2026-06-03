import type { DefaultOptionType } from 'antd/es/select'
import type {
  CaseDatabaseData,
  LogicDefinition,
  SignalTypeDefinition,
} from '../../../getDatabaseDataForCase'
import type { ActionType } from '../../utils'

type Candidate = LogicDefinition | SignalTypeDefinition

export const SEND_SYMBOL = ['=']
export const FUNCTION_SYMBOL = '()'
export const EXPECT_SYMBOL = ['==', '>', '>=', '<', '<=', '!=', 'not in', 'in']
export const ACTION_SIGNAL_NAME = 'ACTION_SIGNAL_NAME'

export const getSymbols = (propertyName: ActionType) => {
  if (propertyName === 'expect') return EXPECT_SYMBOL
  return SEND_SYMBOL
}

export const getListOfName = (propertyName: ActionType, env: CaseDatabaseData) => {
  if (propertyName === 'assignment') return env.logics
  return [...env.logics, ...env.types]
}

export const convertListToOptions = (list: Candidate[]) => {
  return list.map((item) => ({
    label: item.name,
    value: item.name,
  }))
}

export const isSwitchComponent = (
  selectedNameOption: Candidate | null,
  currentType: Candidate['type'],
) => {
  if (selectedNameOption?.type === currentType) return false

  return () => {
    if (currentType === 'type') return ''
    if (currentType === 'logic') return FUNCTION_SYMBOL
    return ''
  }
}

export const getSignalGuide = (selected: SignalTypeDefinition) => {
  return selected.value_string_mapping?.map((option) => ({
    label: `${option.name} ${option.value}`,
    value: option.value,
  })) ?? []
}

export const getFunctionGuide = (selected: LogicDefinition) => {
  const matcher = selected.name_as.match(/\((.*)\)/)
  return matcher?.[1] ?? ''
}

export const isModifySignalValue = (
  selectedNameOption: Candidate | null,
  selectedSymbol: string,
  inputedValue: string,
) => {
  return selectedNameOption?.type === 'type' && Boolean(selectedSymbol || inputedValue)
}

export const isNameMatchOption = (summaryList: Candidate[], name: string) => {
  const selectedNameOption = summaryList.find((item) => item.name === name)
  if (!selectedNameOption) return false

  return () => {
    let valueOptions: DefaultOptionType[] = []
    let value = ''

    if (selectedNameOption.type === 'type') {
      valueOptions = getSignalGuide(selectedNameOption)
    }

    if (selectedNameOption.type === 'logic') {
      value = getFunctionGuide(selectedNameOption)
    }

    return {
      selectedNameOption,
      valueOptions,
      value,
    }
  }
}

const chineseSymbolMap: Record<string, string> = {
  '。': '.',
  '【': '[',
  '】': ']',
  '（': '(',
  '）': ')',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '，': ',',
  '；': ';',
  '：': ':',
  '！': '!',
  '《': '<',
  '》': '>',
  '？': '?',
}

export const getChCharOfStr = (value: string) => {
  return Array.from(value).filter((item) => item in chineseSymbolMap)
}

export const replaceChSymbolWithEnSymbol = (value: string, includedChChars: string[]) => {
  if (!value || !includedChChars.length) return value

  return includedChChars.reduce((result, item) => {
    return result.replaceAll(item, chineseSymbolMap[item] ?? item)
  }, value)
}

export const sortSummaryListByUsageFrequency = (cacheKey: string, summaryList: Candidate[]) => {
  try {
    const usageFrequencyStr = localStorage.getItem(cacheKey)
    if (!usageFrequencyStr) return

    const usageFrequency = JSON.parse(usageFrequencyStr) as Record<string, number>
    summaryList.sort((left, right) => (usageFrequency[right.name] ?? 0) - (usageFrequency[left.name] ?? 0))
  } catch {
    return
  }
}

export const cacheKeyWithUsageFrequency = (cacheKey: string, usedValue: string) => {
  if (!usedValue) return

  try {
    const usageFrequencyStr = localStorage.getItem(cacheKey) || '{}'
    const usageFrequency = JSON.parse(usageFrequencyStr) as Record<string, number>
    usageFrequency[usedValue] = (usageFrequency[usedValue] ?? 0) + 1
    localStorage.setItem(cacheKey, JSON.stringify(usageFrequency))
  } catch {
    return
  }
}
