export interface ActionValue {
  id: string
  name: string
  symbol: string
  value: string
  isStandard: boolean
  express?: string
}

export type ActionType = 'assignment' | 'expect' | 'send'

const createActionId = () => `assignment_action_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

const getDefaultSymbol = (actionType: ActionType) => {
  return actionType === 'expect' ? '==' : '='
}

const parseExpress = (express: string, actionType: ActionType) => {
  const operators = ['not in', '>=', '<=', '==', '!=', '>', '<', '=', 'in']
  const operatorPattern = operators.map((item) => item.replace(/\s+/g, '\\s+')).join('|')
  const match = express.match(new RegExp(`^\\s*(.*?)\\s*(${operatorPattern})\\s*(.*?)\\s*$`))
  if (!match) {
    return {
      name: express.trim(),
      symbol: getDefaultSymbol(actionType),
      value: '',
    }
  }

  return {
    name: match[1] ?? '',
    symbol: match[2] ?? getDefaultSymbol(actionType),
    value: match[3] ?? '',
  }
}

export const normalizeActionType = (value: string | undefined): ActionType => {
  if (value === 'expect' || value === 'send') return value
  return 'assignment'
}

export const createDefaultAction = (
  value: Partial<ActionValue> = {},
  actionType: ActionType = 'assignment',
): ActionValue => ({
  id: createActionId(),
  name: '',
  symbol: getDefaultSymbol(actionType),
  value: '',
  isStandard: true,
  ...value,
})

export const normalizeAction = (
  value: Partial<ActionValue> & { express?: string },
  actionType: ActionType = 'assignment',
): ActionValue => {
  const fallback = value.express
    ? parseExpress(value.express, actionType)
    : { name: '', symbol: getDefaultSymbol(actionType), value: '' }

  return createDefaultAction({
    ...value,
    id: value.id || createActionId(),
    name: value.name ?? fallback.name,
    symbol: value.symbol ?? fallback.symbol,
    value: value.value ?? fallback.value,
    isStandard: value.isStandard ?? true,
  }, actionType)
}

export const normalizeActionList = (
  value: unknown,
  actionType: ActionType = 'assignment',
): ActionValue[] => {
  return Array.isArray(value) ? value.map((item) => normalizeAction(item || {}, actionType)) : []
}

export const formatAction = (value: Pick<ActionValue, 'name' | 'symbol' | 'value'>) => {
  const name = value.name.trim()
  const actionValue = value.value.trim()

  if (!name && !actionValue) return ''
  if (value.symbol === '()') return `${name}(${actionValue})`
  return `${name} ${value.symbol} ${actionValue}`.trim()
}
