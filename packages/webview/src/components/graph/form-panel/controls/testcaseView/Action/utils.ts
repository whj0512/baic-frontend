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
  [key: string]: unknown
}

export type ActionType = 'assignment' | 'expect' | 'send'

const createActionId = () => `testcase_action_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

const getDefaultSymbol = (actionType: ActionType) => {
  return actionType === 'expect' ? '==' : '='
}

const parseExpress = (express: string, actionType: ActionType) => {
  const functionMatch = express.match(/^\s*([^=><(]+?)\s*\((.*)\)\s*$/)
  if (functionMatch) {
    return {
      name: functionMatch[1]?.trim() ?? '',
      symbol: '()',
      value: functionMatch[2]?.trim() ?? '',
      isStandard: true,
    }
  }

  const operators = ['not in', '>=', '<=', '==', '!=', '>', '<', '=', 'in']
  const operatorPattern = operators.map((item) => item.replace(/\s+/g, '\\s+')).join('|')
  const match = express.match(new RegExp(`^\\s*(.*?)\\s*(${operatorPattern})\\s*(.*?)\\s*$`))
  if (!match) {
    return {
      name: '',
      symbol: '',
      value: '',
      isStandard: false,
    }
  }

  return {
    name: match[1]?.trim() ?? '',
    symbol: match[2]?.trim() ?? getDefaultSymbol(actionType),
    value: match[3]?.trim() ?? '',
    isStandard: true,
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
  pre_think_time: 0,
  post_think_time: 0,
  type: 'action',
  ...value,
})

export const normalizeAction = (
  value: unknown,
  actionType: ActionType = 'assignment',
): ActionValue => {
  const source = typeof value === 'string'
    ? { express: value }
    : (typeof value === 'object' && value !== null ? value as Partial<ActionValue> : {})
  const express = typeof source.express === 'string' ? source.express : ''
  const fallback = express
    ? parseExpress(express, actionType)
    : {
        name: '',
        symbol: getDefaultSymbol(actionType),
        value: '',
        isStandard: true,
      }

  return createDefaultAction({
    ...source,
    id: source.id || createActionId(),
    name: typeof source.name === 'string' ? source.name : fallback.name,
    symbol: typeof source.symbol === 'string' ? source.symbol : fallback.symbol,
    value: typeof source.value === 'string' ? source.value : fallback.value,
    isStandard: typeof source.isStandard === 'boolean'
      ? source.isStandard
      : fallback.isStandard,
    express,
    pre_think_time: typeof source.pre_think_time === 'number' ? source.pre_think_time : 0,
    post_think_time: typeof source.post_think_time === 'number' ? source.post_think_time : 0,
    type: typeof source.type === 'string' && source.type ? source.type : 'action',
  }, actionType)
}

export const normalizeActionList = (
  value: unknown,
  actionType: ActionType = 'assignment',
): ActionValue[] => {
  return Array.isArray(value) ? value.map((item) => normalizeAction(item, actionType)) : []
}

export const duplicateAction = (value: ActionValue): ActionValue => ({
  ...value,
  id: createActionId(),
})

export const formatAction = (
  value: Pick<ActionValue, 'name' | 'symbol' | 'value' | 'isStandard' | 'express'>,
) => {
  if (!value.isStandard) return value.express?.trim() ?? ''

  const name = value.name.trim()
  const actionValue = value.value.trim()

  if (!name && !actionValue) return ''
  if (value.symbol === '()') return `${name}(${actionValue})`
  return `${name} ${value.symbol} ${actionValue}`.trim()
}

export const moveItem = (items: ActionValue[], from: number, to: number) => {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (!item) return items
  next.splice(to, 0, item)
  return next
}

export const serializeActionListDraft = (items: ActionValue[]) => {
  return items.map(formatAction).join('\n')
}

export const parseActionListDraft = (
  draft: string,
  actionType: ActionType = 'assignment',
) => {
  return draft
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((express) => normalizeAction({ express }, actionType))
}
