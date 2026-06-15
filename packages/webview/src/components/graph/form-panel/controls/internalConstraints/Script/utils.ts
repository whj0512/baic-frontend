import type { Graph } from '@antv/x6'

export interface ParamField {
  label?: string
  name?: string
  value?: string | number
  type?: string
}

export interface RunParam {
  name: string
  type: string
  value: string
}

export interface CallNodePayload {
  id: string
  shape: string
  type_name: 'call'
  script: string
  params_list: ParamField[]
  [key: string]: unknown
}

export interface ShellResult<T> {
  status: 'ok' | 'error'
  data?: T
  message?: string
}

const normalizeParamName = (param: ParamField, index: number) => {
  const rawName = param.label || param.name || `param_${index + 1}`
  return String(rawName).trim() || `param_${index + 1}`
}

const inferParamType = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'float'
  }
  return 'float'
}

export const collectCallNodes = (
  graph?: Graph,
  currentNodeId?: string,
): CallNodePayload[] => {
  if (!graph) {
    return []
  }

  const nodes = graph.getNodes()
    .filter((node) => node.shape === 'call-node')
    .map((node) => {
      const data = (node.getData() || {}) as Record<string, unknown>
      return {
        ...data,
        id: node.id,
        shape: node.shape,
        type_name: 'call' as const,
        script: typeof data.script === 'string' ? data.script : '',
        params_list: Array.isArray(data.params_list) ? data.params_list as ParamField[] : [],
      }
    })

  return nodes.sort((a, b) => {
    if (a.id === currentNodeId && b.id !== currentNodeId) return -1
    if (b.id === currentNodeId && a.id !== currentNodeId) return 1
    return 0
  })
}

export const extractVariablesShell = async (
  callNodes: CallNodePayload[],
): Promise<ShellResult<Record<string, RunParam>>> => {
  const data: Record<string, RunParam> = {}

  callNodes.forEach((node) => {
    node.params_list.forEach((param, index) => {
      const name = normalizeParamName(param, index)
      if (data[name]) {
        return
      }

      const value = param.value ?? ''
      data[name] = {
        name,
        type: param.type || inferParamType(value),
        value: value === undefined || value === null ? '' : String(value),
      }
    })
  })

  return { status: 'ok', data }
}

export const listToObject = (list: RunParam[]) => {
  const variables: Record<string, RunParam & { value: number }> = {}

  list.forEach((param) => {
    const rawValue = String(param.value ?? '').trim()
    let parsedValue = Number.NaN

    if (param.type === 'int' || param.type === 'integer') {
      parsedValue = Number.parseInt(rawValue, 10)
    } else if (param.type === 'float') {
      parsedValue = Number.parseFloat(rawValue)
    } else {
      parsedValue = Number(rawValue)
    }

    if (String(parsedValue) === rawValue) {
      variables[param.name] = {
        ...param,
        value: parsedValue,
      }
    }
  })

  return variables
}

export const calculateCallShell = async (
  _callNodes: CallNodePayload[],
  variables: Record<string, RunParam & { value: number }>,
): Promise<ShellResult<string>> => {
  return {
    status: 'ok',
    data: `前端壳：已收集 ${Object.keys(variables).length} 个参数`,
  }
}
