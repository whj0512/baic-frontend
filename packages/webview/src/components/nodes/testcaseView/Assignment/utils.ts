interface ActionItem {
    name?: string
    value?: string
    symbol?: string
    express?: string
}

const normalizeValue = (value: unknown) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return String(value)
}

const toActionList = (value: unknown): ActionItem[] => {
    return Array.isArray(value) ? value as ActionItem[] : []
}

const joinObject = (item: ActionItem) => {
    if (item.express) return item.express

    const { name = '', symbol = '', value = '' } = item
    if (symbol === '()') return `${name}(${value})`

    return `${name} ${symbol} ${value}`.trim()
}

export { normalizeValue, toActionList, joinObject }
export type { ActionItem }