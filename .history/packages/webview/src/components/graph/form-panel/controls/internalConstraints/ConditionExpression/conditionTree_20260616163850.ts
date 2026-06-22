export type ConditionOperator = 'and' | 'or'

export interface ConditionLeaf {
  id: string
  type: 'condition'
  name: string
  symbol: string
  value: string
  raw?: string
}

export interface ConditionGroup {
  id: string
  type: 'group'
  operator: ConditionOperator
  children: ConditionTreeNode[]
}

export type ConditionTreeNode = ConditionLeaf | ConditionGroup

let idSeed = 0

export const createConditionId = () => {
  idSeed += 1
  return `condition-${Date.now()}-${idSeed}`
}

export const createConditionLeaf = (patch: Partial<ConditionLeaf> = {}): ConditionLeaf => ({
  id: createConditionId(),
  type: 'condition',
  name: '',
  symbol: '=',
  value: '',
  ...patch,
})

export const createConditionGroup = (patch: Partial<ConditionGroup> = {}): ConditionGroup => ({
  id: createConditionId(),
  type: 'group',
  operator: 'and',
  children: [],
  ...patch,
})

const SYMBOLS = ['>=', '<=', '!=', '=', '>', '<']

const isMeaningfulLeaf = (node: ConditionLeaf) => {
  if (node.raw !== undefined) return node.raw.trim() !== ''
  return node.name.trim() !== '' || node.value.trim() !== ''
}

const serializeLeaf = (node: ConditionLeaf) => {
  if (node.raw !== undefined) return node.raw.trim()

  const name = node.name.trim()
  const symbol = node.symbol.trim()
  const value = node.value.trim()
  return [name, symbol, value].filter(Boolean).join(' ')
}

export const serializeConditionTree = (node: ConditionTreeNode, nested = false): string => {
  if (node.type === 'condition') {
    return serializeLeaf(node)
  }

  const parts = node.children
    .filter((child) => child.type === 'group' || isMeaningfulLeaf(child))
    .map((child) => serializeConditionTree(child, true))
    .filter(Boolean)

  const expression = parts.join(` ${node.operator} `)
  if (!expression) return ''
  return nested ? `(${expression})` : expression
}

const tokenize = (expression: string) => {
  const tokens: string[] = []
  let buffer = ''
  let index = 0

  const flush = () => {
    const text = buffer.trim()
    if (text) tokens.push(text)
    buffer = ''
  }

  while (index < expression.length) {
    const char = expression[index]

    if (char === '(' || char === ')') {
      flush()
      tokens.push(char)
      index += 1
      continue
    }

    const rest = expression.slice(index)
    const operatorMatch = rest.match(/^\s+(and|or)\s+/i)
    if (operatorMatch) {
      flush()
      tokens.push(operatorMatch[1].toLowerCase())
      index += operatorMatch[0].length
      continue
    }

    buffer += char
    index += 1
  }

  flush()
  return tokens
}

const parseLeafToken = (token: string): ConditionLeaf => {
  const text = token.trim()
  for (const symbol of SYMBOLS) {
    const index = text.indexOf(symbol)
    if (index > -1) {
      const name = text.slice(0, index).trim()
      const value = text.slice(index + symbol.length).trim()
      if (name || value) {
        return createConditionLeaf({ name, symbol, value })
      }
    }
  }

  return createConditionLeaf({ raw: text })
}

interface ParserState {
  tokens: string[]
  index: number
}

const peek = (state: ParserState) => state.tokens[state.index]
const consume = (state: ParserState) => state.tokens[state.index++]

const parseFactor = (state: ParserState): ConditionTreeNode => {
  const token = consume(state)
  if (!token) throw new Error('Unexpected end of expression')

  if (token === '(') {
    const node = parseOr(state)
    if (consume(state) !== ')') {
      throw new Error('Unclosed condition group')
    }
    return node
  }

  if (token === ')' || token === 'and' || token === 'or') {
    throw new Error(`Unexpected token: ${token}`)
  }

  return parseLeafToken(token)
}

const parseAnd = (state: ParserState): ConditionTreeNode => {
  const children = [parseFactor(state)]

  while (peek(state) === 'and') {
    consume(state)
    children.push(parseFactor(state))
  }

  if (children.length === 1) return children[0]
  return createConditionGroup({ operator: 'and', children })
}

const parseOr = (state: ParserState): ConditionTreeNode => {
  const children = [parseAnd(state)]

  while (peek(state) === 'or') {
    consume(state)
    children.push(parseAnd(state))
  }

  if (children.length === 1) return children[0]
  return createConditionGroup({ operator: 'or', children })
}

const ensureRootGroup = (node: ConditionTreeNode): ConditionGroup => {
  if (node.type === 'group') return node
  return createConditionGroup({ children: [node] })
}

export const parseConditionExpression = (expression: string): ConditionGroup => {
  const source = expression.trim()
  if (!source) return createConditionGroup()

  try {
    const state = { tokens: tokenize(source), index: 0 }
    const parsed = parseOr(state)
    if (state.index !== state.tokens.length) {
      throw new Error('Unexpected trailing tokens')
    }
    return ensureRootGroup(parsed)
  } catch {
    return createConditionGroup({ children: [createConditionLeaf({ raw: source })] })
  }
}

const updateNode = (
  node: ConditionTreeNode,
  targetId: string,
  updater: (node: ConditionTreeNode) => ConditionTreeNode,
): ConditionTreeNode => {
  if (node.id === targetId) return updater(node)
  if (node.type === 'condition') return node

  return {
    ...node,
    children: node.children.map((child) => updateNode(child, targetId, updater)),
  }
}

export const updateConditionNode = (
  root: ConditionGroup,
  targetId: string,
  patch: Partial<ConditionLeaf> | Partial<ConditionGroup>,
): ConditionGroup => updateNode(root, targetId, (node) => {
  if (node.type === 'condition') {
    return { ...node, ...(patch as Partial<ConditionLeaf>) }
  }

  return { ...node, ...(patch as Partial<ConditionGroup>) }
}) as ConditionGroup

export const addConditionChild = (
  root: ConditionGroup,
  groupId: string,
  child: ConditionTreeNode,
): ConditionGroup => updateNode(root, groupId, (node) => {
  if (node.type !== 'group') return node
  return { ...node, children: [...node.children, child] }
}) as ConditionGroup

export const removeConditionNode = (root: ConditionGroup, targetId: string): ConditionGroup => {
  if (root.id === targetId) return root

  const removeFrom = (node: ConditionTreeNode): ConditionTreeNode => {
    if (node.type === 'condition') return node

    return {
      ...node,
      children: node.children
        .filter((child) => child.id !== targetId)
        .map(removeFrom),
    }
  }

  return removeFrom(root) as ConditionGroup
}

export const convertRawLeafToCondition = (root: ConditionGroup, targetId: string): ConditionGroup => {
  return updateNode(root, targetId, (node) => {
    if (node.type !== 'condition') return node
    const raw = node.raw?.trim() || ''
    const parsedLeaf = parseLeafToken(raw)
    if (parsedLeaf.raw !== undefined) return node

    return {
      ...node,
      raw: undefined,
      name: parsedLeaf.name,
      symbol: parsedLeaf.symbol || node.symbol || '=',
      value: parsedLeaf.value,
    }
  }) as ConditionGroup
}
