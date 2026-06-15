import type { DefaultOptionType } from 'antd/es/select'
import type {
  LegacyActionDatabaseData,
  LegacyLogicDefinition,
  LegacySignalTypeDefinition,
} from './data/legacyLogics'

export interface ActionValue {
  id: string
  name: string
  symbol: string
  value: string
  isStandard: boolean
  express?: string
  pre_think_time?: number
  post_think_time?: number
  type?: string
}

export type ActionCandidate = LegacyLogicDefinition | LegacySignalTypeDefinition

export const DURING_SYMBOL = '='
export const FUNCTION_SYMBOL = '()'
export const DYNAMIC_SYMBOL = ['==', '>', '>=', '<', '<=', '!=', 'not in', 'in']
export const NORMAL_SYMBOL = ['==', '>', '>=', '<', '<=', '!=', 'not in', 'in']
export const ACTION_SIGNAL_NAME = 'ACTION_SIGNAL_NAME'

const createActionId = () =>
  `action_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

const parseExpress = (express: string) => {
  const functionMatch = express.match(/^\s*([^(]+)\((.*)\)\s*$/)
  if (functionMatch) {
    return {
      name: functionMatch[1]?.trim() ?? '',
      symbol: FUNCTION_SYMBOL,
      value: functionMatch[2] ?? '',
    }
  }

  const operators = ['not in', '>=', '<=', '==', '!=', '>', '<', '=', 'in']
  const operatorPattern = operators.map((item) => item.replace(/\s+/g, '\\s+')).join('|')
  const operatorMatch = express.match(new RegExp(`^\\s*(.*?)\\s*(${operatorPattern})\\s*(.*?)\\s*$`))
  if (!operatorMatch) {
    return {
      name: express.trim(),
      symbol: '',
      value: '',
    }
  }

  return {
    name: operatorMatch[1] ?? '',
    symbol: operatorMatch[2] ?? '',
    value: operatorMatch[3] ?? '',
  }
}

export const createDefaultAction = (value: Partial<ActionValue> = {}): ActionValue => ({
  id: createActionId(),
  name: '',
  symbol: '',
  value: '',
  isStandard: true,
  pre_think_time: 0,
  post_think_time: 0,
  type: 'action',
  ...value,
})

export const normalizeAction = (
  value: Partial<ActionValue> & { express?: string },
): ActionValue => {
  const fallback = value.express
    ? parseExpress(value.express)
    : { name: '', symbol: '', value: '' }

  return createDefaultAction({
    ...value,
    id: value.id || createActionId(),
    name: value.name ?? fallback.name,
    symbol: value.symbol ?? fallback.symbol,
    value: value.value ?? fallback.value,
    isStandard: value.isStandard ?? true,
    pre_think_time: value.pre_think_time ?? 0,
    post_think_time: value.post_think_time ?? 0,
    type: value.type || 'action',
  })
}

export const normalizeActionList = (value: unknown): ActionValue[] => {
  return Array.isArray(value) ? value.map((item) => normalizeAction(item || {})) : []
}

export const formatAction = (value: Pick<ActionValue, 'name' | 'symbol' | 'value'>) => {
  const name = value.name.trim()
  const actionValue = value.value.trim()

  if (!name && !actionValue) return ''
  if (value.symbol === FUNCTION_SYMBOL) return `${name}(${actionValue})`
  return `${name}${value.symbol}${actionValue}`.trim()
}

export const moveItem = (items: ActionValue[], from: number, to: number) => {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (!item) return items
  next.splice(to, 0, item)
  return next
}

export const parseActionListDraft = (draftValue: string) => {
  const parsed = JSON.parse(draftValue) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('Action JSON must be an array')
  }
  return normalizeActionList(parsed)
}

export const getSymbols = (groupId?: string) => {
  switch (groupId) {
    case 'actions_normal':
    case 'normal_request':
      return [...NORMAL_SYMBOL, DURING_SYMBOL]
    case 'actions_dynamic':
    case 'dynamic_request':
    case 'dynamic_testcase':
      return DYNAMIC_SYMBOL
    case 'normal_testcase':
      return NORMAL_SYMBOL
    case 'during_testcase':
      return []
    case 'during_request':
      return [DURING_SYMBOL]
    default:
      return NORMAL_SYMBOL
  }
}

export const getListOfName = (groupId: string | undefined, env: LegacyActionDatabaseData) => {
  let summaryList: ActionCandidate[] = []

  if (groupId === 'dynamic_request' || groupId === 'dynamic_testcase') {
    summaryList = env.logics.filter((logic) => logic.name === 'save')
  } else if (
    groupId === 'normal_request' ||
    groupId === 'normal_testcase' ||
    groupId === 'during_request' ||
    groupId === 'actions_normal'
  ) {
    summaryList = env.logics
  }

  return summaryList.concat(env.types)
}

export const convertListToOptions = (list: ActionCandidate[]) => {
  return list.map((item) => ({
    label: item.name,
    value: item.name,
  }))
}

export const isSwitchComponent = (
  selectedNameOption: ActionCandidate | null,
  currentType: ActionCandidate['type'],
) => {
  if (selectedNameOption?.type === currentType) return false

  return () => {
    if (currentType === 'type') return ''
    if (currentType === 'logic') return FUNCTION_SYMBOL
    return ''
  }
}

export const getSignalGuide = (selected: LegacySignalTypeDefinition) => {
  return selected.value_string_mapping?.map((option) => ({
    label: `${option.name} ${option.value}`,
    value: option.value,
  })) ?? []
}

export const getFunctionGuide = (selected: LegacyLogicDefinition) => {
  const matcher = selected.name_as.match(/\((.*)\)/)
  return matcher?.[1] ?? ''
}

export const isModifySignalValue = (
  selectedNameOption: ActionCandidate | null,
  selectedSymbol: string,
  inputedValue: string,
) => {
  return selectedNameOption?.type === 'type' && Boolean(selectedSymbol || inputedValue)
}

export const isNameMatchOption = (summaryList: ActionCandidate[], name: string) => {
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

export const sortSummaryListByUsageFrequency = (
  cacheKey: string,
  summaryList: ActionCandidate[],
) => {
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
